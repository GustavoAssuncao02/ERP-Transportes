import { businessUnits, suppliers } from './financeData.js';
import { onlyDigits } from './transportRegistry.js';

export const unitStorageKey = 'managementUnits';
export const supplierStorageKey = 'managementSuppliers';
export const insuranceStorageKey = 'managementInsurances';

export const defaultUnits = businessUnits.map((unit) => ({
  id: unit.code,
  name: unit.name,
  cnpj: unit.code === '001' ? '12.345.678/0001-90' : unit.code === '002' ? '56.789.012/0001-44' : '78.901.234/0001-66',
  description: unit.code === '001' ? 'Matriz operacional de transportes' : 'Unidade operacional regional',
  address: unit.code === '001' ? 'Av. Tancredo Neves, 1000 - Salvador - BA' : 'Endereço comercial cadastrado',
  active: true,
  cnae: '4930-2/02',
}));

export const defaultSuppliers = suppliers.map((supplier) => ({
  id: supplier.code,
  name: supplier.name,
  cnpj: supplier.cnpj,
  contact: '',
  email: '',
  address: '',
  active: true,
}));

export const defaultInsurances = [
  {
    id: 'INS-001',
    companyName: 'Seguradora Atlantica',
    cnpj: '34.567.890/0001-22',
    policyNumber: 'AP-2026-00184',
    endorsementNumber: '',
    contact: '',
    active: true,
    defaultInsurance: true,
  },
];

export function formatCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 8);
  const branch = digits.slice(8, 12);
  const last = digits.slice(12, 14);

  if (digits.length > 12) return `${first}.${second}.${third}/${branch}-${last}`;
  if (digits.length > 8) return `${first}.${second}.${third}/${branch}`;
  if (digits.length > 5) return `${first}.${second}.${third}`;
  if (digits.length > 2) return `${first}.${second}`;
  return first;
}

