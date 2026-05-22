import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';
import {
  accountingTypes,
  businessUnits,
  currency,
  deleteFinanceLaunch,
  getFinanceLaunches,
  isSettlementBalanceLaunch,
  nextFinanceLaunchNumber,
  normalizeText,
  settlementBalanceAccountingType,
  todayValue,
  toNumber,
  upsertFinanceLaunch,
} from './financeData.js';
import { getRegisteredSuppliers } from './managementRegistry.js';
import { getRegisteredManifests } from './operationRegistry.js';
import { onlyDigits } from './transportRegistry.js';

export const driverSettlementStorageKey = 'driverAccountabilitySettlements';
export const defaultDriverDailyRate = 110;

const dayMs = 24 * 60 * 60 * 1000;

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const normalizedText = text.length === 16 ? `${text}:00` : text;
  const date = new Date(normalizedText);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateTimeValue(value) {
  const date = parseDateTime(value);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function dateKey(value) {
  const date = parseDateTime(value);
  return date ? dateInputValue(date) : '';
}

function compareAfter(value, cutoffValue) {
  if (!cutoffValue) return true;

  const date = parseDateTime(value);
  const cutoff = parseDateTime(cutoffValue);

  if (!date || !cutoff) return false;

  return date.getTime() > cutoff.getTime();
}

function manifestStart(manifest) {
  return manifest.startedAt || manifest.startDateTime || manifest.createdAt || '';
}

function manifestEnd(manifest) {
  if (manifest.closedAt || manifest.closeDateTime) {
    return manifest.closedAt || manifest.closeDateTime;
  }

  if (normalizeText(manifest.status) === normalizeText('Fechado')) {
    return manifest.updatedAt || manifest.createdAt || '';
  }

  return new Date();
}

export function manifestDayCount(startValue, endValue = new Date()) {
  const start = parseDateTime(startValue);
  const end = parseDateTime(endValue);

  if (!start || !end) return 0;

  const elapsedMs = Math.max(end.getTime() - start.getTime(), 0);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const inclusiveDays = Math.floor((endDay.getTime() - startDay.getTime()) / dayMs) + 1;

  if (inclusiveDays > 1 && elapsedMs < dayMs) {
    return 1;
  }

  return Math.max(1, inclusiveDays);
}

function launchEventDate(launch) {
  return launch.createdAt
    || launch.paymentDate
    || launch.createdDate
    || launch.issueDate
    || launch.dueDate
    || '';
}

function effectiveLaunchAmount(launch) {
  return Number(launch.finalAmount || 0) > 0 ? Number(launch.finalAmount) : Number(launch.amount || 0);
}

function normalizeAmount(value) {
  return Number(Number(value || 0).toFixed(2));
}

function readSettlements() {
  return readJsonStorage(driverSettlementStorageKey, [], {
    validate: Array.isArray,
  });
}

function writeSettlements(records) {
  return writeJsonStorage(driverSettlementStorageKey, records);
}

export function getDriverSettlements(driverCpf = '') {
  const cpf = onlyDigits(driverCpf);

  return readSettlements()
    .filter((settlement) => !cpf || onlyDigits(settlement.driverCpf) === cpf)
    .sort((left, right) => String(right.closedAt || right.createdAt).localeCompare(String(left.closedAt || left.createdAt)));
}

export function getLastClosedDriverSettlement(driverCpf, excludeSettlementId = '') {
  return getDriverSettlements(driverCpf)
    .filter((settlement) => (
      settlement.id !== excludeSettlementId
      && normalizeText(settlement.status || 'Fechada') === normalizeText('Fechada')
      && settlement.closedAt
    ))
    .sort((left, right) => String(right.closedAt).localeCompare(String(left.closedAt)))[0] || null;
}

function supplierCandidates(supplier) {
  if (!supplier) return [];

  return [
    supplier.id,
    supplier.code,
    supplier.name,
    supplier.cnpj,
    onlyDigits(supplier.cnpj),
  ].filter(Boolean);
}

export function getDriverSupplier(driver) {
  if (!driver) return null;

  const suppliers = getRegisteredSuppliers();
  const supplierCode = String(driver.supplierCode || driver.supplierId || '').trim();
  const driverCpf = onlyDigits(driver.cpf);

  return suppliers.find((supplier) => (
    supplier.id === supplierCode
    || supplier.code === supplierCode
    || onlyDigits(supplier.cnpj) === driverCpf
    || normalizeText(supplier.name) === normalizeText(driver.name)
  )) || null;
}

export function getDriverSupplierCode(driver) {
  return String(driver?.supplierCode || driver?.supplierId || getDriverSupplier(driver)?.id || '').trim();
}

export function getDriverSupplierLabel(driver) {
  const supplier = getDriverSupplier(driver);
  const code = getDriverSupplierCode(driver);

  if (supplier) {
    return `${supplier.id || code} - ${supplier.name} - ${supplier.cnpj}`;
  }

  return code ? `${code} - ${driver?.name || ''}` : driver?.name || '';
}

function matchesDriverSupplier(launch, driver, supplier = getDriverSupplier(driver)) {
  const candidates = [
    getDriverSupplierCode(driver),
    driver?.name,
    driver?.cpf,
    onlyDigits(driver?.cpf),
    ...supplierCandidates(supplier),
  ].filter(Boolean);

  if (!candidates.length) return false;

  return candidates.some((candidate) => (
    normalizeText(launch.supplierCode) === normalizeText(candidate)
    || normalizeText(launch.supplier) === normalizeText(candidate)
    || normalizeText(onlyDigits(launch.supplier)) === normalizeText(onlyDigits(candidate))
  ));
}

function matchesDriverManifest(manifest, driver) {
  const driverCpf = onlyDigits(driver?.cpf);
  const names = [driver?.name].filter(Boolean);

  return Boolean(driverCpf && onlyDigits(manifest.driverCpf) === driverCpf)
    || names.some((name) => normalizeText(manifest.driverName).includes(normalizeText(name)));
}

function groupExpensePieData(movements) {
  const grouped = new Map();

  movements.forEach((movement) => {
    const label = movement.type || 'Sem tipo';
    grouped.set(label, (grouped.get(label) || 0) + Math.abs(movement.amount));
  });

  return [...grouped.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: normalizeAmount(value) }));
}

