import { receivableStorageKey, defaultReceivables } from './accountsReceivableRegistry.js';
import { driverSettlementStorageKey, defaultDriverDailyRate } from './driverSettlementRegistry.js';
import {
  accountingTypes,
  businessUnits,
  chargeTypes,
  financeLaunchStorageKey,
  financeLaunches,
  financeLaunchesUpdatedEventName,
  paymentBanks,
  settlementBalanceAccountingType,
} from './financeData.js';
import {
  bankStorageKey,
  defaultBanks,
  defaultInsurances,
  defaultSuppliers,
  defaultUnits,
  insuranceStorageKey,
  supplierStorageKey,
  unitStorageKey,
} from './managementRegistry.js';
import {
  collectionOrderStorageKey,
  controlManifestType,
  cteStorageKey,
  defaultCollectionOrders,
  defaultCtes,
  defaultManifests,
  defaultMinutas,
  manifestStorageKey,
  minutaStorageKey,
  transitManifestType,
} from './operationRegistry.js';
import {
  defaultDrivers,
  defaultVehicles,
  driverStorageKey,
  vehicleStorageKey,
} from './transportRegistry.js';
import {
  blueprintSectors,
  createVariedWarehouseWeightSettings,
  warehouseCargoStorageKey,
  warehouseWeightSettingsStorageKey,
} from './warehouseRegistry.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

const seedVersionKey = 'erpTransportesLargeTestDataSeedVersion';
const seedVersion = 'large-test-data-2026-05-22-v3';
const mainRecordCount = 180;
const referenceRecordCount = 180;

const cityOptions = [
  'Salvador - BA',
  'Feira de Santana - BA',
  'Camacari - BA',
  'Lauro de Freitas - BA',
  'Vitoria da Conquista - BA',
  'Aracaju - SE',
  'Maceio - AL',
  'Recife - PE',
  'Fortaleza - CE',
  'Sao Paulo - SP',
  'Campinas - SP',
  'Belo Horizonte - MG',
  'Curitiba - PR',
  'Goiania - GO',
  'Rio de Janeiro - RJ',
  'Brasilia - DF',
];

const cargoTypes = [
  'Carga geral',
  'Paletizada',
  'Fracionada',
  'Lotacao',
  'Refrigerada',
  'Quimicos',
  'Autopecas',
  'Eletroeletronicos',
];

const freightTypes = ['CIF', 'FOB', 'Terceiro', 'Cortesia'];
const vehicleTypes = ['Cavalo mecanico', 'Truck', 'Toco', 'Van', 'Carreta bau', 'Carreta sider'];
const orderStatuses = ['Solicitada', 'Agendada', 'Em coleta', 'Coletada', 'Cancelada'];
const minutaStatuses = ['Emitida', 'Em conferencia', 'Liberada', 'Faturada', 'Cancelada'];
const cteStatuses = ['Aberto', 'Emitido', 'Autorizado', 'Cancelado'];
const manifestStatuses = ['Emitido', 'Em viagem', 'Fechado', 'Cancelado'];
const warehouseStatuses = [
  'Aguardando roteirizacao',
  'Aguardando expedicao',
  'Aguardando coleta',
  'Conferido',
  'Separacao',
  'Roteirizado',
  'Bloqueio fiscal',
  'Concluido',
];

function pad(value, size = 5) {
  return String(value).padStart(size, '0');
}

function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function dateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateTimeValue(date, index, offsetHours = 7) {
  const day = dateValue(date);
  const hour = String(offsetHours + (index % 11)).padStart(2, '0');
  const minute = String((index * 7) % 60).padStart(2, '0');
  return `${day}T${hour}:${minute}`;
}

function isoValue(date, index, offsetHours = 7) {
  return `${dateTimeValue(date, index, offsetHours)}:00.000`;
}

function periodDate(index) {
  const today = new Date();
  const start = addMonths(today, -1);
  const end = addMonths(today, 1);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return addDays(start, index % totalDays);
}

function money(value) {
  return Number(Number(value).toFixed(2));
}

function formatCpf(digits) {
  const value = String(digits).padStart(11, '0').slice(-11);
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
}

