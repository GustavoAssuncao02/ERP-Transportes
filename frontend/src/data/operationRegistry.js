import { addressFieldSet, normalizeAddressFields } from '../utils/address.js';
import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const cteStorageKey = 'transportCtes';
export const collectionOrderStorageKey = 'collectionOrders';
export const minutaStorageKey = 'transportMinutas';
export const manifestStorageKey = 'transportManifests';
export const pendingManifestIdKey = 'pendingManifestId';
const manifestSeedVersionKey = 'transportManifestSeedVersion';
const manifestSeedVersion = 'fleet-map-demo-v2-third-party-transit';
const pickupAddressFields = addressFieldSet('pickup', 'pickupAddress');
const deliveryAddressFields = addressFieldSet('delivery', 'deliveryAddress');

export const defaultCtes = [
  {
    id: 'CTE-202605-00001',
    number: '351605000001',
    unit: '001',
    issuer: 'JTD Transportes LTDA',
    origin: 'Salvador - BA',
    destination: 'Feira de Santana - BA',
    cargoWeight: '12800',
    cargoValue: '184500',
    status: 'Aberto',
    vehiclePlate: 'ABC1D23',
    vehicleModel: 'Volvo FH 540',
    driverCpf: '52998224725',
    driverName: 'Joao Pereira Santos',
  },
  {
    id: 'CTE-202605-00002',
    number: '351605000002',
    unit: '001',
    issuer: 'JTD Transportes LTDA',
    origin: 'Camacari - BA',
    destination: 'Aracaju - SE',
    cargoWeight: '9200',
    cargoValue: '112300',
    status: 'Aberto',
    vehiclePlate: 'ABC1D23',
    vehicleModel: 'Volvo FH 540',
    driverCpf: '52998224725',
    driverName: 'Joao Pereira Santos',
  },
  {
    id: 'CTE-202605-00003',
    number: '351605000003',
    unit: '002',
    issuer: 'Transportes Parceiros SA',
    origin: 'Lauro de Freitas - BA',
    destination: 'Maceio - AL',
    cargoWeight: '15300',
    cargoValue: '206900',
    status: 'Aberto',
    vehiclePlate: 'JTD4A56',
    vehicleModel: 'Scania R 450',
    driverCpf: '39053344705',
    driverName: 'Marcos Vinicius Almeida',
  },
  {
    id: 'CTE-202605-00004',
    number: '351605000004',
    unit: '003',
    issuer: 'JTD Armazens Salvador',
    origin: 'Salvador - BA',
    destination: 'Recife - PE',
    cargoWeight: '11100',
    cargoValue: '158750',
    status: 'Aberto',
    vehiclePlate: 'LOG8B91',
    vehicleModel: 'Mercedes-Benz Actros 2651',
    driverCpf: '11144477735',
    driverName: 'Carlos Eduardo Rocha',
  },
];

export const defaultCollectionOrders = [
  {
    id: 'OC-202605-00001',
    requestDate: '2026-05-18',
    senderName: 'Auto Posto Central LTDA',
    recipientName: 'JTD Armazens Salvador',
    cargoDescription: 'Pecas automotivas paletizadas',
    volumeQuantity: '12',
    cargoWeight: '2400',
    merchandiseValue: '18500',
    invoiceKey: '29260512345678000190550010000087421000087425',
    collectionDateTime: '2026-05-18T14:30',
    driverCpf: '52998224725',
    driverName: 'Joao Pereira Santos',
    vehiclePlate: 'ABC1D23',
    vehicleModel: 'Volvo FH 540',
    notes: 'Coleta com conferencia de volumes no carregamento.',
    status: 'Agendada',
  },
];

function normalizeMinutaAddressFields(minuta) {
  return normalizeAddressFields(
    normalizeAddressFields(minuta, pickupAddressFields),
    deliveryAddressFields,
  );
}

