import { recordAuditEvent, auditActions } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const warehouseCargoStorageKey = 'warehouseManagementCargoItems';
export const warehouseWeightSettingsStorageKey = 'warehouseWeightSettings';
export const defaultWarehouseSectorLimitKg = 3;
export const blueprintViewBox = '0 0 441 138';

export const warehouseWalls = [
  { id: 'upper-right-block', type: 'rect', x: 228.628, y: 17.5, width: 96, height: 5 },
  { id: 'outer-shell', type: 'rect', x: 1.50095, y: 22.5, width: 437.772, height: 114 },
  { id: 'upper-shell', type: 'rect', x: 45.6279, y: 1.5, width: 334, height: 21 },
  { id: 'upper-center-block', type: 'rect', x: 157.628, y: 17.5, width: 56, height: 5 },
  { id: 'upper-left-block', type: 'rect', x: 55.6279, y: 17.5, width: 56, height: 5 },
  { id: 'central-corridor-divider', type: 'line', x1: 226.14, y1: 138.003, x2: 226.14, y2: 23.9986 },
  { id: 'side-access', type: 'rect', x: 435.128, y: 97, width: 15, height: 4, transform: 'rotate(-90 435.128 97)', strokeWidth: 2 },
];

const rawStorageSectors = [
  { x: 412.628, y: 22.5, width: 21, height: 19 },
  { x: 385.628, y: 22.5, width: 21, height: 19 },
  { x: 358.628, y: 22.5, width: 21, height: 19 },
  { x: 331.628, y: 23.5, width: 21, height: 19 },
  { x: 306.628, y: 22.5, width: 18, height: 16 },
  { x: 281.628, y: 22.5, width: 18, height: 16 },
  { x: 306.628, y: 39.5, width: 18, height: 16 },
  { x: 281.628, y: 39.5, width: 18, height: 16 },
  { x: 188.628, y: 59.5, width: 18, height: 16 },
  { x: 181.628, y: 22.5, width: 18, height: 16 },
  { x: 157.628, y: 22.5, width: 18, height: 16 },
  { x: 133.628, y: 22.5, width: 18, height: 16 },
  { x: 109.628, y: 22.5, width: 18, height: 16 },
  { x: 85.6279, y: 22.5, width: 18, height: 16 },
  { x: 45.6279, y: 22.5, width: 18, height: 16 },
  { x: 36.6279, y: 59.5, width: 17, height: 16 },
  { x: 11.6279, y: 59.5, width: 17, height: 16 },
  { x: 11.6279, y: 81.5, width: 17, height: 16 },
  { x: 11.6279, y: 97.5, width: 17, height: 16 },
  { x: 36.6279, y: 81.5, width: 17, height: 16 },
  { x: 36.6279, y: 97.5, width: 17, height: 16 },
  { x: 86.6279, y: 96.5, width: 17, height: 16 },
  { x: 61.6279, y: 81.5, width: 17, height: 16 },
  { x: 61.6279, y: 97.5, width: 17, height: 16 },
  { x: 111.628, y: 96.5, width: 17, height: 16 },
  { x: 111.628, y: 120.5, width: 17, height: 16 },
  { x: 136.628, y: 120.5, width: 17, height: 16 },
  { x: 87.6279, y: 120.5, width: 17, height: 16 },
  { x: 36.6279, y: 120.5, width: 17, height: 16 },
  { x: 61.6279, y: 120.5, width: 17, height: 16 },
  { x: 11.6279, y: 120.5, width: 17, height: 16 },
  { x: 136.628, y: 97.5, width: 17, height: 16 },
  { x: 86.6279, y: 81.5, width: 17, height: 16 },
  { x: 111.628, y: 81.5, width: 17, height: 16 },
  { x: 136.628, y: 81.5, width: 17, height: 16 },
  { x: 161.628, y: 81.5, width: 13, height: 16 },
  { x: 61.6279, y: 59.5, width: 17, height: 16 },
  { x: 87.6279, y: 59.5, width: 16, height: 16 },
  { x: 111.628, y: 59.5, width: 17, height: 16 },
  { x: 136.628, y: 59.5, width: 18, height: 16 },
  { x: 23.6279, y: 22.5, width: 15, height: 16 },
  { x: 5.6279, y: 22.5, width: 12, height: 16 },
  { x: 161.628, y: 59.5, width: 18, height: 16 },
  { x: 174.628, y: 75.5, width: 52, height: 60 },
  { x: 412.628, y: 42.5, width: 21, height: 18 },
  { x: 385.628, y: 42.5, width: 21, height: 18 },
  { x: 358.628, y: 42.5, width: 21, height: 18 },
  { x: 331.628, y: 43.5, width: 21, height: 18 },
  { x: 331.628, y: 61.5, width: 21, height: 18 },
  { x: 385.628, y: 61.5, width: 21, height: 18 },
  { x: 412.628, y: 60.5, width: 21, height: 18 },
  { x: 358.628, y: 61.5, width: 21, height: 18 },
  { x: 411.628, y: 100.5, width: 21, height: 19 },
  { x: 385.628, y: 100.5, width: 21, height: 19 },
  { x: 358.628, y: 100.5, width: 21, height: 19 },
  { x: 333.628, y: 100.5, width: 19, height: 19 },
  { x: 308.628, y: 100.5, width: 19, height: 19 },
  { x: 282.628, y: 97.5, width: 21, height: 22 },
  { x: 254.628, y: 97.5, width: 21, height: 22 },
  { x: 226.628, y: 97.5, width: 21, height: 22 },
  { x: 282.628, y: 75.5, width: 21, height: 22 },
  { x: 254.628, y: 75.5, width: 21, height: 22 },
  { x: 226.628, y: 75.5, width: 21, height: 22 },
  { x: 411.628, y: 119.5, width: 21, height: 17 },
  { x: 385.628, y: 119.5, width: 21, height: 17 },
  { x: 358.628, y: 119.5, width: 21, height: 17 },
  { x: 333.628, y: 119.5, width: 19, height: 17 },
  { x: 308.628, y: 119.5, width: 19, height: 17 },
  { x: 282.628, y: 119.5, width: 21, height: 17 },
  { x: 254.628, y: 119.5, width: 21, height: 17 },
  { x: 226.628, y: 119.5, width: 21, height: 17 },
];