function formatCnpj(digits) {
  const value = String(digits).padStart(14, '0').slice(-14);
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
}

function mergeByKey(existingRecords, generatedRecords, getKey) {
  const recordsByKey = new Map();

  existingRecords.forEach((record) => {
    const key = getKey(record);
    if (key) recordsByKey.set(key, record);
  });

  generatedRecords.forEach((record) => {
    const key = getKey(record);
    if (key) recordsByKey.set(key, record);
  });

  return [...recordsByKey.values()];
}

function readArray(key, fallback) {
  return readJsonStorage(key, fallback, { validate: Array.isArray });
}

function writeMergedRecords(key, fallback, generatedRecords, getKey) {
  const existingRecords = readArray(key, fallback);
  const nextRecords = mergeByKey(existingRecords, generatedRecords, getKey);
  writeJsonStorage(key, nextRecords);
  return nextRecords.length;
}

function itemAt(items, index) {
  return items[index % items.length];
}

function supplierName(index) {
  return `Fornecedor Teste ${pad(index + 1, 3)} LTDA`;
}

function driverName(index) {
  return `Motorista Teste ${pad(index + 1, 3)}`;
}

function plateValue(index) {
  return `TST${pad(index + 1, 4)}`;
}

function buildUnits() {
  return Array.from({ length: referenceRecordCount }, (_, index) => {
    const date = periodDate(index);

    return {
      id: `UNT-TST-${pad(index + 1, 4)}`,
      name: `Unidade Teste ${pad(index + 1, 3)}`,
      cnpj: formatCnpj(60000000000000 + index + 1),
      description: `Unidade operacional gerada para testes ${pad(index + 1, 3)}`,
      address: `Av. Unidade Teste, ${1000 + index} - ${itemAt(cityOptions, index)}`,
      active: index % 21 !== 0,
      cnae: '4930-2/02',
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 9),
    };
  });
}

function buildSuppliers() {
  return Array.from({ length: referenceRecordCount }, (_, index) => {
    const date = periodDate(index);
    const cnpj = formatCnpj(80000000000000 + index + 1);

    return {
      id: `SUP-TST-${pad(index + 1, 4)}`,
      code: `SUP-TST-${pad(index + 1, 4)}`,
      name: supplierName(index),
      cnpj,
      contact: `${driverName(index)} - (71) 9${pad(70000000 + index, 8)}`,
      email: `fornecedor.teste.${pad(index + 1, 3)}@example.com`,
      zipCode: `4${pad(1000000 + index, 7)}`,
      street: `Rua Teste ${pad(index + 1, 3)}`,
      addressNumber: String(100 + index),
      district: 'Centro',
      state: itemAt(['BA', 'SE', 'AL', 'PE', 'CE', 'SP', 'MG', 'PR'], index),
      address: `Rua Teste ${pad(index + 1, 3)}, ${100 + index}`,
      active: index % 17 !== 0,
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 9),
    };
  });
}

function buildInsurances() {
  return Array.from({ length: referenceRecordCount }, (_, index) => {
    const date = periodDate(index);

    return {
      id: `INS-TST-${pad(index + 1, 4)}`,
      companyName: `Seguradora Teste ${pad(index + 1, 3)}`,
      cnpj: formatCnpj(70000000000000 + index + 1),
      policyNumber: `AP-TEST-${pad(index + 1, 5)}`,
      endorsementNumber: index % 4 === 0 ? `END-${pad(index + 1, 4)}` : '',
      contact: `(11) 3${pad(4000000 + index, 7)}`,
      email: `apolice.${pad(index + 1, 3)}@seguradorateste.com`,
      zipCode: `0${pad(1000000 + index, 7)}`,
      street: `Av. Seguro Teste ${pad(index + 1, 3)}`,
      addressNumber: String(200 + index),
      district: 'Comercial',
      state: itemAt(['BA', 'SP', 'MG', 'PE'], index),
      active: index % 19 !== 0,
      defaultInsurance: index === 0,
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 10),
    };
  });
}

