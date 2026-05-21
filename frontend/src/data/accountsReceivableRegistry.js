import { normalizeText, toNumber, todayValue } from './financeData.js';
import { formatCpf, onlyDigits } from './transportRegistry.js';
import { blankAddressFields, normalizeAddressFields } from '../utils/address.js';
import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const receivableStorageKey = 'accountsReceivableTitles';

export const defaultReceivables = [
  normalizeAddressFields({
    id: 'CR-202605-00001',
    customerName: 'Auto Posto Central LTDA',
    customerDocument: '12.345.678/0001-90',
    address: 'Av. Tancredo Neves, 1000 - Salvador - BA',
    paymentForecastDate: '2026-05-28',
    cteId: 'CTE-202605-00001',
    nfeNumber: 'NF-8742',
    mdfeId: 'MDFE-202605-00001',
    collectionOrderId: 'OC-202605-00001',
    deliveryProof: 'Entrega confirmada pelo canhoto digital',
    freightValue: '1450',
    discountValue: '0',
    additionValue: '0',
    tollValue: '120',
    insuranceValue: '85',
    pickupFee: '60',
    deliveryFee: '90',
    originalValue: '1805',
    paidValue: '0',
    openBalance: '1805',
    issueDate: '2026-05-18',
    createdDate: '2026-05-18',
    dueTermDays: 10,
    status: 'Aberto',
    settlements: [],
  }),
];

function withReceivableDefaults(receivable) {
  const normalizedReceivable = normalizeAddressFields(receivable);
  const originalValue = toNumber(normalizedReceivable.originalValue) || calculateTotal(normalizedReceivable);
  const paidValue = Math.min(toNumber(receivable.paidValue), originalValue);
  const openBalance = Math.max(0, originalValue - paidValue);

  return {
    ...normalizedReceivable,
    createdDate: normalizedReceivable.createdDate || normalizedReceivable.issueDate || todayValue(),
    originalValue: originalValue.toFixed(2),
    paidValue: paidValue.toFixed(2),
    openBalance: openBalance.toFixed(2),
    settlements: Array.isArray(receivable.settlements) ? receivable.settlements : [],
  };
}

export function readReceivables() {
  return readJsonStorage(receivableStorageKey, defaultReceivables, {
    validate: Array.isArray,
  }).map(withReceivableDefaults);
}

export function writeReceivables(receivables) {
  writeJsonStorage(receivableStorageKey, receivables.map(withReceivableDefaults));
}

function recordReceivableAudit({ action, receivable, before, after, summary, metadata }) {
  recordAuditEvent({
    module: 'Financeiro',
    action,
    entityType: 'titulo a receber',
    entityId: receivable?.id || before?.id || after?.id || '',
    entityLabel: receivable?.customerName || before?.customerName || after?.customerName || '',
    before,
    after,
    summary,
    metadata,
  });
}

export function nextReceivableNumber() {
  const now = new Date();
  const key = 'accountsReceivableSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `CR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

export function blankReceivable() {
  return {
    id: '',
    customerName: '',
    customerDocument: '',
    ...blankAddressFields(),
    paymentForecastDate: '',
    cteId: '',
    nfeNumber: '',
    mdfeId: '',
    collectionOrderId: '',
    deliveryProof: '',
    freightValue: '',
    discountValue: '',
    additionValue: '',
    tollValue: '',
    insuranceValue: '',
    pickupFee: '',
    deliveryFee: '',
    paidValue: '',
    issueDate: todayValue(),
    createdDate: todayValue(),
    settlements: [],
  };
}

export function formatCpfCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return formatCpf(digits);
  }

  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 8);
  const branch = digits.slice(8, 12);
  const last = digits.slice(12, 14);

  return `${first}.${second}.${third}/${branch}-${last}`;
}

export function differenceInDays(start, end) {
  if (!start || !end) return '';

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '';

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
}

export function calculateTotal(form) {
  return Math.max(0, (
    toNumber(form.freightValue)
    + toNumber(form.additionValue)
    + toNumber(form.tollValue)
    + toNumber(form.insuranceValue)
    + toNumber(form.pickupFee)
    + toNumber(form.deliveryFee)
    - toNumber(form.discountValue)
  ));
}