export const defaultMinutas = [
  normalizeMinutaAddressFields({
    id: 'MIN-202605-00001',
    issueDate: '2026-05-18',
    senderName: 'Auto Posto Central LTDA',
    senderDocument: '12.345.678/0001-90',
    recipientName: 'Transportes Parceiros SA',
    recipientDocument: '45.678.901/0001-33',
    pickupZipCode: '',
    pickupStreet: 'Av. Tancredo Neves',
    pickupNumber: '1000',
    pickupDistrict: '',
    pickupAddress: 'Av. Tancredo Neves, 1000 - Salvador - BA',
    deliveryZipCode: '',
    deliveryStreet: 'Rua Sao Bento',
    deliveryNumber: '440',
    deliveryDistrict: '',
    deliveryAddress: 'Rua Sao Bento, 440 - Feira de Santana - BA',
    originCity: 'Salvador - BA',
    destinationCity: 'Feira de Santana - BA',
    cargoType: 'Carga geral',
    volumeQuantity: '12',
    cargoWeight: '2400',
    merchandiseValue: '18500',
    linkedInvoice: 'NF-8742',
    freightType: 'CIF',
    freightValue: '1450',
    driverCpf: '52998224725',
    driverName: 'Joao Pereira Santos',
    vehiclePlate: 'ABC1D23',
    vehicleModel: 'Volvo FH 540',
    notes: 'Minuta criada para coleta programada.',
    status: 'Emitida',
    createdAt: '2026-05-18T08:30:00.000Z',
  }),
];