function buildBanks() {
  return Array.from({ length: referenceRecordCount }, (_, index) => ({
    id: `BCO-TST-${pad(index + 1, 3)}`,
    unit: itemAt(businessUnits, index).value,
    name: `Banco Teste ${pad(index + 1, 2)}`,
    agency: `${pad(1000 + index, 4)}-${index % 10}`,
    account: `${pad(100000 + index, 6)}-${(index + 3) % 10}`,
    active: true,
  }));
}

function buildDrivers(suppliers) {
  return Array.from({ length: referenceRecordCount }, (_, index) => {
    const date = periodDate(index);
    const supplier = suppliers[index % suppliers.length];

    return {
      cpf: String(50000000000 + index + 1),
      name: driverName(index),
      phone: `(71) 9${pad(80000000 + index, 8)}`,
      cnh: String(30000000000 + index + 1),
      category: itemAt(['B', 'C', 'D', 'E', 'AE'], index),
      status: index % 23 === 0 ? 'Inativo' : 'Ativo',
      state: itemAt(['BA', 'SE', 'AL', 'PE', 'CE', 'SP', 'MG', 'PR'], index),
      supplierCode: supplier.id,
      address: `Rua do Motorista ${pad(index + 1, 3)}, ${50 + index}`,
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 11),
    };
  });
}

function buildVehicles(suppliers) {
  return Array.from({ length: referenceRecordCount }, (_, index) => {
    const date = periodDate(index);
    const thirdParty = index % 3 === 0;

    return {
      plate: plateValue(index),
      model: itemAt(['Volvo FH 540', 'Scania R 450', 'Mercedes-Benz Actros 2651', 'DAF CF 480', 'VW Delivery 11.180'], index),
      type: itemAt(vehicleTypes, index),
      unit: itemAt(businessUnits, index).value,
      ownerType: thirdParty ? 'third_party' : 'company',
      owner: thirdParty ? suppliers[index % suppliers.length].name : itemAt(businessUnits, index).name,
      ownerCpf: thirdParty ? suppliers[index % suppliers.length].cnpj : '',
      status: index % 29 === 0 ? 'Inativo' : 'Ativo',
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 12),
    };
  });
}

function buildCollectionOrders(drivers, vehicles, suppliers) {
  return Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index);
    const driver = drivers[index % drivers.length];
    const vehicle = vehicles[index % vehicles.length];
    const sender = suppliers[index % suppliers.length];
    const recipient = suppliers[(index + 17) % suppliers.length];

    return {
      id: `OC-TEST-${pad(index + 1, 5)}`,
      requestDate: dateValue(date),
      senderName: sender.name,
      recipientName: recipient.name,
      cargoDescription: `${itemAt(cargoTypes, index)} - lote teste ${pad(index + 1, 4)}`,
      volumeQuantity: String((index % 32) + 1),
      cargoWeight: String(1200 + ((index * 137) % 26000)),
      merchandiseValue: String(money(8500 + ((index * 913) % 280000))),
      invoiceKey: `2926${pad(index + 1, 40)}`,
      collectionDateTime: dateTimeValue(date, index, 13),
      driverCpf: driver.cpf,
      driverName: driver.name,
      vehiclePlate: vehicle.plate,
      vehicleModel: vehicle.model,
      notes: `Ordem de coleta gerada para testes ${pad(index + 1, 5)}.`,
      status: itemAt(orderStatuses, index),
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 15),
    };
  });
}

