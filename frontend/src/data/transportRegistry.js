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
  },
  {
    cpf: '39053344705',
    name: 'Marcos Vinícius Almeida',
    phone: '(71) 97777-2200',
    cnh: '03459876543',
    category: 'E',
    status: 'Ativo',
  },
  {
    cpf: '11144477735',
    name: 'Carlos Eduardo Rocha',
    phone: '(75) 96666-3300',
    cnh: '05671239845',
    category: 'D',
    status: 'Ativo',
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
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return stored.length ? stored : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredRecords(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
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

  return getRegisteredVehicles().find((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate) || null;
}

export function findDriverByCpf(cpf) {
  const digits = onlyDigits(cpf);
  if (digits.length < 11) return null;

  return getRegisteredDrivers().find((driver) => onlyDigits(driver.cpf) === digits) || null;
}

export function saveVehicle(record) {
  const normalizedPlate = normalizePlate(record.plate);
  const vehicles = getRegisteredVehicles();
  const nextRecord = { ...record, plate: normalizedPlate };
  const existingIndex = vehicles.findIndex((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate);

  if (existingIndex >= 0) {
    vehicles[existingIndex] = nextRecord;
  } else {
    vehicles.push(nextRecord);
  }

  writeStoredRecords(vehicleStorageKey, vehicles);
  return vehicles;
}

export function saveDriver(record) {
  const normalizedCpf = onlyDigits(record.cpf);
  const drivers = getRegisteredDrivers();
  const nextRecord = { ...record, cpf: normalizedCpf };
  const existingIndex = drivers.findIndex((driver) => onlyDigits(driver.cpf) === normalizedCpf);

  if (existingIndex >= 0) {
    drivers[existingIndex] = nextRecord;
  } else {
    drivers.push(nextRecord);
  }

  writeStoredRecords(driverStorageKey, drivers);
  return drivers;
}