export const defaultManifests = [
  {
    id: 'MDFE-202605-00001',
    unit: '001',
    selectedCteIds: ['CTE-202605-00001', 'CTE-202605-00002'],
    origin: 'Salvador - BA',
    destination: 'Feira de Santana - BA',
    truckPlate: 'ABC1D23',
    truckModel: 'Volvo FH 540',
    driverCpf: '529.982.247-25',
    driverName: 'Joao Pereira Santos',
    cargoWeight: '22000',
    cargoValue: '296800',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00184',
    createdAt: '2026-05-18T08:30',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00002',
    unit: '001',
    selectedCteIds: [],
    origin: 'Sao Paulo - SP',
    destination: 'Salvador - BA',
    truckPlate: 'JTD4A56',
    truckModel: 'Scania R 450',
    driverCpf: '390.533.447-05',
    driverName: 'Marcos Vinicius Almeida',
    cargoWeight: '28400',
    cargoValue: '418900',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00201',
    createdAt: '2026-05-18T09:10',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00003',
    unit: '001',
    selectedCteIds: [],
    origin: 'Sao Paulo - SP',
    destination: 'Salvador - BA',
    truckPlate: 'LOG8B91',
    truckModel: 'Mercedes-Benz Actros 2651',
    driverCpf: '111.444.777-35',
    driverName: 'Carlos Eduardo Rocha',
    cargoWeight: '19750',
    cargoValue: '286300',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00202',
    createdAt: '2026-05-18T09:45',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00004',
    unit: '002',
    selectedCteIds: [],
    origin: 'Sao Paulo - SP',
    destination: 'Recife - PE',
    truckPlate: 'ABC1D23',
    truckModel: 'Volvo FH 540',
    driverCpf: '529.982.247-25',
    driverName: 'Joao Pereira Santos',
    cargoWeight: '25100',
    cargoValue: '361800',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00203',
    createdAt: '2026-05-18T10:20',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00005',
    unit: '002',
    selectedCteIds: [],
    origin: 'Campinas - SP',
    destination: 'Salvador - BA',
    truckPlate: 'JTD4A56',
    truckModel: 'Scania R 450',
    driverCpf: '390.533.447-05',
    driverName: 'Marcos Vinicius Almeida',
    cargoWeight: '17600',
    cargoValue: '224700',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00204',
    createdAt: '2026-05-18T11:00',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00006',
    unit: '003',
    selectedCteIds: [],
    origin: 'Belo Horizonte - MG',
    destination: 'Salvador - BA',
    truckPlate: 'LOG8B91',
    truckModel: 'Mercedes-Benz Actros 2651',
    driverCpf: '111.444.777-35',
    driverName: 'Carlos Eduardo Rocha',
    cargoWeight: '14300',
    cargoValue: '192600',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00205',
    createdAt: '2026-05-18T11:35',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00007',
    unit: '003',
    selectedCteIds: [],
    origin: 'Curitiba - PR',
    destination: 'Salvador - BA',
    truckPlate: 'ABC1D23',
    truckModel: 'Volvo FH 540',
    driverCpf: '529.982.247-25',
    driverName: 'Joao Pereira Santos',
    cargoWeight: '31200',
    cargoValue: '478100',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00206',
    createdAt: '2026-05-18T12:05',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00008',
    unit: '001',
    selectedCteIds: [],
    origin: 'Salvador - BA',
    destination: 'Sao Paulo - SP',
    truckPlate: 'JTD4A56',
    truckModel: 'Scania R 450',
    driverCpf: '390.533.447-05',
    driverName: 'Marcos Vinicius Almeida',
    cargoWeight: '21800',
    cargoValue: '337900',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00207',
    createdAt: '2026-05-18T12:40',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00009',
    unit: '002',
    selectedCteIds: [],
    origin: 'Recife - PE',
    destination: 'Salvador - BA',
    truckPlate: 'LOG8B91',
    truckModel: 'Mercedes-Benz Actros 2651',
    driverCpf: '111.444.777-35',
    driverName: 'Carlos Eduardo Rocha',
    cargoWeight: '9800',
    cargoValue: '145400',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00208',
    createdAt: '2026-05-18T13:15',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00010',
    unit: '002',
    selectedCteIds: [],
    origin: 'Goiania - GO',
    destination: 'Recife - PE',
    truckPlate: 'ABC1D23',
    truckModel: 'Volvo FH 540',
    driverCpf: '529.982.247-25',
    driverName: 'Joao Pereira Santos',
    cargoWeight: '26700',
    cargoValue: '389500',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00209',
    createdAt: '2026-05-18T13:55',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00011',
    unit: '001',
    selectedCteIds: [],
    origin: 'Fortaleza - CE',
    destination: 'Sao Paulo - SP',
    truckPlate: 'JTD4A56',
    truckModel: 'Scania R 450',
    driverCpf: '390.533.447-05',
    driverName: 'Marcos Vinicius Almeida',
    cargoWeight: '22900',
    cargoValue: '318200',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00210',
    createdAt: '2026-05-18T14:25',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00012',
    unit: '003',
    selectedCteIds: [],
    origin: 'Santos - SP',
    destination: 'Salvador - BA',
    truckPlate: 'LOG8B91',
    truckModel: 'Mercedes-Benz Actros 2651',
    driverCpf: '111.444.777-35',
    driverName: 'Carlos Eduardo Rocha',
    cargoWeight: '18400',
    cargoValue: '253600',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00211',
    createdAt: '2026-05-18T15:05',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00013',
    unit: '001',
    selectedCteIds: [],
    origin: 'Sao Paulo - SP',
    destination: 'Salvador - BA',
    truckPlate: 'ABC1D23',
    truckModel: 'Volvo FH 540',
    driverCpf: '529.982.247-25',
    driverName: 'Joao Pereira Santos',
    cargoWeight: '20300',
    cargoValue: '299900',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00212',
    createdAt: '2026-05-18T15:40',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00014',
    unit: '002',
    selectedCteIds: [],
    origin: 'Rio de Janeiro - RJ',
    destination: 'Salvador - BA',
    truckPlate: 'JTD4A56',
    truckModel: 'Scania R 450',
    driverCpf: '390.533.447-05',
    driverName: 'Marcos Vinicius Almeida',
    cargoWeight: '16500',
    cargoValue: '217400',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00213',
    createdAt: '2026-05-18T16:10',
    status: 'Cancelado',
  },
  {
    id: 'MDFE-202605-00015',
    unit: '001',
    selectedCteIds: [],
    origin: 'Salvador - BA',
    destination: 'Aracaju - SE',
    truckPlate: 'TRC2A15',
    truckModel: 'DAF XF 530',
    driverCpf: '804.231.687-90',
    driverName: 'Rafael Costa Lima',
    cargoWeight: '18700',
    cargoValue: '248600',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00315',
    createdAt: '2026-05-20T08:15',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00016',
    unit: '001',
    selectedCteIds: [],
    origin: 'Feira de Santana - BA',
    destination: 'Recife - PE',
    truckPlate: 'ROT3B26',
    truckModel: 'Iveco Hi-Way 600S44',
    driverCpf: '713.542.908-61',
    driverName: 'Helio Martins Rocha',
    cargoWeight: '22600',
    cargoValue: '318450',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00316',
    createdAt: '2026-05-20T08:40',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00017',
    unit: '002',
    selectedCteIds: [],
    origin: 'Camacari - BA',
    destination: 'Maceio - AL',
    truckPlate: 'BRL4C37',
    truckModel: 'Volvo FH 460',
    driverCpf: '625.319.740-22',
    driverName: 'Adriano Silva Teles',
    cargoWeight: '16400',
    cargoValue: '229800',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00317',
    createdAt: '2026-05-20T09:05',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00018',
    unit: '002',
    selectedCteIds: [],
    origin: 'Vitoria da Conquista - BA',
    destination: 'Belo Horizonte - MG',
    truckPlate: 'NDE5D48',
    truckModel: 'Scania G 440',
    driverCpf: '498.760.135-03',
    driverName: 'Marcelo Nunes Araujo',
    cargoWeight: '24100',
    cargoValue: '356200',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00318',
    createdAt: '2026-05-20T09:30',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00019',
    unit: '003',
    selectedCteIds: [],
    origin: 'Ilheus - BA',
    destination: 'Vitoria - ES',
    truckPlate: 'MAP6E59',
    truckModel: 'Mercedes-Benz Actros 2548',
    driverCpf: '951.482.306-74',
    driverName: 'Sergio Almeida Prado',
    cargoWeight: '13800',
    cargoValue: '196700',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00319',
    createdAt: '2026-05-20T09:55',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00020',
    unit: '003',
    selectedCteIds: [],
    origin: 'Barreiras - BA',
    destination: 'Goiania - GO',
    truckPlate: 'LOG7F60',
    truckModel: 'MAN TGX 29.480',
    driverCpf: '286.704.519-55',
    driverName: 'Paulo Henrique Lopes',
    cargoWeight: '27900',
    cargoValue: '421300',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00320',
    createdAt: '2026-05-20T10:20',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00021',
    unit: '001',
    selectedCteIds: [],
    origin: 'Petrolina - PE',
    destination: 'Salvador - BA',
    truckPlate: 'CFX8G71',
    truckModel: 'VW Constellation 25.420',
    driverCpf: '374.605.928-16',
    driverName: 'Claudio Ferraz Xavier',
    cargoWeight: '11900',
    cargoValue: '154900',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00321',
    createdAt: '2026-05-20T10:45',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00022',
    unit: '002',
    selectedCteIds: [],
    origin: 'Recife - PE',
    destination: 'Fortaleza - CE',
    truckPlate: 'ROD9H82',
    truckModel: 'Scania R 500',
    driverCpf: '569.813.247-88',
    driverName: 'Daniel Queiroz Melo',
    cargoWeight: '20500',
    cargoValue: '287400',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00322',
    createdAt: '2026-05-20T11:10',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00023',
    unit: '003',
    selectedCteIds: [],
    origin: 'Sao Paulo - SP',
    destination: 'Salvador - BA',
    truckPlate: 'VLP0I93',
    truckModel: 'Volvo VM 330',
    driverCpf: '642.190.835-49',
    driverName: 'Wagner Batista Reis',
    cargoWeight: '17250',
    cargoValue: '265800',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00323',
    createdAt: '2026-05-20T11:35',
    status: 'Emitido',
  },
  {
    id: 'MDFE-202605-00024',
    unit: '001',
    selectedCteIds: [],
    origin: 'Curitiba - PR',
    destination: 'Salvador - BA',
    truckPlate: 'TMS1J04',
    truckModel: 'DAF CF 480',
    driverCpf: '127.958.460-31',
    driverName: 'Thiago Moreira Souza',
    cargoWeight: '23400',
    cargoValue: '342100',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlantica',
    insurancePolicy: 'AP-2026-00324',
    createdAt: '2026-05-20T12:00',
    status: 'Emitido',
  },
];

