import { auditActions, recordAuditEvent } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';
import { companyDetails } from './siteData.js';

export const quickQueryStorageKey = 'savedReportQuickQueries';
export const quickQueryUpdatedEventName = 'quickQueries:updated';
export const maxQuickQueriesPerUser = 10;
export const maxQuickQueryNameLength = 25;

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');
}

function fallbackUserKey() {
  const userLabel = companyDetails.find((detail) => detail.id === 'user')?.label || '';
  const [, username] = userLabel.split(' - ');
  return normalizeKey(username || userLabel) || 'local-session';
}

export function getCurrentQuickQueryUserKey() {
  try {
    const actor = JSON.parse(window.localStorage.getItem('currentAuditUser') || 'null');
    const actorKey = normalizeKey(actor?.username || actor?.id || actor?.name);

    if (actorKey) return actorKey;
  } catch {
    // Consulta rapida continua por usuario padrao quando nao ha sessao gravada.
  }

  return fallbackUserKey();
}

export function normalizeQuickQueryName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxQuickQueryNameLength);
}

function normalizeQuickQuery(query) {
  if (!query || typeof query !== 'object') return null;

  const name = normalizeQuickQueryName(query.name || query.label);
  const userKey = normalizeKey(query.userKey);

  if (!name || !userKey || !query.reportType || !query.pageId) return null;

  return {
    id: query.id || `quick-query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userKey,
    name,
    module: query.module || 'Financeiro',
    icon: query.icon || 'finance',
    pageId: query.pageId,
    reportType: query.reportType,
    filters: query.filters && typeof query.filters === 'object' ? query.filters : {},
    createdAt: query.createdAt || new Date().toISOString(),
    updatedAt: query.updatedAt || query.createdAt || new Date().toISOString(),
  };
}

function readAllQuickQueries() {
  return readJsonStorage(quickQueryStorageKey, [], {
    validate: Array.isArray,
  })
    .map(normalizeQuickQuery)
    .filter(Boolean);
}

function emitQuickQueryUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(quickQueryUpdatedEventName));
  }
}

export function readQuickQueries(userKey = getCurrentQuickQueryUserKey()) {
  const normalizedUserKey = normalizeKey(userKey);

  return readAllQuickQueries()
    .filter((query) => query.userKey === normalizedUserKey)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

export function getQuickQueryCards(userKey = getCurrentQuickQueryUserKey()) {
  return readQuickQueries(userKey).map((query) => ({
    id: query.id,
    label: query.name,
    icon: query.icon,
    pageId: query.pageId,
    quickQuery: query,
  }));
}

export function saveQuickQuery({ name, reportType, pageId, filters, module = 'Financeiro', icon = 'finance' }) {
  const userKey = getCurrentQuickQueryUserKey();
  const normalizedName = normalizeQuickQueryName(name);

  if (!normalizedName) {
    return { error: 'Informe um nome para a consulta rapida' };
  }

  const allQueries = readAllQuickQueries();
  const userQueries = allQueries.filter((query) => query.userKey === userKey);
  const existingQuery = userQueries.find((query) => (
    query.reportType === reportType
    && normalizeKey(query.name) === normalizeKey(normalizedName)
  ));

  if (!existingQuery && userQueries.length >= maxQuickQueriesPerUser) {
    return { error: `Limite de ${maxQuickQueriesPerUser} consultas rapidas atingido` };
  }

  const now = new Date().toISOString();
  const nextQuery = normalizeQuickQuery({
    id: existingQuery?.id,
    userKey,
    name: normalizedName,
    module,
    icon,
    pageId,
    reportType,
    filters,
    createdAt: existingQuery?.createdAt || now,
    updatedAt: now,
  });
  const nextQueries = existingQuery
    ? allQueries.map((query) => (query.id === existingQuery.id ? nextQuery : query))
    : [nextQuery, ...allQueries];

  writeJsonStorage(quickQueryStorageKey, nextQueries);
  recordAuditEvent({
    module,
    action: existingQuery ? auditActions.update : auditActions.create,
    entityType: 'consulta rapida',
    entityId: nextQuery.id,
    entityLabel: nextQuery.name,
    before: existingQuery || null,
    after: nextQuery,
    summary: existingQuery ? 'Consulta rapida atualizada' : 'Consulta rapida salva',
  });
  emitQuickQueryUpdate();

  return {
    quickQuery: nextQuery,
    queries: readQuickQueries(userKey),
  };
}