function buildMinutas(drivers, vehicles, suppliers, orders) {
  return Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 3);
    const driver = drivers[index % drivers.length];
    const vehicle = vehicles[index % vehicles.length];
    const sender = suppliers[index % suppliers.length];
    const recipient = suppliers[(index + 23) % suppliers.length];
    const originCity = itemAt(cityOptions, index);
    const destinationCity = itemAt(cityOptions, index + 5);

    return {
      id: `MIN-TEST-${pad(index + 1, 5)}`,
      issueDate: dateValue(date),
      collectionOrderId: orders[index % orders.length].id,
      senderName: sender.name,
      senderDocument: sender.cnpj,
      recipientName: recipient.name,
      recipientDocument: recipient.cnpj,
      pickupZipCode: sender.zipCode,
      pickupStreet: sender.street,
      pickupNumber: sender.addressNumber,
      pickupDistrict: sender.district,
      pickupAddress: `${sender.street}, ${sender.addressNumber} - ${originCity}`,
      deliveryZipCode: recipient.zipCode,
      deliveryStreet: recipient.street,
      deliveryNumber: recipient.addressNumber,
      deliveryDistrict: recipient.district,
      deliveryAddress: `${recipient.street}, ${recipient.addressNumber} - ${destinationCity}`,
      originCity,
      destinationCity,
      cargoType: itemAt(cargoTypes, index),
      volumeQuantity: String((index % 28) + 1),
      cargoWeight: String(1500 + ((index * 149) % 31000)),
      merchandiseValue: String(money(12000 + ((index * 997) % 350000))),
      linkedInvoice: `NF-TEST-${pad(index + 1, 5)}`,
      freightType: itemAt(freightTypes, index),
      freightValue: String(money(900 + ((index * 53) % 7200))),
      driverCpf: driver.cpf,
      driverName: driver.name,
      vehiclePlate: vehicle.plate,
      vehicleModel: vehicle.model,
      notes: `Minuta gerada para testes ${pad(index + 1, 5)}.`,
      status: itemAt(minutaStatuses, index),
      createdAt: isoValue(date, index),
      updatedAt: isoValue(date, index, 16),
    };
  });
}

function buildCtes(drivers, vehicles, suppliers, insurances, orders, minutas) {
  return Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 6);
    const driver = drivers[index % drivers.length];
    const vehicle = vehicles[index % vehicles.length];
    const issuer = itemAt(businessUnits, index);
    const insurance = insurances[index % insurances.length];

    return {
      id: `CTE-TEST-${pad(index + 1, 5)}`,
      number: `3526${pad(index + 1, 9)}`,
      unit: issuer.value,
      issuer: issuer.name,
      origin: itemAt(cityOptions, index),
      destination: itemAt(cityOptions, index + 7),
      cargoWeight: String(1800 + ((index * 173) % 33000)),
      cargoValue: String(money(15000 + ((index * 1129) % 420000))),
      status: itemAt(cteStatuses, index),
      issueDateTime: dateTimeValue(date, index, 8),
      createdAt: isoValue(date, index),
      collectionOrderId: orders[index % orders.length].id,
      minutaId: minutas[index % minutas.length].id,
      insuranceCompany: insurance.companyName,
      insurancePolicy: insurance.policyNumber,
      vehiclePlate: vehicle.plate,
      vehicleModel: vehicle.model,
      driverCpf: driver.cpf,
      driverName: driver.name,
      senderName: suppliers[index % suppliers.length].name,
      recipientName: suppliers[(index + 13) % suppliers.length].name,
    };
  });
}

function buildManifests(drivers, vehicles, insurances, ctes, minutas) {
  return Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 9);
    const driver = drivers[index % drivers.length];
    const vehicle = vehicles[index % vehicles.length];
    const insurance = insurances[index % insurances.length];
    const selectedCteIds = [
      ctes[index % ctes.length].id,
      ctes[(index + 1) % ctes.length].id,
    ];
    const status = itemAt(manifestStatuses, index);
    const closedAt = status === 'Fechado' ? dateTimeValue(addDays(date, (index % 3) + 1), index, 18) : '';

    return {
      id: `MDFE-TEST-${pad(index + 1, 5)}`,
      unit: itemAt(businessUnits, index).value,
      manifestType: index % 4 === 0 ? controlManifestType : transitManifestType,
      selectedCteIds,
      minutaId: minutas[index % minutas.length].id,
      origin: itemAt(cityOptions, index),
      destination: itemAt(cityOptions, index + 9),
      truckPlate: vehicle.plate,
      truckModel: vehicle.model,
      driverCpf: formatCpf(driver.cpf),
      driverName: driver.name,
      cargoWeight: String(3600 + ((index * 211) % 42000)),
      cargoValue: String(money(28000 + ((index * 1327) % 580000))),
      hasInsurance: index % 11 === 0 ? 'Nao' : 'Sim',
      insuranceCompany: index % 11 === 0 ? '' : insurance.companyName,
      insurancePolicy: index % 11 === 0 ? '' : insurance.policyNumber,
      startedAt: dateTimeValue(date, index, 9),
      closedAt,
      createdAt: dateTimeValue(date, index, 8),
      updatedAt: closedAt || dateTimeValue(date, index, 19),
      status,
    };
  });
}

