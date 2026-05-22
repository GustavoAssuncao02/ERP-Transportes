import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const vehicleStorageKey = 'transportVehicles';
export const driverStorageKey = 'transportDrivers';
export const pendingVehiclePlateKey = 'pendingVehiclePlate';
export const pendingDriverCpfKey = 'pendingDriverCpf';

export const defaultVehicles = [
  {
    plate: 'ABC1D23',
    model: 'Volvo FH 540',
    type: 'Cavalo mecânico',
    unit: '001',
    ownerType: 'company',
    owner: 'JTD Transportes LTDA',
    ownerCpf: '',
    status: 'Ativo',
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    plate: 'JTD4A56',
    model: 'Scania R 450',
    type: 'Cavalo mecânico',
    unit: '002',
    ownerType: 'company',
    owner: 'JTD Logística Nordeste',
    ownerCpf: '',
    status: 'Ativo',
    createdAt: '2026-05-02T08:00:00.000Z',
  },
  {
    plate: 'LOG8B91',
    model: 'Mercedes-Benz Actros 2651',
    type: 'Truck',
    unit: '003',
    ownerType: 'company',
    owner: 'JTD Armazéns Salvador',
    ownerCpf: '',
    status: 'Ativo',
    createdAt: '2026-05-03T08:00:00.000Z',
  },
];

export const defaultDrivers = [
  {
    cpf: '52998224725',
    name: 'João Pereira Santos',
    phone: '(71) 98888-1100',
    cnh: '04781234567',
    category: 'E',
    status: 'Ativo',
    state: 'BA',
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    cpf: '39053344705',
    name: 'Marcos Vinícius Almeida',
    phone: '(71) 97777-2200',
    cnh: '03459876543',
    category: 'E',
    status: 'Ativo',
    state: 'BA',
    createdAt: '2026-05-02T08:00:00.000Z',
  },
  {
    cpf: '11144477735',
    name: 'Carlos Eduardo Rocha',
    phone: '(75) 96666-3300',
    cnh: '05671239845',
    category: 'D',
    status: 'Ativo',
    state: 'BA',
    createdAt: '2026-05-03T08:00:00.000Z',
  },
];

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizePlate(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7);
}

export function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  const first = digits.slice(0, 3);
  const second = digits.slice(3, 6);
  const third = digits.slice(6, 9);
  const last = digits.slice(9, 11);

  if (digits.length > 9) return `${first}.${second}.${third}-${last}`;
  if (digits.length > 6) return `${first}.${second}.${third}`;
  if (digits.length > 3) return `${first}.${second}`;
  return first;
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (sliceLength) => {
    const sum = cpf
      .slice(0, sliceLength)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (sliceLength + 1 - index), 0);
    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function readStoredRecords(key, fallback) {
  return readJsonStorage(key, fallback, {
    validate: Array.isArray,
  });
}

function writeStoredRecords(key, records) {
  writeJsonStorage(key, records);
}

function recordTransportAudit({ action, entityType, entityId, entityLabel, before, after, summary }) {
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

const vehicleByPlateCache = new WeakMap();
const driverByCpfCache = new WeakMap();

function getVehicleByPlateMap(vehicles) {
  if (vehicleByPlateCache.has(vehicles)) {
    return vehicleByPlateCache.get(vehicles);
  }

  const vehicleMap = new Map(vehicles.map((vehicle) => [normalizePlate(vehicle.plate), vehicle]));
  vehicleByPlateCache.set(vehicles, vehicleMap);
  return vehicleMap;
}

function getDriverByCpfMap(drivers) {
  if (driverByCpfCache.has(drivers)) {
    return driverByCpfCache.get(drivers);
  }

  const driverMap = new Map(drivers.map((driver) => [onlyDigits(driver.cpf), driver]));
  driverByCpfCache.set(drivers, driverMap);
  return driverMap;
}

export function getRegisteredVehicles() {
  return readStoredRecords(vehicleStorageKey, defaultVehicles);
}

export function getRegisteredDrivers() {
  return readStoredRecords(driverStorageKey, defaultDrivers);
}

export function findVehicleByPlate(plate) {
  const normalizedPlate = normalizePlate(plate);
  if (!normalizedPlate) return null;

  return getVehicleByPlateMap(getRegisteredVehicles()).get(normalizedPlate) || null;
}

export function findDriverByCpf(cpf) {
  const digits = onlyDigits(cpf);
  if (digits.length < 11) return null;

  return getDriverByCpfMap(getRegisteredDrivers()).get(digits) || null;
}

export function saveVehicle(record) {
  const normalizedPlate = normalizePlate(record.plate);
  const vehicles = [...getRegisteredVehicles()];
  const existingIndex = vehicles.findIndex((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate);
  const previousRecord = existingIndex >= 0 ? vehicles[existingIndex] : null;
  const now = new Date().toISOString();
  const nextRecord = {
    ...record,
    plate: normalizedPlate,
    createdAt: previousRecord?.createdAt || record.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    vehicles[existingIndex] = nextRecord;
  } else {
    vehicles.push(nextRecord);
  }

  writeStoredRecords(vehicleStorageKey, vehicles);
  recordTransportAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'veiculo',
    entityId: nextRecord.plate,
    entityLabel: nextRecord.model,
    before: previousRecord,
    after: nextRecord,
    summary: previousRecord ? 'Veiculo atualizado' : 'Veiculo cadastrado',
  });
  return vehicles;
}

