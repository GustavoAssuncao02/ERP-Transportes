import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const businessUnits = [
  { value: '001', code: '001', name: 'JTD Transportes LTDA', label: '001 - JTD Transportes LTDA' },
  { value: '002', code: '002', name: 'JTD Logística Nordeste', label: '002 - JTD Logística Nordeste' },
  { value: '003', code: '003', name: 'JTD Armazéns Salvador', label: '003 - JTD Armazéns Salvador' },
];

export const suppliers = [
  {
    code: '1001',
    name: 'Auto Posto Central LTDA',
    cnpj: '12.345.678/0001-90',
    contact: 'Mariana Costa - (71) 3342-1188',
    email: 'financeiro@autopostocentral.com.br',
    zipCode: '41820-021',
    street: 'Av. Tancredo Neves',
    addressNumber: '1000',
    district: 'Caminho das Árvores',
  },
  {
    code: '2042',
    name: 'Oficina São Jorge',
    cnpj: '23.456.789/0001-10',
    contact: 'Jorge Santos - (71) 3381-2042',
    email: 'atendimento@oficinasaojorge.com.br',
    zipCode: '41213-000',
    street: 'Rua das Oficinas',
    addressNumber: '245',
    district: 'Pirajá',
  },
  {
    code: '3110',
    name: 'Seguradora Atlântica',
    cnpj: '34.567.890/0001-22',
    contact: 'Renata Alves - (71) 4002-3110',
    email: 'apolices@seguradoraatlantica.com.br',
    zipCode: '40015-160',
    street: 'Av. Estados Unidos',
    addressNumber: '397',
    district: 'Comércio',
  },
  {
    code: '4208',
    name: 'Transportes Parceiros SA',
    cnpj: '45.678.901/0001-33',
    contact: 'Carlos Menezes - (71) 3565-4208',
    email: 'operacoes@transportesparceiros.com.br',
    zipCode: '41745-130',
    street: 'Rua Alceu Amoroso Lima',
    addressNumber: '668',
    district: 'Caminho das Árvores',
  },
  {
    code: '5124',
    name: 'JTD Logística Nordeste',
    cnpj: '56.789.012/0001-44',
    contact: 'Fernanda Rocha - (71) 3500-5124',
    email: 'financeiro@jtdlogistica.com.br',
    zipCode: '43700-000',
    street: 'Via Periférica II',
    addressNumber: '1350',
    district: 'Centro Industrial de Aratu',
  },
  {
    code: '6205',
    name: 'Cartório Modelo',
    cnpj: '67.890.123/0001-55',
    contact: 'Ana Paula Reis - (71) 3321-6205',
    email: 'atendimento@cartoriomodelo.com.br',
    zipCode: '40020-210',
    street: 'Rua Chile',
    addressNumber: '22',
    district: 'Centro Histórico',
  },
];

export const accountingTypes = [
  { code: '01', name: 'Serviços de transporte' },
  { code: '02', name: 'Combustível' },
  { code: '03', name: 'Manutenção' },
  { code: '04', name: 'Pedágio' },
  { code: '05', name: 'Administrativo' },
  { code: '06', name: 'Seguro' },
  { code: '07', name: 'Saldo de Prestacao de conta' },
];

export const chargeTypes = [
  'Carteira',
  'Banco',
  'Cheque Pré-Datado',
  'À vista',
  'Salário',
  'Empréstimo',
  'Imposto',
  'Boleto',
  'Pix',
  'Transferencia',
  'Cartão',
  'Dinheiro',
];

export const paymentBanks = [
  'Banco do Brasil',
  'Bradesco',
  'Itau',
  'Santander',
  'Caixa Econômica',
  'Sicoob',
];

export const financeLaunchStorageKey = 'financeLaunchesRegistry';
export const financeLaunchesUpdatedEventName = 'financeLaunches:updated';
export const settlementBalanceAccountingType = 'Saldo de Prestacao de conta';