function readRecords(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue !== null) {
      const stored = JSON.parse(rawValue);
      return Array.isArray(stored) ? stored : fallback;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function writeRecords(key, records) {
  localStorage.setItem(key, JSON.stringify(records));
}

export function getRegisteredUnits() {
  return readRecords(unitStorageKey, defaultUnits);
}

export function getRegisteredSuppliers() {
  return readRecords(supplierStorageKey, defaultSuppliers);
}

export function getRegisteredInsurances() {
  return readRecords(insuranceStorageKey, defaultInsurances);
}

export function getDefaultInsurance() {
  return getRegisteredInsurances().find((insurance) => insurance.active && insurance.defaultInsurance)
    || getRegisteredInsurances().find((insurance) => insurance.active)
    || null;
}

export function saveUnit(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const units = getRegisteredUnits();
  const existingIndex = units.findIndex((unit) => onlyDigits(unit.cnpj) === cnpjDigits);
  const nextRecord = {
    ...record,
    id: record.id || String(units.length + 1).padStart(3, '0'),
    cnpj: formatCnpj(record.cnpj),
  };

  if (existingIndex >= 0) {
    units[existingIndex] = nextRecord;
  } else {
    units.push(nextRecord);
  }

  writeRecords(unitStorageKey, units);
  return units;
}

export function saveSupplier(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const suppliersList = getRegisteredSuppliers();
  const existingIndex = suppliersList.findIndex((supplier) => onlyDigits(supplier.cnpj) === cnpjDigits);
  const nextRecord = {
    ...record,
    id: record.id || String(1000 + suppliersList.length + 1),
    cnpj: formatCnpj(record.cnpj),
  };

  if (existingIndex >= 0) {
    suppliersList[existingIndex] = nextRecord;
  } else {
    suppliersList.push(nextRecord);
  }

  writeRecords(supplierStorageKey, suppliersList);
  return suppliersList;
}

export function saveInsurance(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const insurances = getRegisteredInsurances();
  const existingIndex = insurances.findIndex((insurance) => (
    insurance.id === record.id
    || (
      cnpjDigits
      && onlyDigits(insurance.cnpj) === cnpjDigits
      && String(insurance.policyNumber || '').trim() === String(record.policyNumber || '').trim()
    )
  ));
  const nextRecord = {
    ...record,
    id: record.id || `INS-${String(insurances.length + 1).padStart(3, '0')}`,
    cnpj: formatCnpj(record.cnpj),
    active: record.active !== false,
    defaultInsurance: Boolean(record.defaultInsurance),
  };
  const nextInsurances = insurances.map((insurance, index) => {
    if (existingIndex >= 0 && index === existingIndex) {
      return nextRecord;
    }

    return nextRecord.defaultInsurance ? { ...insurance, defaultInsurance: false } : insurance;
  });

  if (existingIndex < 0) {
    nextInsurances.push(nextRecord);
  }

  if (!nextInsurances.some((insurance) => insurance.active && insurance.defaultInsurance)) {
    const fallbackIndex = nextInsurances.findIndex((insurance) => insurance.active);
    if (fallbackIndex >= 0) {
      nextInsurances[fallbackIndex] = { ...nextInsurances[fallbackIndex], defaultInsurance: true };
    }
  }

  writeRecords(insuranceStorageKey, nextInsurances);
  return nextInsurances;
}

export function deleteUnit(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const units = getRegisteredUnits();
  const nextUnits = units.filter((unit) => unit.id !== record.id && onlyDigits(unit.cnpj) !== cnpjDigits);

  writeRecords(unitStorageKey, nextUnits);
  return nextUnits;
}

export function deactivateUnit(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const units = getRegisteredUnits();
  const nextUnits = units.map((unit) => (
    unit.id === record.id || onlyDigits(unit.cnpj) === cnpjDigits ? { ...unit, active: false } : unit
  ));

  writeRecords(unitStorageKey, nextUnits);
  return nextUnits;
}

export function deleteSupplier(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const suppliersList = getRegisteredSuppliers();
  const nextSuppliers = suppliersList.filter((supplier) => supplier.id !== record.id && onlyDigits(supplier.cnpj) !== cnpjDigits);

  writeRecords(supplierStorageKey, nextSuppliers);
  return nextSuppliers;
}

export function deactivateSupplier(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const suppliersList = getRegisteredSuppliers();
  const nextSuppliers = suppliersList.map((supplier) => (
    supplier.id === record.id || onlyDigits(supplier.cnpj) === cnpjDigits ? { ...supplier, active: false } : supplier
  ));

  writeRecords(supplierStorageKey, nextSuppliers);
  return nextSuppliers;
}

export function deleteInsurance(record) {
  const insurances = getRegisteredInsurances();
  const nextInsurances = insurances.filter((insurance) => insurance.id !== record.id);

  if (!nextInsurances.some((insurance) => insurance.active && insurance.defaultInsurance)) {
    const fallbackIndex = nextInsurances.findIndex((insurance) => insurance.active);
    if (fallbackIndex >= 0) {
      nextInsurances[fallbackIndex] = { ...nextInsurances[fallbackIndex], defaultInsurance: true };
    }
  }

  writeRecords(insuranceStorageKey, nextInsurances);
  return nextInsurances;
}

export function deactivateInsurance(record) {
  const insurances = getRegisteredInsurances();
  const nextInsurances = insurances.map((insurance) => (
    insurance.id === record.id ? { ...insurance, active: false, defaultInsurance: false } : insurance
  ));

  if (!nextInsurances.some((insurance) => insurance.active && insurance.defaultInsurance)) {
    const fallbackIndex = nextInsurances.findIndex((insurance) => insurance.active);
    if (fallbackIndex >= 0) {
      nextInsurances[fallbackIndex] = { ...nextInsurances[fallbackIndex], defaultInsurance: true };
    }
  }

  writeRecords(insuranceStorageKey, nextInsurances);
  return nextInsurances;
}
