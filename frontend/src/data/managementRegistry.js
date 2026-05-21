import { businessUnits, suppliers } from './financeData.js';
import { onlyDigits } from './transportRegistry.js';
import { normalizeAddressFields } from '../utils/address.js';
import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const unitStorageKey = 'managementUnits';
export const supplierStorageKey = 'managementSuppliers';
export const insuranceStorageKey = 'managementInsurances';
export const bankStorageKey = 'treasuryBanks';

export const defaultUnits = businessUnits.map((unit) => normalizeAddressFields({
  id: unit.code,
  name: unit.name,
  cnpj: unit.code === '001' ? '12.345.678/0001-90' : unit.code === '002' ? '56.789.012/0001-44' : '78.901.234/0001-66',
  description: unit.code === '001' ? 'Matriz operacional de transportes' : 'Unidade operacional regional',
  address: unit.code === '001' ? 'Av. Tancredo Neves, 1000 - Salvador - BA' : 'Endereço comercial cadastrado',
  active: true,
  cnae: '4930-2/02',
}));

export const defaultSuppliers = suppliers.map((supplier) => normalizeAddressFields({
  id: supplier.code,
  name: supplier.name,
  cnpj: supplier.cnpj,
  contact: supplier.contact || '',
  email: supplier.email || '',
  zipCode: supplier.zipCode || '',
  street: supplier.street || '',
  addressNumber: supplier.addressNumber || '',
  district: supplier.district || '',
  address: supplier.address || '',
  active: true,
}));

const supplierEnrichmentFields = [
  'contact',
  'email',
  'zipCode',
  'street',
  'addressNumber',
  'district',
  'address',
];

function hasValue(value) {
  return String(value || '').trim().length > 0;
}

function findDefaultSupplier(record) {
  const recordCnpj = onlyDigits(record.cnpj);

  return defaultSuppliers.find((supplier) => (
    supplier.id === record.id
    || (recordCnpj && onlyDigits(supplier.cnpj) === recordCnpj)
  ));
}

function fillMissingSupplierDetails(record) {
  const normalizedRecord = normalizeAddressFields(record);
  const defaultSupplier = findDefaultSupplier(normalizedRecord);

  if (!defaultSupplier) {
    return normalizedRecord;
  }

  const enrichedRecord = supplierEnrichmentFields.reduce((nextRecord, field) => {
    if (!hasValue(nextRecord[field]) && hasValue(defaultSupplier[field])) {
      return { ...nextRecord, [field]: defaultSupplier[field] };
    }

    return nextRecord;
  }, normalizedRecord);

  return normalizeAddressFields(enrichedRecord);
}

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

export const defaultBanks = [
  { id: 'BCO-001', unit: '001', name: 'Banco do Brasil', agency: '0001-9', account: '12345-6', active: true },
  { id: 'BCO-002', unit: '001', name: 'Bradesco', agency: '0345-2', account: '98765-1', active: true },
  { id: 'BCO-003', unit: '001', name: 'Itau', agency: '1122', account: '45678-0', active: true },
  { id: 'BCO-004', unit: '002', name: 'Santander', agency: '2030', account: '77889-4', active: true },
  { id: 'BCO-005', unit: '002', name: 'Caixa Economica', agency: '1042', account: '003.00001234-5', active: true },
  { id: 'BCO-006', unit: '003', name: 'Sicoob', agency: '3025', account: '220015-8', active: true },
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

export function formatCpfCnpj(value) {
  const digits = onlyDigits(value);

  return digits.length <= 11 ? formatCpf(digits) : formatCnpj(digits);
}

function readRecords(key, fallback) {
  return readJsonStorage(key, fallback, {
    validate: Array.isArray,
  });
}

function writeRecords(key, records) {
  writeJsonStorage(key, records);
}

function recordManagementAudit({ action, entityType, entityId, entityLabel, before, after, summary }) {
  recordAuditEvent({
    module: 'Gestao',
    action,
    entityType,
    entityId,
    entityLabel,
    before,
    after,
    summary,
  });
}

export function getRegisteredUnits() {
  return readRecords(unitStorageKey, defaultUnits).map((unit) => normalizeAddressFields(unit));
}

export function getRegisteredSuppliers() {
  return readRecords(supplierStorageKey, defaultSuppliers).map((supplier) => fillMissingSupplierDetails(supplier));
}

export function getRegisteredInsurances() {
  return readRecords(insuranceStorageKey, defaultInsurances).map((insurance) => normalizeAddressFields(insurance));
}

export function getRegisteredBanks() {
  return readRecords(bankStorageKey, defaultBanks).map((bank, index) => ({
    id: bank.id || `BCO-${String(index + 1).padStart(3, '0')}`,
    unit: bank.unit || '001',
    name: bank.name || '',
    agency: bank.agency || '',
    account: bank.account || '',
    active: bank.active !== false,
  }));
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
  const previousRecord = existingIndex >= 0 ? units[existingIndex] : null;
  const nextRecord = normalizeAddressFields({
    ...record,
    id: record.id || String(units.length + 1).padStart(3, '0'),
    cnpj: formatCnpj(record.cnpj),
  });

  if (existingIndex >= 0) {
    units[existingIndex] = nextRecord;
  } else {
    units.push(nextRecord);
  }

  writeRecords(unitStorageKey, units);
  recordManagementAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'unidade',
    entityId: nextRecord.id,
    entityLabel: nextRecord.name,
    before: previousRecord,
    after: nextRecord,
    summary: previousRecord ? 'Unidade atualizada' : 'Unidade cadastrada',
  });
  return units;
}