export const financeLaunches = [
  {
    id: 'CAP-202605-00001',
    unit: '001',
    supplier: 'Auto Posto Central LTDA',
    supplierCode: '1001',
    type: 'Combustível',
    accountingTypeCode: '02',
    document: 'NF-8742',
    chargeType: 'Boleto',
    paymentBank: '',
    issueDate: '2026-05-10',
    dueDate: '2026-05-14',
    createdDate: '2026-05-10',
    paymentDate: '',
    appropriationDate: '2026-05-10',
    paymentForecastDate: '2026-05-14',
    amount: 1350.25,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Abastecimento frota Salvador.',
    attachments: [
      { id: 'doc-cap-00001-nf', name: 'NF-8742.pdf', type: 'application/pdf' },
      { id: 'doc-cap-00001-aut', name: 'autorização-diretoria.png', type: 'image/png' },
    ],
  },
  {
    id: 'CAP-202605-00002',
    unit: '001',
    supplier: 'Oficina São Jorge',
    supplierCode: '2042',
    type: 'Manutenção',
    accountingTypeCode: '03',
    document: 'OS-1180',
    chargeType: 'Pix',
    paymentBank: '',
    issueDate: '2026-05-11',
    dueDate: '2026-05-14',
    createdDate: '2026-05-11',
    paymentDate: '',
    appropriationDate: '2026-05-11',
    paymentForecastDate: '2026-05-14',
    amount: 780,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Servico corretivo em cavalo mecânico.',
    attachments: [
      { id: 'doc-cap-00002-os', name: 'OS-1180.pdf', type: 'application/pdf' },
    ],
  },
  {
    id: 'CAP-202605-00003',
    unit: '002',
    supplier: 'Seguradora Atlântica',
    supplierCode: '3110',
    type: 'Seguro',
    accountingTypeCode: '06',
    document: 'AP-4409',
    chargeType: 'Boleto',
    paymentBank: 'Banco do Brasil',
    issueDate: '2026-05-03',
    dueDate: '2026-05-12',
    createdDate: '2026-05-03',
    paymentDate: '2026-05-12',
    appropriationDate: '2026-05-03',
    paymentForecastDate: '2026-05-12',
    amount: 2420.5,
    interestAmount: 18.4,
    discountAmount: 0,
    finalAmount: 2438.9,
    status: 'Baixado',
    notes: 'Parcela de seguro quitada.',
    settlementNote: 'Baixa realizada conforme comprovante bancario.',
    attachments: [
      { id: 'doc-cap-00003-comprovante', name: 'comprovante-baixa-AP-4409.pdf', type: 'application/pdf' },
    ],
  },
  {
    id: 'CAP-202605-00004',
    unit: '003',
    supplier: 'Transportes Parceiros SA',
    supplierCode: '4208',
    type: 'Serviços de transporte',
    accountingTypeCode: '01',
    document: 'FAT-3321',
    chargeType: 'Transferencia',
    paymentBank: '',
    issueDate: '2026-05-13',
    dueDate: '2026-06-10',
    createdDate: '2026-05-13',
    paymentDate: '',
    appropriationDate: '2026-05-13',
    paymentForecastDate: '2026-06-10',
    amount: 990.9,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Frete complementar regional.',
    attachments: [],
  },
  {
    id: 'CAP-202605-00005',
    unit: '001',
    supplier: 'JTD Logística Nordeste',
    supplierCode: '5124',
    type: 'Administrativo',
    accountingTypeCode: '05',
    document: 'DUP-0091',
    chargeType: 'Boleto',
    paymentBank: '',
    issueDate: '2026-05-15',
    dueDate: '2026-05-28',
    createdDate: '2026-05-15',
    paymentDate: '',
    appropriationDate: '2026-05-15',
    paymentForecastDate: '2026-05-28',
    amount: 3180,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Rateio administrativo mensal.',
    attachments: [],
  },
  {
    id: 'PAV-202605-00001',
    unit: '001',
    supplier: 'Cartório Modelo',
    supplierCode: '6205',
    type: 'Administrativo',
    accountingTypeCode: '05',
    document: 'DOC-2201',
    chargeType: 'Dinheiro',
    paymentBank: 'Caixa Econômica',
    issueDate: '2026-05-15',
    dueDate: '2026-05-15',
    createdDate: '2026-05-15',
    paymentDate: '2026-05-15',
    appropriationDate: '2026-05-15',
    paymentForecastDate: '2026-05-15',
    amount: 240,
    interestAmount: 0,
    discountAmount: 12,
    finalAmount: 228,
    status: 'Baixado',
    notes: 'Pagamento avulso lançado e baixado.',
    settlementNote: '',
    attachments: [
      { id: 'doc-pav-00001-recibo', name: 'recibo-cartorio-modelo.pdf', type: 'application/pdf' },
    ],
  },
  {
    id: 'CAP-202605-00006',
    unit: '001',
    supplier: 'Auto Posto Central LTDA',
    supplierCode: '1001',
    type: 'Pedágio',
    accountingTypeCode: '04',
    document: 'REC-5530',
    chargeType: 'Cartão',
    paymentBank: '',
    issueDate: '2026-05-15',
    dueDate: '2026-05-15',
    createdDate: '2026-05-15',
    paymentDate: '',
    appropriationDate: '2026-05-15',
    paymentForecastDate: '2026-05-15',
    amount: 410.4,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Pedágios programados para hoje.',
    attachments: [],
  },
  {
    id: 'CAP-202605-00007',
    unit: '002',
    supplier: 'Seguradora Atlântica',
    supplierCode: '3110',
    type: 'Seguro',
    accountingTypeCode: '06',
    document: 'AP-4410',
    chargeType: 'Boleto',
    paymentBank: '',
    issueDate: '2026-05-15',
    dueDate: '2026-05-15',
    createdDate: '2026-05-15',
    paymentDate: '',
    appropriationDate: '2026-05-15',
    paymentForecastDate: '2026-05-15',
    amount: 1860,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Seguro com vencimento no dia.',
    attachments: [],
  },
  {
    id: 'CAP-202605-00008',
    unit: '003',
    supplier: 'Transportes Parceiros SA',
    supplierCode: '4208',
    type: 'Serviços de transporte',
    accountingTypeCode: '01',
    document: 'FAT-3310',
    chargeType: 'Transferencia',
    paymentBank: 'Santander',
    issueDate: '2026-05-01',
    dueDate: '2026-05-08',
    createdDate: '2026-05-01',
    paymentDate: '2026-05-13',
    appropriationDate: '2026-05-01',
    paymentForecastDate: '2026-05-08',
    amount: 1240,
    interestAmount: 32,
    discountAmount: 20,
    finalAmount: 1252,
    status: 'Baixado',
    notes: 'Baixa com ajuste financeiro.',
    settlementNote: 'Juros e desconto aplicados na baixa em lote.',
    attachments: [
      { id: 'doc-cap-00008-comprovante', name: 'comprovante-FAT-3310.pdf', type: 'application/pdf' },
    ],
  },
  {
    id: 'CAP-202605-00009',
    unit: '001',
    supplier: 'JTD Logística Nordeste',
    supplierCode: '5124',
    type: 'Administrativo',
    accountingTypeCode: '05',
    document: 'DUP-0088',
    chargeType: 'Banco',
    paymentBank: '',
    issueDate: '2026-05-05',
    dueDate: '2026-05-10',
    createdDate: '2026-05-05',
    paymentDate: '',
    appropriationDate: '2026-05-05',
    paymentForecastDate: '2026-05-10',
    amount: 920,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Titulo vencido aguardando programação.',
    attachments: [],
  },
  {
    id: 'CAP-202606-00010',
    unit: '002',
    supplier: 'Oficina São Jorge',
    supplierCode: '2042',
    type: 'Manutenção',
    accountingTypeCode: '03',
    document: 'OS-1204',
    chargeType: 'Pix',
    paymentBank: '',
    issueDate: '2026-05-16',
    dueDate: '2026-06-18',
    createdDate: '2026-05-16',
    paymentDate: '',
    appropriationDate: '2026-05-16',
    paymentForecastDate: '2026-06-18',
    amount: 1540,
    interestAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    status: 'Aberto',
    notes: 'Manutenção preventiva futura.',
    attachments: [],
  },
];