function buildFinanceLaunches(drivers, suppliers, ctes, minutas, manifests) {
  const payableLaunches = Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 12);
    const supplier = suppliers[index % suppliers.length];
    const driver = drivers[index % drivers.length];
    const type = itemAt(accountingTypes, index).name;
    const status = index % 3 === 0 ? 'Baixado' : 'Aberto';
    const amount = money(180 + ((index * 71) % 14800) + ((index % 4) * 0.35));
    const paymentDate = status === 'Baixado' ? dateValue(addDays(date, Math.min(index % 5, 2))) : '';
    const finalAmount = status === 'Baixado' ? money(amount + (index % 7 === 0 ? 12.5 : 0) - (index % 9 === 0 ? 8 : 0)) : 0;

    return {
      id: `CAP-TEST-${pad(index + 1, 5)}`,
      unit: itemAt(businessUnits, index).value,
      supplier: supplier.name,
      supplierCode: supplier.id,
      type,
      accountingTypeCode: itemAt(accountingTypes, index).code,
      document: index % 3 === 0
        ? ctes[index % ctes.length].id
        : index % 3 === 1
          ? minutas[index % minutas.length].id
          : manifests[index % manifests.length].id,
      chargeType: itemAt(chargeTypes, index),
      paymentBank: status === 'Baixado' ? itemAt(paymentBanks, index) : '',
      issueDate: dateValue(date),
      dueDate: dateValue(addDays(date, (index % 15) + 1)),
      createdDate: dateValue(date),
      createdAt: isoValue(date, index),
      paymentDate,
      appropriationDate: dateValue(date),
      paymentForecastDate: dateValue(addDays(date, (index % 15) + 1)),
      amount,
      interestAmount: status === 'Baixado' && index % 7 === 0 ? 12.5 : 0,
      discountAmount: status === 'Baixado' && index % 9 === 0 ? 8 : 0,
      finalAmount,
      status,
      notes: `Lancamento teste vinculado ao motorista ${driver.name}.`,
      settlementNote: status === 'Baixado' ? 'Baixa de teste gerada automaticamente.' : '',
      installments: [
        {
          number: 1,
          dueDate: dateValue(addDays(date, (index % 15) + 1)),
          value: amount.toFixed(2),
        },
      ],
      attachments: [],
    };
  });

  const settlementLaunches = Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 16);
    const supplier = suppliers[index % suppliers.length];
    const amount = money(220 + ((index * 43) % 4200));

    return {
      id: `CAP-PC-TEST-${pad(index + 1, 5)}`,
      unit: itemAt(businessUnits, index).value,
      supplier: supplier.name,
      supplierCode: supplier.id,
      type: settlementBalanceAccountingType,
      accountingTypeCode: '07',
      document: `PC-TEST-${pad(index + 1, 5)}`,
      chargeType: 'Pix',
      paymentBank: '',
      issueDate: dateValue(date),
      dueDate: dateValue(addDays(date, 7)),
      createdDate: dateValue(date),
      createdAt: isoValue(date, index),
      paymentDate: '',
      appropriationDate: dateValue(date),
      paymentForecastDate: dateValue(addDays(date, 7)),
      amount,
      interestAmount: 0,
      discountAmount: 0,
      finalAmount: 0,
      status: 'Aberto',
      notes: `Saldo de prestacao de conta PC-TEST-${pad(index + 1, 5)}.`,
      installments: [
        {
          number: 1,
          dueDate: dateValue(addDays(date, 7)),
          value: amount.toFixed(2),
        },
      ],
      quantity: 1,
      attachments: [],
      driverSettlementId: `PC-TEST-${pad(index + 1, 5)}`,
      settlementBalance: amount,
      settlementDebtor: index % 2 === 0 ? 'Motorista' : 'Empresa',
    };
  });

  return [...payableLaunches, ...settlementLaunches];
}

