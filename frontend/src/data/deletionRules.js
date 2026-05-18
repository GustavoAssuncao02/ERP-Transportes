import { businessUnits, financeLaunches, normalizeText } from './financeData.js';
import {
  getRegisteredCtes,
  getRegisteredCollectionOrders,
  getRegisteredManifests,
  getRegisteredMinutas,
} from './operationRegistry.js';
import { getRegisteredVehicles, normalizePlate, onlyDigits } from './transportRegistry.js';

function addBlocker(blockers, label, matched) {
  if (matched && !blockers.includes(label)) {
    blockers.push(label);
  }
}

function normalized(value) {
  return normalizeText(String(value || '').trim());
}

function matchesAny(value, candidates) {
  const nextValue = normalized(value);
  return Boolean(nextValue) && candidates.some((candidate) => normalized(candidate) === nextValue);
}

function getSupplierCandidates(supplier) {
  return [
    supplier.id,
    supplier.code,
    supplier.name,
    supplier.cnpj,
    onlyDigits(supplier.cnpj),
  ].filter(Boolean);
}

function getUnitCandidates(unit) {
  const matchingBusinessUnits = businessUnits.filter((businessUnit) => (
    businessUnit.value === unit.id
    || businessUnit.code === unit.id
    || businessUnit.name === unit.name
    || businessUnit.label === unit.name
  ));

  return [
    unit.id,
    unit.code,
    unit.value,
    unit.name,
    unit.cnpj,
    ...matchingBusinessUnits.flatMap((businessUnit) => [businessUnit.value, businessUnit.code, businessUnit.name, businessUnit.label]),
  ].filter(Boolean);
}

export function getSupplierDeletionBlockers(supplier) {
  const blockers = [];
  const candidates = getSupplierCandidates(supplier);

  addBlocker(blockers, 'lancamentos financeiros', financeLaunches.some((launch) => (
    matchesAny(launch.supplier, candidates) || matchesAny(launch.supplierCode, candidates)
  )));

  addBlocker(blockers, 'ordens de coleta', getRegisteredCollectionOrders().some((order) => (
    matchesAny(order.senderName, candidates) || matchesAny(order.recipientName, candidates)
  )));

  addBlocker(blockers, 'minutas', getRegisteredMinutas().some((minuta) => (
    matchesAny(minuta.senderName, candidates)
    || matchesAny(minuta.recipientName, candidates)
    || matchesAny(minuta.senderDocument, candidates)
    || matchesAny(minuta.recipientDocument, candidates)
  )));

  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => matchesAny(cte.issuer, candidates)));

  return blockers;
}

export function getInsuranceDeletionBlockers(insurance) {
  const blockers = [];
  const companyCandidates = [insurance.companyName, insurance.name].filter(Boolean);
  const policyCandidates = [insurance.policyNumber].filter(Boolean);

  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => (
    matchesAny(cte.insuranceCompany, companyCandidates)
    || matchesAny(cte.insurancePolicy, policyCandidates)
  )));

  addBlocker(blockers, 'manifestos', getRegisteredManifests().some((manifest) => (
    matchesAny(manifest.insuranceCompany, companyCandidates)
    || matchesAny(manifest.insurancePolicy, policyCandidates)
  )));

  return blockers;
}

export function getUnitDeletionBlockers(unit) {
  const blockers = [];
  const candidates = getUnitCandidates(unit);

  addBlocker(blockers, 'lancamentos financeiros', financeLaunches.some((launch) => matchesAny(launch.unit, candidates)));
  addBlocker(blockers, 'veiculos', getRegisteredVehicles().some((vehicle) => matchesAny(vehicle.unit, candidates)));
  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => matchesAny(cte.unit, candidates)));
  addBlocker(blockers, 'manifestos', getRegisteredManifests().some((manifest) => matchesAny(manifest.unit, candidates)));

  return blockers;
}

export function getVehicleDeletionBlockers(vehicle) {
  const blockers = [];
  const plate = normalizePlate(vehicle.plate || vehicle.vehiclePlate || vehicle.truckPlate);

  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => normalizePlate(cte.vehiclePlate || cte.truckPlate) === plate));
  addBlocker(blockers, 'ordens de coleta', getRegisteredCollectionOrders().some((order) => normalizePlate(order.vehiclePlate) === plate));
  addBlocker(blockers, 'minutas', getRegisteredMinutas().some((minuta) => normalizePlate(minuta.vehiclePlate) === plate));
  addBlocker(blockers, 'manifestos', getRegisteredManifests().some((manifest) => normalizePlate(manifest.truckPlate) === plate));

  return blockers;
}

export function getDriverDeletionBlockers(driver) {
  const blockers = [];
  const cpf = onlyDigits(driver.cpf || driver.driverCpf);
  const names = [driver.name, driver.driverName].filter(Boolean);

  addBlocker(blockers, 'veiculos', getRegisteredVehicles().some((vehicle) => (
    onlyDigits(vehicle.ownerCpf) === cpf || matchesAny(vehicle.owner, names)
  )));

  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => (
    onlyDigits(cte.driverCpf) === cpf || matchesAny(cte.driverName, names)
  )));

  addBlocker(blockers, 'ordens de coleta', getRegisteredCollectionOrders().some((order) => (
    onlyDigits(order.driverCpf) === cpf || matchesAny(order.driverName, names)
  )));

  addBlocker(blockers, 'minutas', getRegisteredMinutas().some((minuta) => (
    onlyDigits(minuta.driverCpf) === cpf || matchesAny(minuta.driverName, names)
  )));

  addBlocker(blockers, 'manifestos', getRegisteredManifests().some((manifest) => (
    onlyDigits(manifest.driverCpf) === cpf || matchesAny(manifest.driverName, names)
  )));

  return blockers;
}

export function getCteDeletionBlockers(cte) {
  const blockers = [];
  const id = cte.id;

  addBlocker(blockers, 'manifestos', getRegisteredManifests().some((manifest) => (
    (manifest.selectedCteIds || []).includes(id)
  )));

  return blockers;
}

export function getCollectionOrderDeletionBlockers(order) {
  const blockers = [];
  const id = order.id;

  addBlocker(blockers, 'minutas', getRegisteredMinutas().some((minuta) => minuta.collectionOrderId === id));
  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => cte.collectionOrderId === id));

  return blockers;
}

export function getMinutaDeletionBlockers(minuta) {
  const blockers = [];
  const id = minuta.id;

  addBlocker(blockers, 'CT-e', getRegisteredCtes().some((cte) => cte.minutaId === id));
  addBlocker(blockers, 'manifestos', getRegisteredManifests().some((manifest) => manifest.minutaId === id));

  return blockers;
}

export function getManifestDeletionBlockers(manifest) {
  const blockers = [];
  const id = manifest.id;

  addBlocker(blockers, 'documentos vinculados', getRegisteredCtes().some((cte) => cte.manifestId === id));

  return blockers;
}