export const supplierNames = [...new Set(financeLaunches.map((launch) => launch.supplier))];
export const accountingTypeNames = [...new Set(accountingTypes.map((type) => type.name))];
export const documentNumbers = [...new Set(financeLaunches.map((launch) => launch.document))];

function emitFinanceLaunchesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(financeLaunchesUpdatedEventName));
  }
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right), 'pt-BR'));
}

function normalizeFinanceLaunch(launch) {
  return {
    ...launch,
    id: String(launch.id || '').trim(),
    unit: String(launch.unit || '').trim(),
    supplier: String(launch.supplier || '').trim(),
    supplierCode: String(launch.supplierCode || '').trim(),
    type: String(launch.type || '').trim(),
    accountingTypeCode: String(launch.accountingTypeCode || '').trim(),
    document: String(launch.document || '').trim(),
    chargeType: String(launch.chargeType || '').trim(),
    paymentBank: String(launch.paymentBank || '').trim(),
    issueDate: launch.issueDate || '',
    dueDate: launch.dueDate || '',
    createdDate: launch.createdDate || launch.issueDate || '',
    paymentDate: launch.paymentDate || '',
    appropriationDate: launch.appropriationDate || launch.issueDate || '',
    paymentForecastDate: launch.paymentForecastDate || launch.dueDate || '',
    amount: Number(launch.amount || 0),
    interestAmount: Number(launch.interestAmount || 0),
    discountAmount: Number(launch.discountAmount || 0),
    finalAmount: Number(launch.finalAmount || 0),
    status: launch.status || 'Aberto',
    notes: launch.notes || '',
    settlementNote: launch.settlementNote || '',
    installments: Array.isArray(launch.installments) ? launch.installments : undefined,
    attachments: Array.isArray(launch.attachments) ? launch.attachments : [],
  };
}