function readRecords(key, fallback) {
  return readJsonStorage(key, fallback, {
    validate: Array.isArray,
  });
}

function writeRecords(key, records) {
  writeJsonStorage(key, records);
}

function recordOperationAudit({ action, entityType, entityId, entityLabel, before, after, summary }) {
  recordAuditEvent({
    module: 'Operacao',
    action,
    entityType,
    entityId,
    entityLabel,
    before,
    after,
    summary,
  });
}

function mergeSeedManifests(records) {
  try {
    if (localStorage.getItem(manifestSeedVersionKey) === manifestSeedVersion) {
      return records;
    }

    const existingIds = new Set(records.map((record) => record.id));
    const missingManifests = defaultManifests.filter((manifest) => !existingIds.has(manifest.id));
    const nextRecords = missingManifests.length ? [...records, ...missingManifests] : records;

    if (missingManifests.length) {
      writeRecords(manifestStorageKey, nextRecords);
    }

    localStorage.setItem(manifestSeedVersionKey, manifestSeedVersion);
    return nextRecords;
  } catch {
    return records;
  }
}

function upsertRecord(key, fallback, record, audit = {}) {
  const records = readRecords(key, fallback);
  const existingIndex = records.findIndex((item) => item.id === record.id);
  const previousRecord = existingIndex >= 0 ? records[existingIndex] : null;
  const nextRecords = [...records];

  if (existingIndex >= 0) {
    nextRecords[existingIndex] = record;
  } else {
    nextRecords.push(record);
  }

  writeRecords(key, nextRecords);
  recordOperationAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: audit.entityType || 'registro operacional',
    entityId: record.id,
    entityLabel: audit.entityLabel?.(record) || record.number || record.id,
    before: previousRecord,
    after: record,
    summary: previousRecord ? audit.updateSummary : audit.createSummary,
  });
  return nextRecords;
}