function createAxisClusters(values, tolerance) {
  return [...values].sort((first, second) => first - second).reduce((clusters, value) => {
    const previousCluster = clusters[clusters.length - 1];

    if (previousCluster && Math.abs(value - previousCluster.center) <= tolerance) {
      previousCluster.values.push(value);
      previousCluster.center = previousCluster.values.reduce((sum, clusterValue) => sum + clusterValue, 0) / previousCluster.values.length;
      return clusters;
    }

    clusters.push({ center: value, values: [value] });
    return clusters;
  }, []);
}

function columnLabel(index) {
  let label = '';
  let currentIndex = index + 1;

  while (currentIndex > 0) {
    const remainder = (currentIndex - 1) % 26;
    label = `${String.fromCharCode(65 + remainder)}${label}`;
    currentIndex = Math.floor((currentIndex - 1) / 26);
  }

  return label;
}

function columnLabelIndex(label) {
  return String(label).split('').reduce((index, character) => (
    (index * 26) + character.charCodeAt(0) - 64
  ), 0);
}

function closestClusterIndex(clusters, value) {
  return clusters.reduce((closestIndex, cluster, index) => {
    const closestDistance = Math.abs(value - clusters[closestIndex].center);
    const currentDistance = Math.abs(value - cluster.center);
    return currentDistance < closestDistance ? index : closestIndex;
  }, 0);
}