function buildReceivables(suppliers, ctes, orders, minutas, manifests) {
  return Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 18);
    const customer = suppliers[(index + 31) % suppliers.length];
    const freightValue = money(950 + ((index * 61) % 8200));
    const additionValue = money(index % 5 === 0 ? 120 : 0);
    const tollValue = money(40 + (index % 9) * 18);
    const insuranceValue = money(index % 11 === 0 ? 0 : 75 + (index % 6) * 12);
    const pickupFee = money(index % 4 === 0 ? 85 : 0);
    const deliveryFee = money(index % 6 === 0 ? 95 : 0);
    const discountValue = money(index % 8 === 0 ? 50 : 0);
    const originalValue = money(freightValue + additionValue + tollValue + insuranceValue + pickupFee + deliveryFee - discountValue);
    const paidValue = index % 4 === 0 ? originalValue : index % 4 === 1 ? money(originalValue / 2) : 0;
    const openBalance = money(Math.max(0, originalValue - paidValue));
    const paymentForecastDate = dateValue(addDays(date, (index % 20) + 5));
    const status = paidValue >= originalValue
      ? 'Recebido'
      : paidValue > 0
        ? 'Parcial'
        : index % 7 === 0
          ? 'Vencido'
          : 'Aberto';

    return {
      id: `CR-TEST-${pad(index + 1, 5)}`,
      customerName: customer.name,
      customerDocument: customer.cnpj,
      address: customer.address,
      paymentForecastDate,
      cteId: ctes[index % ctes.length].id,
      nfeNumber: `NF-TEST-${pad(index + 1, 5)}`,
      mdfeId: manifests[index % manifests.length].id,
      minutaId: minutas[index % minutas.length].id,
      collectionOrderId: orders[index % orders.length].id,
      deliveryProof: index % 3 === 0 ? 'Canhoto digital anexado' : 'Entrega em acompanhamento',
      freightValue: freightValue.toFixed(2),
      discountValue: discountValue.toFixed(2),
      additionValue: additionValue.toFixed(2),
      tollValue: tollValue.toFixed(2),
      insuranceValue: insuranceValue.toFixed(2),
      pickupFee: pickupFee.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      originalValue: originalValue.toFixed(2),
      paidValue: paidValue.toFixed(2),
      openBalance: openBalance.toFixed(2),
      issueDate: dateValue(date),
      createdDate: dateValue(date),
      dueTermDays: (index % 20) + 5,
      status,
      settlements: paidValue > 0
        ? [{
            id: `REC-SET-TEST-${pad(index + 1, 5)}`,
            date: dateValue(addDays(date, 2)),
            amount: paidValue.toFixed(2),
            bank: itemAt(paymentBanks, index),
            method: itemAt(['Pix', 'Boleto', 'Transferencia', 'Dinheiro'], index),
            note: 'Baixa gerada pela massa de teste.',
          }]
        : [],
    };
  });
}

