export const businessUnits = [
  { value: '001', code: '001', name: 'JTD Transportes LTDA', label: '001 - JTD Transportes LTDA' },
  { value: '002', code: '002', name: 'JTD Logística Nordeste', label: '002 - JTD Logística Nordeste' },
  { value: '003', code: '003', name: 'JTD Armazéns Salvador', label: '003 - JTD Armazéns Salvador' },
];

export const suppliers = [
  { code: '1001', name: 'Auto Posto Central LTDA', cnpj: '12.345.678/0001-90' },
  { code: '2042', name: 'Oficina São Jorge', cnpj: '23.456.789/0001-10' },
  { code: '3110', name: 'Seguradora Atlântica', cnpj: '34.567.890/0001-22' },
  { code: '4208', name: 'Transportes Parceiros SA', cnpj: '45.678.901/0001-33' },
  { code: '5124', name: 'JTD Logística Nordeste', cnpj: '56.789.012/0001-44' },
  { code: '6205', name: 'Cartório Modelo', cnpj: '67.890.123/0001-55' },
];

export const accountingTypes = [
  { code: '01', name: 'Serviços de transporte' },
  { code: '02', name: 'Combustível' },
  { code: '03', name: 'Manutenção' },
  { code: '04', name: 'Pedágio' },
  { code: '05', name: 'Administrativo' },
  { code: '06', name: 'Seguro' },
];

export const chargeTypes = [
  'Carteira',
  'Banco',
  'Cheque Pré-Datado',
  'À vista',
  'Salário',
  'Empréstimo',
  'Financiamento',
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
    chargeType: 'Financiamento',
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
  return financeLaunches.find((launch) => normalizeText(launch.id) === normalizeText(String(id).trim()));
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