function normalizeAdjustment(adjustment, index) {
  const accountingTypeCode = String(adjustment.accountingTypeCode || '').trim();
  const accountingTypeName = String(adjustment.accountingType || adjustment.type || '').trim();
  const accountingType = accountingTypes.find((type) => (
    type.code === accountingTypeCode
    || normalizeText(type.name) === normalizeText(accountingTypeName)
  ));

  return {
    id: adjustment.id || `ADJ-${index + 1}`,
    name: String(adjustment.name || '').trim(),
    amount: normalizeAmount(toNumber(adjustment.amount)),
    accountingTypeCode: accountingType?.code || accountingTypeCode,
    accountingType: accountingType?.name || accountingTypeName,
  };
}

function adjustmentAccountingTypeLabel(adjustment) {
  const code = String(adjustment?.accountingTypeCode || '').trim();
  const name = String(adjustment?.accountingType || '').trim();

  if (code && name) return `${code} - ${name}`;
  return name || code || '-';
}

export function buildDriverSettlementReport({
  driver,
  dailyRate = defaultDriverDailyRate,
  kmStart = '',
  kmEnd = '',
  adjustments = [],
  excludedFinancialMovementIds = [],
  dueDate = '',
  settlementId = '',
} = {}) {
  const supplier = getDriverSupplier(driver);
  const lastSettlement = getLastClosedDriverSettlement(driver?.cpf, settlementId);
  const cutoff = lastSettlement?.closedAt || '';
  const normalizedDailyRate = Math.max(0, toNumber(dailyRate) || defaultDriverDailyRate);
  const normalizedAdjustments = adjustments
    .map(normalizeAdjustment)
    .filter((adjustment) => adjustment.name && Number.isFinite(adjustment.amount));
  const excludedMovementIds = new Set(excludedFinancialMovementIds.map((id) => String(id)));
  const financialMovements = getFinanceLaunches()
    .filter((launch) => (
      matchesDriverSupplier(launch, driver, supplier)
      && normalizeText(launch.status) === normalizeText('Baixado')
      && !isSettlementBalanceLaunch(launch)
      && compareAfter(launchEventDate(launch), cutoff)
    ))
    .map((launch) => {
      const amount = normalizeAmount(effectiveLaunchAmount(launch));

      return {
        ...launch,
        eventDate: launchEventDate(launch),
        amount,
        reportAmount: -Math.abs(amount),
        considered: !excludedMovementIds.has(String(launch.id)),
      };
    })
    .sort((left, right) => String(left.eventDate).localeCompare(String(right.eventDate)));
  const consideredFinancialMovements = financialMovements.filter((launch) => launch.considered);
  const openPayableLaunches = getFinanceLaunches()
    .filter((launch) => (
      matchesDriverSupplier(launch, driver, supplier)
      && normalizeText(launch.status) === normalizeText('Aberto')
      && String(launch.id || '').startsWith('CAP-')
    ))
    .sort((left, right) => String(left.dueDate || '').localeCompare(String(right.dueDate || '')));
  const manifests = getRegisteredManifests()
    .filter((manifest) => (
      normalizeText(manifest.status) !== normalizeText('Cancelado')
      && matchesDriverManifest(manifest, driver)
      && compareAfter(manifestStart(manifest), cutoff)
    ))
    .map((manifest) => {
      const start = manifestStart(manifest);
      const end = manifestEnd(manifest);
      const days = manifestDayCount(start, end);

      return {
        ...manifest,
        startDateTime: dateTimeValue(start),
        endDateTime: dateTimeValue(end),
        days,
        dailyRate: normalizedDailyRate,
        dailyTotal: normalizeAmount(days * normalizedDailyRate),
      };
    })
    .sort((left, right) => String(left.startDateTime).localeCompare(String(right.startDateTime)));
  const totalReceivedFromFinance = normalizeAmount(
    consideredFinancialMovements.reduce((total, launch) => total + Math.abs(launch.amount), 0),
  );
  const totalAdjustments = normalizeAmount(
    normalizedAdjustments.reduce((total, adjustment) => total + adjustment.amount, 0),
  );
  const totalReceived = normalizeAmount(totalReceivedFromFinance + totalAdjustments);
  const totalDays = manifests.reduce((total, manifest) => total + manifest.days, 0);
  const totalDailyAmount = normalizeAmount(totalDays * normalizedDailyRate);
  const balance = normalizeAmount(totalReceived - totalDailyAmount);
  const kmStartValue = toNumber(kmStart);
  const kmEndValue = toNumber(kmEnd);
  const kmDistance = kmEndValue >= kmStartValue ? normalizeAmount(kmEndValue - kmStartValue) : 0;
  const averageKmPerDay = totalDays > 0 ? normalizeAmount(kmDistance / totalDays) : 0;

  return {
    id: settlementId || `PC-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    dueDate,
    driver: {
      cpf: driver?.cpf || '',
      name: driver?.name || '',
      supplierCode: getDriverSupplierCode(driver),
      supplierLabel: getDriverSupplierLabel(driver),
    },
    supplier,
    periodStart: cutoff,
    periodEnd: new Date().toISOString(),
    lastSettlementId: lastSettlement?.id || '',
    dailyRate: normalizedDailyRate,
    kmStart: kmStart || '',
    kmEnd: kmEnd || '',
    kmDistance,
    averageKmPerDay,
    financialMovements,
    consideredFinancialMovements,
    excludedFinancialMovementIds: [...excludedMovementIds],
    openPayableLaunches,
    adjustments: normalizedAdjustments,
    manifests,
    totals: {
      totalReceivedFromFinance,
      totalAdjustments,
      totalReceived,
      totalDays,
      totalDailyAmount,
      balance,
    },
    debtor: balance > 0 ? 'Motorista' : balance < 0 ? 'Empresa' : 'Quitado',
    expensePieData: groupExpensePieData(consideredFinancialMovements),
  };
}

function pdfText(value) {
  return plainPdfText(value)
    .replace(/[\\()]/g, '\\$&');
}

function plainPdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function fitPdfText(value, length) {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');

  if (text.length <= length) return text.padEnd(length, ' ');
  return `${text.slice(0, Math.max(0, length - 1))}~`;
}

function createPdfContent(lines) {
  const pageWidth = 842;
  const pageHeight = 595;
  const linesPerPage = 41;
  const objects = [];
  const pageRefs = [];
  let objectNumber = 3;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  for (let index = 0; index < lines.length; index += linesPerPage) {
    const pageLines = lines.slice(index, index + linesPerPage);
    const stream = [
      'BT',
      '/F1 10 Tf',
      '18 562 Td',
      ...pageLines.map((line, lineIndex) => `${lineIndex ? '0 -13 Td ' : ''}(${pdfText(line)}) Tj`),
      'ET',
    ].join('\n');
    const contentObject = objectNumber;
    const pageObject = objectNumber + 1;

    objectNumber += 2;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> /Contents ${contentObject} 0 R >>`;
    pageRefs.push(`${pageObject} 0 R`);
  }

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

const settlementPdfPage = {
  width: 595,
  height: 842,
  margin: 24,
};

const settlementPdfColors = {
  black: [0, 0, 0],
  red: [0.88, 0, 0],
  softGray: [0.96, 0.96, 0.96],
  white: [1, 1, 1],
};

function pdfColor(color, operator) {
  return `${color.map((value) => Number(value).toFixed(3)).join(' ')} ${operator}`;
}

function pdfY(top, height = 0) {
  return settlementPdfPage.height - top - height;
}

function approxPdfTextWidth(text, size) {
  return plainPdfText(text).length * size * 0.53;
}

function fitPdfWidth(value, width, size) {
  const text = plainPdfText(value).trim();
  const maxChars = Math.max(1, Math.floor(width / (size * 0.53)));

  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}~`;
}

function pushPdfText(ops, value, x, top, {
  align = 'left',
  color = settlementPdfColors.black,
  font = 'F1',
  size = 7,
  width = 0,
} = {}) {
  const text = width ? fitPdfWidth(value, width, size) : plainPdfText(value).trim();
  const textWidth = approxPdfTextWidth(text, size);
  const textX = align === 'right'
    ? x + width - textWidth
    : align === 'center'
      ? x + ((width - textWidth) / 2)
      : x;

  ops.push(
    'q',
    pdfColor(color, 'rg'),
    `BT /${font} ${size} Tf ${Number(textX).toFixed(2)} ${Number(pdfY(top) - size).toFixed(2)} Td (${pdfText(text)}) Tj ET`,
    'Q',
  );
}

function pushPdfRect(ops, x, top, width, height, {
  fill = null,
  lineWidth = 0.5,
  stroke = true,
} = {}) {
  if (fill) {
    ops.push(
      'q',
      pdfColor(fill, 'rg'),
      `${Number(x).toFixed(2)} ${Number(pdfY(top, height)).toFixed(2)} ${Number(width).toFixed(2)} ${Number(height).toFixed(2)} re f`,
      'Q',
    );
  }

  if (stroke) {
    ops.push(
      'q',
      `${lineWidth} w`,
      pdfColor(settlementPdfColors.black, 'RG'),
      `${Number(x).toFixed(2)} ${Number(pdfY(top, height)).toFixed(2)} ${Number(width).toFixed(2)} ${Number(height).toFixed(2)} re S`,
      'Q',
    );
  }
}

function pushPdfCell(ops, value, x, top, width, height, {
  align = 'left',
  color = settlementPdfColors.black,
  fill = null,
  font = 'F1',
  lineWidth = 0.5,
  padding = 3,
  size = 7,
} = {}) {
  pushPdfRect(ops, x, top, width, height, { fill, lineWidth });
  pushPdfText(ops, value, x + padding, top + ((height - size) / 2) - 1, {
    align,
    color,
    font,
    size,
    width: width - (padding * 2),
  });
}

function pushPdfLabelValue(ops, label, value, x, top, labelWidth, valueWidth, height = 13, {
  align = 'right',
  valueColor = settlementPdfColors.black,
} = {}) {
  pushPdfText(ops, label, x, top + 3, {
    font: 'F2',
    size: 7,
    width: labelWidth - 4,
  });
  pushPdfCell(ops, value, x + labelWidth, top, valueWidth, height, {
    align,
    color: valueColor,
    font: 'F1',
    size: 7,
  });
}

function createPdfFromStreams(streams) {
  const objects = [];
  const pageRefs = [];
  let objectNumber = 3;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  streams.forEach((stream) => {
    const contentObject = objectNumber;
    const pageObject = objectNumber + 1;

    objectNumber += 2;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${settlementPdfPage.width} ${settlementPdfPage.height}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObject} 0 R >>`;
    pageRefs.push(`${pageObject} 0 R`);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function reportPdfLines(report) {
  const lines = [
    'Prestacao de conta de motorista',
    `Motorista: ${report.driver.name} | CPF: ${report.driver.cpf}`,
    `Periodo: ${report.periodStart ? new Date(report.periodStart).toLocaleString('pt-BR') : 'Inicio'} ate ${new Date(report.periodEnd).toLocaleString('pt-BR')}`,
    `Gerado em: ${new Date(report.generatedAt).toLocaleString('pt-BR')}`,
    '',
    `Total recebido: ${currency(report.totals.totalReceived)} | Total de diarias: ${currency(report.totals.totalDailyAmount)} | Saldo: ${currency(report.totals.balance)}`,
    `Quem esta devendo: ${report.debtor}`,
    `KM inicial: ${report.kmStart || '-'} | KM final: ${report.kmEnd || '-'} | Media km/dia: ${report.averageKmPerDay.toLocaleString('pt-BR')}`,
    '',
    'Manifestos',
    'Manifesto        Placa    Inicio           Fim              Origem               Destino              Dias  Diaria      Total',
    '------------------------------------------------------------------------------------------------------------------------------',
  ];

  if (!report.manifests.length) {
    lines.push('Nenhum manifesto encontrado no periodo.');
  }

  report.manifests.forEach((manifest) => {
    lines.push([
      fitPdfText(manifest.id, 16),
      fitPdfText(manifest.truckPlate, 8),
      fitPdfText(manifest.startDateTime, 16),
      fitPdfText(manifest.endDateTime || 'Aberto', 16),
      fitPdfText(manifest.origin, 20),
      fitPdfText(manifest.destination, 20),
      fitPdfText(manifest.days, 4),
      fitPdfText(currency(manifest.dailyRate), 10),
      fitPdfText(currency(manifest.dailyTotal), 10),
    ].join(' '));
  });

  lines.push('');
  lines.push('Movimentacoes financeiras consideradas');
  lines.push('Lancamento       Data             Tipo                Documento     Valor relatorio   Considerada');
  lines.push('--------------------------------------------------------------------------------------------------');

  if (!report.financialMovements.length) {
    lines.push('Nenhuma movimentacao financeira encontrada no periodo.');
  }

  report.financialMovements.forEach((launch) => {
    lines.push([
      fitPdfText(launch.id, 16),
      fitPdfText(launch.eventDate, 16),
      fitPdfText(launch.type, 19),
      fitPdfText(launch.document, 12),
      fitPdfText(currency(launch.reportAmount), 16),
      fitPdfText(launch.considered ? 'Sim' : 'Nao', 10),
    ].join(' '));
  });

  lines.push('');
  lines.push('Ajustes avulsos');
  lines.push('Nome                               Tipo contabil             Valor');
  lines.push('--------------------------------------------------------------------');

  if (!report.adjustments.length) {
    lines.push('Nenhum ajuste avulso informado.');
  }

  report.adjustments.forEach((adjustment) => {
    lines.push([
      fitPdfText(adjustment.name, 32),
      fitPdfText(adjustmentAccountingTypeLabel(adjustment), 24),
      fitPdfText(currency(adjustment.amount), 12),
    ].join(' '));
  });

  lines.push('');
  lines.push(`Resumo: Total recebido (${currency(report.totals.totalReceived)}) - Total de diarias (${currency(report.totals.totalDailyAmount)}) = ${currency(report.totals.balance)}`);
  lines.push(`Quem esta devendo: ${report.debtor}`);

  return lines;
}

function pdfDate(value) {
  if (!value) return '-';

  const date = parseDateTime(value);
  if (!date) return String(value);

  return date.toLocaleDateString('pt-BR');
}

function pdfDateTime(value) {
  if (!value) return '-';

  const date = parseDateTime(value);
  if (!date) return String(value);

  return date.toLocaleString('pt-BR');
}

function signedPdfCurrency(value) {
  const amount = Number(value || 0);
  const signal = amount > 0 ? '+' : '';

  return `${signal}${currency(amount)}`;
}

function balanceRecipientLabel(balance) {
  const amount = Number(balance || 0);

  if (amount > 0) return 'EMPRESA A RECEBER';
  if (amount < 0) return 'MOTORISTA A RECEBER';

  return 'SALDO QUITADO';
}

function firstValue(values, fallback = '-') {
  return values.find((value) => String(value || '').trim()) || fallback;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function driverSettlementPdfRows(report) {
  const financialRows = report.financialMovements.map((launch) => ({
    date: pdfDate(launch.eventDate),
    document: launch.document || launch.id,
    description: launch.type || 'Movimentacao financeira',
    received: launch.considered ? currency(Math.abs(launch.amount)) : '-',
    daily: '-',
    notes: launch.considered ? launch.id : `${launch.id} - Nao incluido`,
  }));
  const adjustmentRows = report.adjustments.map((adjustment) => ({
    date: '-',
    document: adjustment.name,
    description: adjustmentAccountingTypeLabel(adjustment) === '-' ? 'Ajuste avulso' : adjustmentAccountingTypeLabel(adjustment),
    received: signedPdfCurrency(adjustment.amount),
    daily: '-',
    notes: 'Ajuste',
  }));
  const dailyRows = report.manifests.map((manifest) => {
    const route = [manifest.origin, manifest.destination].filter(Boolean).join(' > ');

    return {
      date: pdfDate(manifest.startDateTime),
      document: manifest.id,
      description: `Diaria ${manifest.truckPlate || ''}`.trim(),
      received: '-',
      daily: `${manifest.days} x ${currency(manifest.dailyRate)} = ${currency(manifest.dailyTotal)}`,
      notes: route || pdfDate(manifest.endDateTime),
    };
  });

  return [...financialRows, ...adjustmentRows, ...dailyRows];
}

function pushSettlementHeader(ops, report, pageIndex, pageCount) {
  const manifests = report.manifests || [];
  const startValue = firstValue([manifests[0]?.startDateTime, report.periodStart], '');
  const endValue = firstValue([manifests[manifests.length - 1]?.endDateTime, report.periodEnd], '');
  const plates = uniqueValues(manifests.map((manifest) => manifest.truckPlate)).join('/');
  const kmDistance = report.kmDistance || 0;

  pushPdfCell(ops, pdfDateTime(report.generatedAt), 24, 22, 92, 13, { align: 'center', size: 7 });
  pushPdfCell(ops, pdfDateTime(report.periodStart || report.generatedAt), 116, 22, 92, 13, { align: 'center', size: 7 });
  pushPdfText(ops, 'PRESTACAO DE CONTAS', 24, 43, { font: 'F2', size: 8, width: 120 });
  pushPdfText(ops, 'MOTORISTA:', 228, 31, { font: 'F2', size: 9, width: 65 });
  pushPdfText(ops, report.driver.name || '-', 295, 33, { size: 7, width: 124 });
  pushPdfText(ops, 'PLACA:', 430, 31, { font: 'F2', size: 8, width: 42 });
  pushPdfText(ops, plates || '-', 476, 33, { size: 7, width: 88 });

  pushPdfLabelValue(ops, 'DATA SAIDA', pdfDate(startValue), 24, 62, 86, 84, 13, { valueColor: settlementPdfColors.red });
  pushPdfLabelValue(ops, 'DATA CHEGADA', pdfDate(endValue), 24, 77, 86, 84, 13, { valueColor: settlementPdfColors.red });
  pushPdfLabelValue(ops, 'QTD. DIAS', report.totals.totalDays || 0, 24, 92, 86, 84, 13);

  pushPdfLabelValue(ops, 'CPF:', report.driver.cpf || '-', 228, 47, 54, 136, 13, { align: 'center' });
  pushPdfLabelValue(ops, 'KM INICIAL', report.kmStart || '-', 228, 62, 78, 76, 13, { valueColor: settlementPdfColors.red });
  pushPdfLabelValue(ops, 'KM FINAL', report.kmEnd || '-', 228, 77, 78, 76, 13, { valueColor: settlementPdfColors.red });
  pushPdfLabelValue(ops, 'KM TOTAL:', kmDistance || '-', 228, 92, 78, 76, 13);
  pushPdfLabelValue(ops, 'Media', report.averageKmPerDay.toLocaleString('pt-BR'), 228, 107, 78, 76, 13);

  pushPdfLabelValue(ops, 'AUXILIO', '', 430, 47, 56, 84, 13);
  pushPdfLabelValue(ops, 'FOLGA', '', 430, 62, 56, 84, 13);
  pushPdfLabelValue(ops, 'DIARIAS', report.totals.totalDays || 0, 430, 77, 56, 84, 13, { valueColor: settlementPdfColors.red });
  pushPdfLabelValue(ops, 'VALOR DIARIA', currency(report.dailyRate), 430, 92, 56, 84, 13);

  pushPdfText(ops, `Pagina ${pageIndex + 1}/${pageCount}`, 518, 22, { align: 'right', size: 7, width: 52 });
}

function pushSettlementTable(ops, rows) {
  const tableX = 24;
  const tableTop = 128;
  const rowHeight = 14;
  const headerHeight = 24;
  const columns = [
    { key: 'date', label: 'DATA', width: 48, align: 'center' },
    { key: 'document', label: 'LANCAMENTO', width: 82 },
    { key: 'description', label: 'TIPO / DESCRICAO', width: 128 },
    { key: 'received', label: 'RECEBIDO / AJUSTE', width: 82, align: 'right' },
    { key: 'daily', label: 'DIARIA', width: 92, align: 'right' },
    { key: 'notes', label: 'OBSERVACAO', width: 115 },
  ];
  let left = tableX;

  columns.forEach((column) => {
    pushPdfCell(ops, column.label, left, tableTop, column.width, headerHeight, {
      align: 'center',
      color: settlementPdfColors.red,
      fill: settlementPdfColors.white,
      font: 'F2',
      size: 6.4,
    });
    left += column.width;
  });

  for (let rowIndex = 0; rowIndex < 24; rowIndex += 1) {
    const row = rows[rowIndex] || {};
    let columnLeft = tableX;

    columns.forEach((column) => {
      pushPdfCell(ops, row[column.key] || '', columnLeft, tableTop + headerHeight + (rowIndex * rowHeight), column.width, rowHeight, {
        align: column.align || 'left',
        font: 'F1',
        size: 6.2,
      });
      columnLeft += column.width;
    });
  }
}

function pushSettlementFooter(ops, report, isLastPage) {
  const top = 500;

  if (!isLastPage) {
    pushPdfText(ops, 'Continua na proxima pagina', 24, top + 12, { font: 'F2', size: 8, width: 200 });
    return;
  }

  pushPdfLabelValue(ops, 'TOTAL RECEBIDO', currency(report.totals.totalReceived), 24, top, 100, 95, 14);
  pushPdfLabelValue(ops, 'TOTAL DIARIAS', currency(report.totals.totalDailyAmount), 224, top, 92, 95, 14);
  pushPdfLabelValue(ops, 'SALDO', currency(report.totals.balance), 420, top, 48, 90, 14);

  pushPdfText(ops, 'DESPESAS', 224, top + 31, {
    align: 'center',
    color: settlementPdfColors.red,
    font: 'F2',
    size: 7,
    width: 92,
  });
  pushPdfCell(ops, currency(report.totals.totalReceived), 316, top + 26, 95, 14, { align: 'right' });
  pushPdfLabelValue(ops, balanceRecipientLabel(report.totals.balance), currency(Math.abs(report.totals.balance)), 392, top + 58, 100, 66, 14);

}

function createDriverSettlementStyledPdf(report) {
  const rows = driverSettlementPdfRows(report);
  const rowsPerPage = 24;
  const pages = [];

  for (let index = 0; index < Math.max(rows.length, 1); index += rowsPerPage) {
    pages.push(rows.slice(index, index + rowsPerPage));
  }

  const streams = pages.map((pageRows, pageIndex) => {
    const ops = ['0.5 w'];

    pushSettlementHeader(ops, report, pageIndex, pages.length);
    pushSettlementTable(ops, pageRows);
    pushSettlementFooter(ops, report, pageIndex === pages.length - 1);

    return ops.join('\n');
  });

  return createPdfFromStreams(streams);
}

export function createDriverSettlementPdf(report) {
  return createDriverSettlementStyledPdf(report);
}

export function downloadDriverSettlementPdf(report) {
  const pdf = createDriverSettlementPdf(report);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const driverName = normalizeText(report.driver.name || 'motorista').replace(/\s+/g, '-');

  link.href = url;
  link.download = `prestacao-conta-${driverName || 'motorista'}-${todayValue()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return pdf;
}

function buildReportAttachment(report) {
  const pdf = createDriverSettlementPdf(report);

  return {
    id: `relatorio-prestacao-${report.id}`,
    name: `prestacao-conta-${report.driver.name || 'motorista'}-${todayValue()}.pdf`,
    type: 'application/pdf',
    size: pdf.length,
    source: 'generated',
    generatedAt: report.generatedAt,
  };
}

function nextSettlementId() {
  const now = new Date();
  const key = 'driverSettlementSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `PC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

export function closeDriverSettlement({
  existingSettlementId = '',
  driver,
  dailyRate,
  kmStart,
  kmEnd,
  adjustments,
  excludedFinancialMovementIds = [],
  dueDate,
}) {
  const settlements = readSettlements();
  const existingSettlement = settlements.find((settlement) => settlement.id === existingSettlementId) || null;
  const settlementId = existingSettlement?.id || nextSettlementId();

  if (existingSettlement?.payableLaunchId) {
    deleteFinanceLaunch(existingSettlement.payableLaunchId, {
      summary: 'Lancamento de saldo removido para refazer prestacao de conta',
    });
  }

  const report = buildDriverSettlementReport({
    driver,
    dailyRate,
    kmStart,
    kmEnd,
    adjustments,
    excludedFinancialMovementIds,
    dueDate,
    settlementId,
  });
  const payableLaunchId = nextFinanceLaunchNumber('CAP');
  const payableAmount = Math.abs(report.totals.balance);
  const supplier = report.supplier;
  const issueDate = todayValue();
  const nextLaunch = {
    id: payableLaunchId,
    unit: businessUnits[0]?.value || '001',
    supplier: supplier?.name || driver?.name || '',
    supplierCode: report.driver.supplierCode,
    type: settlementBalanceAccountingType,
    accountingTypeCode: '07',
    document: settlementId,
    chargeType: 'Pix',
    paymentBank: '',
    issueDate,
    dueDate,
    createdDate: issueDate,
    createdAt: new Date().toISOString(),
    paymentDate: '',
    appropriationDate: issueDate,
    paymentForecastDate: dueDate,
    amount: normalizeAmount(payableAmount),
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: `Saldo de prestacao de conta ${settlementId}. Quem esta devendo: ${report.debtor}. Saldo original: ${currency(report.totals.balance)}.`,
    installments: [
      {
        number: 1,
        dueDate,
        value: normalizeAmount(payableAmount).toFixed(2),
      },
    ],
    quantity: 1,
    attachments: [buildReportAttachment(report)],
    driverSettlementId: settlementId,
    settlementBalance: report.totals.balance,
    settlementDebtor: report.debtor,
  };

  upsertFinanceLaunch(nextLaunch, {
    summary: 'Lancamento de saldo de prestacao de conta criado',
  });

  const now = new Date().toISOString();
  const nextSettlement = {
    ...(existingSettlement || {}),
    id: settlementId,
    status: 'Fechada',
    driverCpf: driver?.cpf || '',
    driverName: driver?.name || '',
    supplierCode: report.driver.supplierCode,
    supplierLabel: report.driver.supplierLabel,
    dailyRate: report.dailyRate,
    kmStart: report.kmStart,
    kmEnd: report.kmEnd,
    dueDate,
    closedAt: now,
    updatedAt: now,
    createdAt: existingSettlement?.createdAt || now,
    payableLaunchId,
    adjustments: report.adjustments,
    excludedFinancialMovementIds: report.excludedFinancialMovementIds,
    report,
  };
  const nextSettlements = existingSettlement
    ? settlements.map((settlement) => (settlement.id === settlementId ? nextSettlement : settlement))
    : [nextSettlement, ...settlements];

  writeSettlements(nextSettlements);
  recordAuditEvent({
    module: 'Financeiro',
    action: existingSettlement ? auditActions.update : auditActions.create,
    entityType: 'prestacao de conta',
    entityId: settlementId,
    entityLabel: driver?.name || settlementId,
    before: existingSettlement,
    after: nextSettlement,
    summary: existingSettlement ? 'Prestacao de conta refechada' : 'Prestacao de conta fechada',
  });

  return {
    settlements: nextSettlements,
    settlement: nextSettlement,
    report,
    payableLaunch: nextLaunch,
  };
}

export function reopenDriverSettlement(settlementId) {
  const settlements = readSettlements();
  const settlement = settlements.find((item) => item.id === settlementId);

  if (!settlement) {
    return { error: 'Prestacao de conta nao encontrada' };
  }

  if (settlement.payableLaunchId) {
    deleteFinanceLaunch(settlement.payableLaunchId, {
      summary: 'Lancamento de saldo removido ao reabrir prestacao de conta',
    });
  }

  const nextSettlement = {
    ...settlement,
    status: 'Reaberta',
    payableLaunchId: '',
    reopenedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextSettlements = settlements.map((item) => (item.id === settlementId ? nextSettlement : item));

  writeSettlements(nextSettlements);
  recordAuditEvent({
    module: 'Financeiro',
    action: auditActions.update,
    entityType: 'prestacao de conta',
    entityId: settlementId,
    entityLabel: settlement.driverName || settlementId,
    before: settlement,
    after: nextSettlement,
    summary: 'Prestacao de conta reaberta',
  });

  return {
    settlements: nextSettlements,
    settlement: nextSettlement,
  };
}