function buildDriverSettlements(drivers, suppliers, manifests, financeLaunchesList) {
  return Array.from({ length: mainRecordCount }, (_, index) => {
    const date = periodDate(index + 20);
    const driver = drivers[index % drivers.length];
    const supplier = suppliers[index % suppliers.length];
    const manifest = manifests[index % manifests.length];
    const financeLaunch = financeLaunchesList.find((launch) => launch.id === `CAP-TEST-${pad(index + 1, 5)}`) || financeLaunchesList[index % financeLaunchesList.length];
    const days = (index % 5) + 1;
    const dailyRate = defaultDriverDailyRate + (index % 4) * 10;
    const totalDailyAmount = money(days * dailyRate);
    const totalReceivedFromFinance = money(financeLaunch.finalAmount || financeLaunch.amount || 0);
    const totalAdjustments = money(index % 6 === 0 ? 75 : 0);
    const totalReceived = money(totalReceivedFromFinance + totalAdjustments);
    const balance = money(totalReceived - totalDailyAmount);
    const kmStart = 20000 + (index * 87);
    const kmEnd = kmStart + 350 + ((index * 23) % 1800);
    const settlementId = `PC-TEST-${pad(index + 1, 5)}`;

    const reportManifest = {
      ...manifest,
      startDateTime: manifest.startedAt || manifest.createdAt,
      endDateTime: manifest.closedAt || dateTimeValue(addDays(date, days), index, 18),
      days,
      dailyRate,
      dailyTotal: totalDailyAmount,
    };
    const reportLaunch = {
      ...financeLaunch,
      eventDate: financeLaunch.paymentDate || financeLaunch.createdDate || financeLaunch.issueDate,
      amount: totalReceivedFromFinance,
      reportAmount: -Math.abs(totalReceivedFromFinance),
      considered: true,
    };

    return {
      id: settlementId,
      status: index % 13 === 0 ? 'Reaberta' : 'Fechada',
      driverCpf: driver.cpf,
      driverName: driver.name,
      supplierCode: supplier.id,
      supplierLabel: `${supplier.id} - ${supplier.name} - ${supplier.cnpj}`,
      dailyRate,
      kmStart: String(kmStart),
      kmEnd: String(kmEnd),
      dueDate: dateValue(addDays(date, 7)),
      closedAt: isoValue(date, index, 19),
      updatedAt: isoValue(date, index, 20),
      createdAt: isoValue(date, index, 18),
      payableLaunchId: `CAP-PC-TEST-${pad(index + 1, 5)}`,
      adjustments: totalAdjustments
        ? [{
            id: `ADJ-TEST-${pad(index + 1, 5)}`,
            name: 'Ajuste avulso teste',
            amount: totalAdjustments,
            accountingTypeCode: '05',
            accountingType: 'Administrativo',
          }]
        : [],
      excludedFinancialMovementIds: [],
      report: {
        id: settlementId,
        generatedAt: isoValue(date, index, 20),
        dueDate: dateValue(addDays(date, 7)),
        driver: {
          cpf: driver.cpf,
          name: driver.name,
          supplierCode: supplier.id,
          supplierLabel: `${supplier.id} - ${supplier.name} - ${supplier.cnpj}`,
        },
        supplier,
        periodStart: isoValue(addDays(date, -5), index),
        periodEnd: isoValue(date, index, 20),
        lastSettlementId: '',
        dailyRate,
        kmStart: String(kmStart),
        kmEnd: String(kmEnd),
        kmDistance: kmEnd - kmStart,
        averageKmPerDay: money((kmEnd - kmStart) / days),
        financialMovements: [reportLaunch],
        consideredFinancialMovements: [reportLaunch],
        excludedFinancialMovementIds: [],
        openPayableLaunches: [],
        adjustments: totalAdjustments
          ? [{
              id: `ADJ-TEST-${pad(index + 1, 5)}`,
              name: 'Ajuste avulso teste',
              amount: totalAdjustments,
              accountingTypeCode: '05',
              accountingType: 'Administrativo',
            }]
          : [],
        manifests: [reportManifest],
        totals: {
          totalReceivedFromFinance,
          totalAdjustments,
          totalReceived,
          totalDays: days,
          totalDailyAmount,
          balance,
        },
        debtor: balance > 0 ? 'Motorista' : balance < 0 ? 'Empresa' : 'Quitado',
        expensePieData: [{ label: financeLaunch.type || 'Sem tipo', value: totalReceivedFromFinance }],
      },
    };
  });
}

function buildWarehouseCargo(suppliers) {
  const sectors = blueprintSectors.length ? blueprintSectors.map((sector) => sector.id) : ['H4'];

  return Array.from({ length: mainRecordCount }, (_, index) => ({
    id: `cargo-test-${pad(index + 1, 5)}`,
    sectorId: itemAt(sectors, index),
    invoice: `NF-WH-TEST-${pad(index + 1, 5)}`,
    description: `${itemAt(cargoTypes, index)} armazenagem teste`,
    customer: suppliers[index % suppliers.length].name,
    quantity: (index % 12) + 1,
    weight: money(0.5 + ((index * 13) % 280) / 10),
    status: itemAt(warehouseStatuses, index),
  }));
}