function deleteRecord(key, fallback, id, audit = {}) {
  const records = readRecords(key, fallback);
  const previousRecord = records.find((item) => item.id === id) || { id };
  const nextRecords = records.filter((item) => item.id !== id);
  writeRecords(key, nextRecords);
  recordOperationAudit({
    action: auditActions.delete,
    entityType: audit.entityType || 'registro operacional',
    entityId: previousRecord.id,
    entityLabel: audit.entityLabel?.(previousRecord) || previousRecord.number || previousRecord.id,
    before: previousRecord,
    after: null,
    summary: audit.deleteSummary || 'Registro operacional excluido',
  });
  return nextRecords;
}

function updateRecordStatus(key, fallback, id, status, audit = {}) {
  const records = readRecords(key, fallback);
  const previousRecord = records.find((item) => item.id === id) || { id };
  const nextRecords = records.map((item) => (item.id === id ? { ...item, status } : item));
  writeRecords(key, nextRecords);
  recordOperationAudit({
    action: auditActions.statusChange,
    entityType: audit.entityType || 'registro operacional',
    entityId: previousRecord.id,
    entityLabel: audit.entityLabel?.(previousRecord) || previousRecord.number || previousRecord.id,
    before: previousRecord,
    after: nextRecords.find((item) => item.id === id) || null,
    summary: audit.statusSummary || `Status alterado para ${status}`,
  });
  return nextRecords;
}