export function calculateStatus({ totalValue, paidValue, paymentForecastDate }) {
  if (totalValue <= 0) return 'Rascunho';
  if (paidValue >= totalValue) return 'Recebido';
  if (paidValue > 0) return 'Parcial';
  if (paymentForecastDate && paymentForecastDate < todayValue()) return 'Vencido';
  return 'Aberto';
}

export function receivableSearchText(receivable) {
  return [
    receivable.id,
    receivable.customerName,
    receivable.customerDocument,
    receivable.cteId,
    receivable.nfeNumber,
    receivable.mdfeId,
    receivable.collectionOrderId,
    receivable.status,
  ].join(' ');
}

export function saveReceivable(record) {
  const receivables = readReceivables();
  const existingIndex = receivables.findIndex((receivable) => normalizeText(receivable.id) === normalizeText(record.id));
  const currentSettlements = existingIndex >= 0 ? receivables[existingIndex].settlements : [];
  const nextReceivable = withReceivableDefaults({
    ...record,
    settlements: Array.isArray(record.settlements) ? record.settlements : currentSettlements,
  });
  const nextReceivables = [...receivables];

  if (existingIndex >= 0) {
    nextReceivables[existingIndex] = nextReceivable;
  } else {
    nextReceivables.push(nextReceivable);
  }

  writeReceivables(nextReceivables);
  recordReceivableAudit({
    action: existingIndex >= 0 ? auditActions.update : auditActions.create,
    receivable: nextReceivable,
    before: existingIndex >= 0 ? receivables[existingIndex] : null,
    after: nextReceivable,
    summary: existingIndex >= 0 ? 'Titulo a receber atualizado' : 'Titulo a receber cadastrado',
  });
  return { receivables: nextReceivables, receivable: nextReceivable, updated: existingIndex >= 0 };
}

export function settleReceivable({ id, amount, settlementDate, bank, method, note }) {
  const receivables = readReceivables();
  const existingIndex = receivables.findIndex((receivable) => normalizeText(receivable.id) === normalizeText(id));

  if (existingIndex < 0) {
    return { receivables, receivable: null };
  }

  const current = receivables[existingIndex];
  const originalValue = toNumber(current.originalValue) || calculateTotal(current);
  const currentPaidValue = Math.min(toNumber(current.paidValue), originalValue);
  const currentBalance = Math.max(0, originalValue - currentPaidValue);
  const settlementAmount = Math.min(toNumber(amount), currentBalance);

  if (settlementAmount <= 0) {
    return { receivables, receivable: current };
  }

  const nextPaidValue = Math.min(originalValue, currentPaidValue + settlementAmount);
  const nextBalance = Math.max(0, originalValue - nextPaidValue);
  const accountingEntry = {
    debit: bank,
    credit: 'Clientes / Contas a Receber',
    amount: settlementAmount.toFixed(2),
    history: `Baixa do titulo ${current.id}`,
  };
  const settlement = {
    id: `REC-${Date.now()}`,
    date: settlementDate,
    bank,
    method,
    amount: settlementAmount.toFixed(2),
    note,
    accountingEntry,
  };
  const nextReceivable = {
    ...current,
    originalValue: originalValue.toFixed(2),
    paidValue: nextPaidValue.toFixed(2),
    openBalance: nextBalance.toFixed(2),
    status: nextBalance <= 0 ? 'Recebido' : 'Parcial',
    lastReceiptDate: settlementDate,
    lastReceiptBank: bank,
    lastReceiptMethod: method,
    lastReceiptNote: note,
    settlements: [...(current.settlements || []), settlement],
  };
  const nextReceivables = [...receivables];
  nextReceivables[existingIndex] = nextReceivable;

  writeReceivables(nextReceivables);
  recordReceivableAudit({
    action: auditActions.financialChange,
    receivable: nextReceivable,
    before: current,
    after: nextReceivable,
    summary: 'Baixa de titulo a receber registrada',
    metadata: {
      settlement,
    },
  });
  return { receivables: nextReceivables, receivable: nextReceivable, settlement };
}