function setSequenceValues() {
  const sequenceValues = {
    cteSequence: mainRecordCount + 100,
    collectionOrderSequence: mainRecordCount + 100,
    minutaSequence: mainRecordCount + 100,
    manifestSequence: mainRecordCount + 100,
    accountsReceivableSequence: mainRecordCount + 100,
    driverSettlementSequence: mainRecordCount + 100,
    'financeSequence:CAP': (mainRecordCount * 2) + 100,
    'financeSequence:PAV': mainRecordCount + 100,
  };

  Object.entries(sequenceValues).forEach(([key, value]) => {
    window.localStorage.setItem(key, String(value));
  });
}

function dispatchSeedEvents() {
  window.dispatchEvent(new CustomEvent(financeLaunchesUpdatedEventName));
  window.dispatchEvent(new Event('storage'));
}

export function seedSystemTestData({ force = false } = {}) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { seeded: false, reason: 'storage-unavailable' };
  }

  if (!force && window.localStorage.getItem(seedVersionKey) === seedVersion) {
    return { seeded: false, reason: 'already-seeded' };
  }

  const suppliers = buildSuppliers();
  const insurances = buildInsurances();
  const banks = buildBanks();
  const drivers = buildDrivers(suppliers);
  const vehicles = buildVehicles(suppliers);
  const collectionOrders = buildCollectionOrders(drivers, vehicles, suppliers);
  const minutas = buildMinutas(drivers, vehicles, suppliers, collectionOrders);
  const ctes = buildCtes(drivers, vehicles, suppliers, insurances, collectionOrders, minutas);
  const manifests = buildManifests(drivers, vehicles, insurances, ctes, minutas);
  const financeRecords = buildFinanceLaunches(drivers, suppliers, ctes, minutas, manifests);
  const receivables = buildReceivables(suppliers, ctes, collectionOrders, minutas, manifests);
  const settlements = buildDriverSettlements(drivers, suppliers, manifests, financeRecords);
  const warehouseCargo = buildWarehouseCargo(suppliers);

  const summary = {
    units: writeMergedRecords(unitStorageKey, defaultUnits, buildUnits(), (unit) => unit.id || unit.code),
    suppliers: writeMergedRecords(supplierStorageKey, defaultSuppliers, suppliers, (supplier) => supplier.id || supplier.code || supplier.cnpj),
    insurances: writeMergedRecords(insuranceStorageKey, defaultInsurances, insurances, (insurance) => insurance.id || insurance.policyNumber),
    banks: writeMergedRecords(bankStorageKey, defaultBanks, banks, (bank) => bank.id),
    drivers: writeMergedRecords(driverStorageKey, defaultDrivers, drivers, (driver) => driver.cpf),
    vehicles: writeMergedRecords(vehicleStorageKey, defaultVehicles, vehicles, (vehicle) => vehicle.plate),
    collectionOrders: writeMergedRecords(collectionOrderStorageKey, defaultCollectionOrders, collectionOrders, (order) => order.id),
    minutas: writeMergedRecords(minutaStorageKey, defaultMinutas, minutas, (minuta) => minuta.id),
    ctes: writeMergedRecords(cteStorageKey, defaultCtes, ctes, (cte) => cte.id),
    manifests: writeMergedRecords(manifestStorageKey, defaultManifests, manifests, (manifest) => manifest.id),
    financeLaunches: writeMergedRecords(financeLaunchStorageKey, financeLaunches, financeRecords, (launch) => launch.id),
    receivables: writeMergedRecords(receivableStorageKey, defaultReceivables, receivables, (receivable) => receivable.id),
    driverSettlements: writeMergedRecords(driverSettlementStorageKey, [], settlements, (settlement) => settlement.id),
    warehouseCargo: writeMergedRecords(warehouseCargoStorageKey, [], warehouseCargo, (item) => item.id),
    warehouseWeightSettings: writeJsonStorage(warehouseWeightSettingsStorageKey, createVariedWarehouseWeightSettings(warehouseCargo)),
  };

  setSequenceValues();
  window.localStorage.setItem(seedVersionKey, seedVersion);
  dispatchSeedEvents();

  return {
    seeded: true,
    version: seedVersion,
    summary,
  };
}

if (typeof window !== 'undefined') {
  window.populateErpTestData = (force = true) => seedSystemTestData({ force });
}
