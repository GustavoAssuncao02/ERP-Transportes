import { businessUnits, suppliers } from './financeData.js';
import { onlyDigits } from './transportRegistry.js';

export const unitStorageKey = 'managementUnits';
export const supplierStorageKey = 'managementSuppliers';

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
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return stored.length ? stored : fallback;
  } catch {
    return fallback;
  }
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