function createBlueprintSectors(sectors) {
  const xClusters = createAxisClusters(sectors.map((sector) => sector.x + (sector.width / 2)), 6);
  const yClusters = createAxisClusters(sectors.map((sector) => sector.y + (sector.height / 2)), 6);

  return sectors.map((sector) => {
    const centerX = sector.x + (sector.width / 2);
    const centerY = sector.y + (sector.height / 2);
    const columnIndex = closestClusterIndex(xClusters, centerX);
    const rowIndex = closestClusterIndex(yClusters, centerY);
    const id = `${columnLabel(columnIndex)}${rowIndex + 1}`;

    return {
      ...sector,
      id,
      centerX,
      centerY,
      row: rowIndex + 1,
      column: columnLabel(columnIndex),
    };
  }).sort((first, second) => first.centerY - second.centerY || first.centerX - second.centerX);
}

export const blueprintSectors = createBlueprintSectors(rawStorageSectors);
export const validSectorIds = new Set(blueprintSectors.map((sector) => sector.id));
export const defaultSectorId = validSectorIds.has('H4') ? 'H4' : blueprintSectors[0].id;
export const warehouseColumnCount = new Set(blueprintSectors.map((sector) => sector.column)).size;
export const warehouseRowCount = new Set(blueprintSectors.map((sector) => sector.row)).size;
export const warehouseDepots = [
  {
    id: 'deposit-2',
    label: 'Depósito 2',
    columns: '',
  },
  {
    id: 'deposit-1',
    label: 'Depósito 1',
    columns: '',
  },
];

const depotSplitColumnIndex = columnLabelIndex('M');
export const sectorDepotMap = new Map(blueprintSectors.map((sector) => [
  sector.id,
  columnLabelIndex(sector.column) >= depotSplitColumnIndex ? 'deposit-1' : 'deposit-2',
]));

export function parseWeightLimit(value) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : defaultWarehouseSectorLimitKg;
}

export function normalizeWarehouseWeightSettings(settings = {}) {
  const globalLimitKg = parseWeightLimit(settings.globalLimitKg);
  const rawSectorLimits = settings.sectorLimits && typeof settings.sectorLimits === 'object'
    ? settings.sectorLimits
    : {};

  const sectorLimits = Object.entries(rawSectorLimits).reduce((limits, [sectorId, value]) => {
    if (!validSectorIds.has(sectorId)) return limits;

    const limit = parseWeightLimit(value);
    if (limit === globalLimitKg) return limits;

    return {
      ...limits,
      [sectorId]: limit,
    };
  }, {});

  return {
    globalLimitKg,
    sectorLimits,
  };
}

export function readWarehouseWeightSettings() {
  if (typeof window === 'undefined') {
    return normalizeWarehouseWeightSettings();
  }

  return normalizeWarehouseWeightSettings(readJsonStorage(warehouseWeightSettingsStorageKey, normalizeWarehouseWeightSettings(), {
    validate: (value) => value && typeof value === 'object' && !Array.isArray(value),
  }));
}

export function saveWarehouseWeightSettings(settings) {
  const previousSettings = readWarehouseWeightSettings();
  const normalizedSettings = normalizeWarehouseWeightSettings(settings);

  writeJsonStorage(warehouseWeightSettingsStorageKey, normalizedSettings);
  recordAuditEvent({
    module: 'Gestao',
    action: auditActions.configChange,
    entityType: 'configuracao de galpao',
    entityId: warehouseWeightSettingsStorageKey,
    entityLabel: 'Limites de peso por setor',
    before: previousSettings,
    after: normalizedSettings,
    summary: 'Configuracao de peso do galpao atualizada',
  });
  return normalizedSettings;
}

export function getSectorWeightLimit(settings, sectorId) {
  const normalizedSettings = normalizeWarehouseWeightSettings(settings);
  return normalizedSettings.sectorLimits[sectorId] || normalizedSettings.globalLimitKg;
}

export function hasCustomSectorWeightLimit(settings, sectorId) {
  return Object.prototype.hasOwnProperty.call(normalizeWarehouseWeightSettings(settings).sectorLimits, sectorId);
}