export function saveSupplier(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const suppliersList = getRegisteredSuppliers();
  const existingIndex = suppliersList.findIndex((supplier) => onlyDigits(supplier.cnpj) === cnpjDigits);
  const previousRecord = existingIndex >= 0 ? suppliersList[existingIndex] : null;
  const nextRecord = normalizeAddressFields({
    ...record,
    id: record.id || String(1000 + suppliersList.length + 1),
    cnpj: formatCpfCnpj(record.cnpj),
  });

  if (existingIndex >= 0) {
    suppliersList[existingIndex] = nextRecord;
  } else {
    suppliersList.push(nextRecord);
  }

  writeRecords(supplierStorageKey, suppliersList);
  recordManagementAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'fornecedor',
    entityId: nextRecord.id,
    entityLabel: nextRecord.name,
    before: previousRecord,
    after: nextRecord,
    summary: previousRecord ? 'Fornecedor atualizado' : 'Fornecedor cadastrado',
  });
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
  const previousRecord = existingIndex >= 0 ? insurances[existingIndex] : null;
  const nextRecord = normalizeAddressFields({
    ...record,
    id: record.id || `INS-${String(insurances.length + 1).padStart(3, '0')}`,
    cnpj: formatCnpj(record.cnpj),
    active: record.active !== false,
    defaultInsurance: Boolean(record.defaultInsurance),
  });
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
  recordManagementAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'seguro',
    entityId: nextRecord.id,
    entityLabel: nextRecord.companyName || nextRecord.name,
    before: previousRecord,
    after: nextRecord,
    summary: previousRecord ? 'Seguro atualizado' : 'Seguro cadastrado',
  });
  return nextInsurances;
}

export function saveBank(record) {
  const banks = getRegisteredBanks();
  const existingIndex = banks.findIndex((bank) => bank.id === record.id);
  const previousRecord = existingIndex >= 0 ? banks[existingIndex] : null;
  const nextRecord = {
    ...record,
    id: record.id || `BCO-${String(banks.length + 1).padStart(3, '0')}`,
    unit: String(record.unit || '001').trim(),
    name: String(record.name || '').trim(),
    agency: String(record.agency || '').trim(),
    account: String(record.account || '').trim(),
    active: record.active !== false,
  };

  if (existingIndex >= 0) {
    banks[existingIndex] = nextRecord;
  } else {
    banks.push(nextRecord);
  }

  writeRecords(bankStorageKey, banks);
  recordManagementAudit({
    action: previousRecord ? auditActions.update : auditActions.create,
    entityType: 'banco',
    entityId: nextRecord.id,
    entityLabel: nextRecord.name,
    before: previousRecord,
    after: nextRecord,
    summary: previousRecord ? 'Banco atualizado' : 'Banco cadastrado',
  });
  return banks;
}

export function deleteBank(record) {
  const banks = getRegisteredBanks();
  const previousRecord = banks.find((bank) => bank.id === record.id) || record;
  const nextBanks = banks.filter((bank) => bank.id !== record.id);

  writeRecords(bankStorageKey, nextBanks);
  recordManagementAudit({
    action: auditActions.delete,
    entityType: 'banco',
    entityId: previousRecord.id,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: null,
    summary: 'Banco excluido',
  });
  return nextBanks;
}