export function getRegisteredCtes() {
  return readRecords(cteStorageKey, defaultCtes).map((cte) => ({ status: 'Aberto', ...cte }));
}

export function saveCte(record) {
  return upsertRecord(cteStorageKey, defaultCtes, { status: 'Aberto', ...record }, {
    entityType: 'CT-e',
    entityLabel: (cte) => cte.number || cte.id,
    createSummary: 'CT-e emitido',
    updateSummary: 'CT-e atualizado',
  });
}

export function deleteCte(id) {
  return deleteRecord(cteStorageKey, defaultCtes, id, {
    entityType: 'CT-e',
    deleteSummary: 'CT-e excluido',
  });
}

export function deactivateCte(id) {
  return updateRecordStatus(cteStorageKey, defaultCtes, id, 'Cancelado', {
    entityType: 'CT-e',
    statusSummary: 'CT-e cancelado',
  });
}

export function getRegisteredCollectionOrders() {
  return readRecords(collectionOrderStorageKey, defaultCollectionOrders);
}

export function saveCollectionOrder(record) {
  return upsertRecord(collectionOrderStorageKey, defaultCollectionOrders, record, {
    entityType: 'ordem de coleta',
    createSummary: 'Ordem de coleta criada',
    updateSummary: 'Ordem de coleta atualizada',
  });
}

export function deleteCollectionOrder(id) {
  return deleteRecord(collectionOrderStorageKey, defaultCollectionOrders, id, {
    entityType: 'ordem de coleta',
    deleteSummary: 'Ordem de coleta excluida',
  });
}

export function deactivateCollectionOrder(id) {
  return updateRecordStatus(collectionOrderStorageKey, defaultCollectionOrders, id, 'Cancelada', {
    entityType: 'ordem de coleta',
    statusSummary: 'Ordem de coleta cancelada',
  });
}

export function getRegisteredMinutas() {
  return readRecords(minutaStorageKey, defaultMinutas).map(normalizeMinutaAddressFields);
}

export function saveMinuta(record) {
  return upsertRecord(minutaStorageKey, defaultMinutas, normalizeMinutaAddressFields(record), {
    entityType: 'minuta',
    createSummary: 'Minuta criada',
    updateSummary: 'Minuta atualizada',
  });
}

export function deleteMinuta(id) {
  return deleteRecord(minutaStorageKey, defaultMinutas, id, {
    entityType: 'minuta',
    deleteSummary: 'Minuta excluida',
  });
}

export function deactivateMinuta(id) {
  return updateRecordStatus(minutaStorageKey, defaultMinutas, id, 'Cancelada', {
    entityType: 'minuta',
    statusSummary: 'Minuta cancelada',
  });
}

export function getRegisteredManifests() {
  return mergeSeedManifests(readRecords(manifestStorageKey, defaultManifests))
    .map((manifest) => ({ manifestType: 'Manifesto de Trânsito', status: 'Emitido', ...manifest }));
}

export function saveManifest(record) {
  return upsertRecord(manifestStorageKey, defaultManifests, { manifestType: 'Manifesto de Trânsito', status: 'Emitido', ...record }, {
    entityType: 'manifesto',
    createSummary: 'Manifesto emitido',
    updateSummary: 'Manifesto atualizado',
  });
}

export function deleteManifest(id) {
  return deleteRecord(manifestStorageKey, defaultManifests, id, {
    entityType: 'manifesto',
    deleteSummary: 'Manifesto excluido',
  });
}

export function deactivateManifest(id) {
  return updateRecordStatus(manifestStorageKey, defaultManifests, id, 'Cancelado', {
    entityType: 'manifesto',
    statusSummary: 'Manifesto cancelado',
  });
}