function writeFinanceLaunches(records) {
  const normalizedRecords = records.map(normalizeFinanceLaunch).filter((launch) => launch.id);
  writeJsonStorage(financeLaunchStorageKey, normalizedRecords);
  emitFinanceLaunchesUpdated();
  return normalizedRecords;
}

export function getFinanceLaunches() {
  return readJsonStorage(financeLaunchStorageKey, financeLaunches, {
    validate: Array.isArray,
  }).map(normalizeFinanceLaunch);
}

export function getFinanceSupplierNames(launches = getFinanceLaunches()) {
  return uniqueSorted(launches.map((launch) => launch.supplier));
}

export function getFinanceAccountingTypeNames(launches = getFinanceLaunches()) {
  return uniqueSorted([
    ...accountingTypes.map((type) => type.name),
    ...launches.map((launch) => launch.type),
  ]);
}

export function getFinanceDocumentNumbers(launches = getFinanceLaunches()) {
  return uniqueSorted(launches.map((launch) => launch.document));
}

export function upsertFinanceLaunch(record, options = {}) {
  const launches = getFinanceLaunches();
  const nextRecord = normalizeFinanceLaunch(record);
  const existingIndex = launches.findIndex((launch) => normalizeText(launch.id) === normalizeText(nextRecord.id));
  const previousRecord = existingIndex >= 0 ? launches[existingIndex] : null;
  const nextLaunches = [...launches];

  if (existingIndex >= 0) {
    nextLaunches[existingIndex] = nextRecord;
  } else {
    nextLaunches.push(nextRecord);
  }

  const savedLaunches = writeFinanceLaunches(nextLaunches);

  recordAuditEvent({
    module: 'Financeiro',
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'lancamento financeiro',
    entityId: nextRecord.id,
    entityLabel: nextRecord.supplier || nextRecord.document || nextRecord.id,
    before: previousRecord,
    after: nextRecord,
    summary: options.summary || (previousRecord ? 'Lancamento financeiro atualizado' : 'Lancamento financeiro criado'),
  });

  return savedLaunches;
}

export function deleteFinanceLaunch(id, options = {}) {
  const launches = getFinanceLaunches();
  const previousRecord = launches.find((launch) => normalizeText(launch.id) === normalizeText(id));
  const nextLaunches = launches.filter((launch) => normalizeText(launch.id) !== normalizeText(id));

  if (!previousRecord) {
    return launches;
  }

  const savedLaunches = writeFinanceLaunches(nextLaunches);

  recordAuditEvent({
    module: 'Financeiro',
    action: auditActions.delete,
    entityType: 'lancamento financeiro',
    entityId: previousRecord.id,
    entityLabel: previousRecord.supplier || previousRecord.document || previousRecord.id,
    before: previousRecord,
    after: null,
    summary: options.summary || 'Lancamento financeiro excluido',
  });

  return savedLaunches;
}

export function nextFinanceLaunchNumber(prefix = 'CAP') {
  const now = new Date();
  const key = `financeSequence:${prefix}`;
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

export function isSettlementBalanceLaunch(launch) {
  return normalizeText(launch?.type) === normalizeText(settlementBalanceAccountingType)
    || normalizeText(launch?.accountingType) === normalizeText(settlementBalanceAccountingType);
}

export function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function toNumber(value) {
  return Number.parseFloat(String(value).replace(',', '.')) || 0;
}

export function findFinanceLaunchById(id) {
  return getFinanceLaunches().find((launch) => normalizeText(launch.id) === normalizeText(String(id).trim()));
}

export function formatUnit(unitCode) {
  const unit = businessUnits.find((item) => item.value === unitCode || item.code === unitCode);
  return unit ? unit.label : unitCode;
}

export function formatSupplier(launch) {
  const supplier = suppliers.find((item) => item.name === launch.supplier || item.code === launch.supplierCode);
  return supplier ? `${supplier.code} - ${supplier.name} - ${supplier.cnpj}` : launch.supplier;
}

export function formatAccountingType(launch) {
  const type = accountingTypes.find((item) => item.name === launch.type || item.code === launch.accountingTypeCode);
  return type ? `${type.code} - ${type.name}` : launch.type;
}