export function saveDriver(record) {
  const normalizedCpf = onlyDigits(record.cpf);
  const drivers = [...getRegisteredDrivers()];
  const existingIndex = drivers.findIndex((driver) => onlyDigits(driver.cpf) === normalizedCpf);
  const previousRecord = existingIndex >= 0 ? drivers[existingIndex] : null;
  const now = new Date().toISOString();
  const nextRecord = {
    ...record,
    cpf: normalizedCpf,
    createdAt: previousRecord?.createdAt || record.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    drivers[existingIndex] = nextRecord;
  } else {
    drivers.push(nextRecord);
  }

  writeStoredRecords(driverStorageKey, drivers);
  recordTransportAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'motorista',
    entityId: nextRecord.cpf,
    entityLabel: nextRecord.name,
    before: previousRecord,
    after: nextRecord,
    summary: previousRecord ? 'Motorista atualizado' : 'Motorista cadastrado',
  });
  return drivers;
}

export function deleteVehicle(plate) {
  const normalizedPlate = normalizePlate(plate);
  const vehicles = getRegisteredVehicles();
  const previousRecord = vehicles.find((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate) || { plate: normalizedPlate };
  const nextVehicles = vehicles.filter((vehicle) => normalizePlate(vehicle.plate) !== normalizedPlate);

  writeStoredRecords(vehicleStorageKey, nextVehicles);
  recordTransportAudit({
    action: auditActions.delete,
    entityType: 'veiculo',
    entityId: previousRecord.plate,
    entityLabel: previousRecord.model,
    before: previousRecord,
    after: null,
    summary: 'Veiculo excluido',
  });
  return nextVehicles;
}

export function deactivateVehicle(plate) {
  const normalizedPlate = normalizePlate(plate);
  const vehicles = getRegisteredVehicles();
  const previousRecord = vehicles.find((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate) || { plate: normalizedPlate };
  const nextVehicles = vehicles.map((vehicle) => (
    normalizePlate(vehicle.plate) === normalizedPlate ? { ...vehicle, status: 'Inativo' } : vehicle
  ));

  writeStoredRecords(vehicleStorageKey, nextVehicles);
  recordTransportAudit({
    action: auditActions.deactivate,
    entityType: 'veiculo',
    entityId: previousRecord.plate,
    entityLabel: previousRecord.model,
    before: previousRecord,
    after: nextVehicles.find((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate) || null,
    summary: 'Veiculo inativado',
  });
  return nextVehicles;
}

export function deleteDriver(cpf) {
  const normalizedCpf = onlyDigits(cpf);
  const drivers = getRegisteredDrivers();
  const previousRecord = drivers.find((driver) => onlyDigits(driver.cpf) === normalizedCpf) || { cpf: normalizedCpf };
  const nextDrivers = drivers.filter((driver) => onlyDigits(driver.cpf) !== normalizedCpf);

  writeStoredRecords(driverStorageKey, nextDrivers);
  recordTransportAudit({
    action: auditActions.delete,
    entityType: 'motorista',
    entityId: previousRecord.cpf,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: null,
    summary: 'Motorista excluido',
  });
  return nextDrivers;
}

export function deactivateDriver(cpf) {
  const normalizedCpf = onlyDigits(cpf);
  const drivers = getRegisteredDrivers();
  const previousRecord = drivers.find((driver) => onlyDigits(driver.cpf) === normalizedCpf) || { cpf: normalizedCpf };
  const nextDrivers = drivers.map((driver) => (
    onlyDigits(driver.cpf) === normalizedCpf ? { ...driver, status: 'Inativo' } : driver
  ));

  writeStoredRecords(driverStorageKey, nextDrivers);
  recordTransportAudit({
    action: auditActions.deactivate,
    entityType: 'motorista',
    entityId: previousRecord.cpf,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: nextDrivers.find((driver) => onlyDigits(driver.cpf) === normalizedCpf) || null,
    summary: 'Motorista inativado',
  });
  return nextDrivers;
}