export function deleteUnit(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const units = getRegisteredUnits();
  const previousRecord = units.find((unit) => unit.id === record.id || onlyDigits(unit.cnpj) === cnpjDigits) || record;
  const nextUnits = units.filter((unit) => unit.id !== record.id && onlyDigits(unit.cnpj) !== cnpjDigits);

  writeRecords(unitStorageKey, nextUnits);
  recordManagementAudit({
    action: auditActions.delete,
    entityType: 'unidade',
    entityId: previousRecord.id,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: null,
    summary: 'Unidade excluida',
  });
  return nextUnits;
}

export function deactivateUnit(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const units = getRegisteredUnits();
  const previousRecord = units.find((unit) => unit.id === record.id || onlyDigits(unit.cnpj) === cnpjDigits) || record;
  const nextUnits = units.map((unit) => (
    unit.id === record.id || onlyDigits(unit.cnpj) === cnpjDigits ? { ...unit, active: false } : unit
  ));

  writeRecords(unitStorageKey, nextUnits);
  recordManagementAudit({
    action: auditActions.deactivate,
    entityType: 'unidade',
    entityId: previousRecord.id,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: nextUnits.find((unit) => unit.id === previousRecord.id) || null,
    summary: 'Unidade inativada',
  });
  return nextUnits;
}

export function deleteSupplier(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const suppliersList = getRegisteredSuppliers();
  const previousRecord = suppliersList.find((supplier) => supplier.id === record.id || onlyDigits(supplier.cnpj) === cnpjDigits) || record;
  const nextSuppliers = suppliersList.filter((supplier) => supplier.id !== record.id && onlyDigits(supplier.cnpj) !== cnpjDigits);

  writeRecords(supplierStorageKey, nextSuppliers);
  recordManagementAudit({
    action: auditActions.delete,
    entityType: 'fornecedor',
    entityId: previousRecord.id,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: null,
    summary: 'Fornecedor excluido',
  });
  return nextSuppliers;
}

export function deactivateSupplier(record) {
  const cnpjDigits = onlyDigits(record.cnpj);
  const suppliersList = getRegisteredSuppliers();
  const previousRecord = suppliersList.find((supplier) => supplier.id === record.id || onlyDigits(supplier.cnpj) === cnpjDigits) || record;
  const nextSuppliers = suppliersList.map((supplier) => (
    supplier.id === record.id || onlyDigits(supplier.cnpj) === cnpjDigits ? { ...supplier, active: false } : supplier
  ));

  writeRecords(supplierStorageKey, nextSuppliers);
  recordManagementAudit({
    action: auditActions.deactivate,
    entityType: 'fornecedor',
    entityId: previousRecord.id,
    entityLabel: previousRecord.name,
    before: previousRecord,
    after: nextSuppliers.find((supplier) => supplier.id === previousRecord.id) || null,
    summary: 'Fornecedor inativado',
  });
  return nextSuppliers;
}

export function deleteInsurance(record) {
  const insurances = getRegisteredInsurances();
  const previousRecord = insurances.find((insurance) => insurance.id === record.id) || record;
  const nextInsurances = insurances.filter((insurance) => insurance.id !== record.id);

  if (!nextInsurances.some((insurance) => insurance.active && insurance.defaultInsurance)) {
    const fallbackIndex = nextInsurances.findIndex((insurance) => insurance.active);
    if (fallbackIndex >= 0) {
      nextInsurances[fallbackIndex] = { ...nextInsurances[fallbackIndex], defaultInsurance: true };
    }
  }

  writeRecords(insuranceStorageKey, nextInsurances);
  recordManagementAudit({
    action: auditActions.delete,
    entityType: 'seguro',
    entityId: previousRecord.id,
    entityLabel: previousRecord.companyName || previousRecord.name,
    before: previousRecord,
    after: null,
    summary: 'Seguro excluido',
  });
  return nextInsurances;
}

export function deactivateInsurance(record) {
  const insurances = getRegisteredInsurances();
  const previousRecord = insurances.find((insurance) => insurance.id === record.id) || record;
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
  recordManagementAudit({
    action: auditActions.deactivate,
    entityType: 'seguro',
    entityId: previousRecord.id,
    entityLabel: previousRecord.companyName || previousRecord.name,
    before: previousRecord,
    after: nextInsurances.find((insurance) => insurance.id === previousRecord.id) || null,
    summary: 'Seguro inativado',
  });
  return nextInsurances;
}
