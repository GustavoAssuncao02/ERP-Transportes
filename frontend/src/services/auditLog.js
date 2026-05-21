import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

export const auditStorageKey = 'systemAuditLog';
const maxAuditEvents = 500;

export const auditActions = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  deactivate: 'deactivate',
  statusChange: 'status_change',
  login: 'login',
  financialChange: 'financial_change',
  configChange: 'config_change',
};

function auditId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function auditActor() {
  try {
    const storedActor = JSON.parse(window.localStorage.getItem('currentAuditUser') || 'null');

    if (storedActor?.name || storedActor?.username) {
      return storedActor;
    }
  } catch {
    // Auditoria nao deve interromper a acao do usuario.
  }

  return {
    id: 'local-session',
    name: 'Sessao local',
  };
}

function cloneAuditValue(value) {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export function readAuditEvents() {
  return readJsonStorage(auditStorageKey, [], {
    validate: Array.isArray,
  });
}

export function recordAuditEvent(event) {
  try {
    const nextEvent = {
      id: auditId(),
      occurredAt: new Date().toISOString(),
      actor: event.actor || auditActor(),
      module: event.module || 'Sistema',
      action: event.action || auditActions.update,
      entityType: event.entityType || 'registro',
      entityId: event.entityId || '',
      entityLabel: event.entityLabel || '',
      summary: event.summary || '',
      metadata: cloneAuditValue(event.metadata || {}),
      before: cloneAuditValue(event.before),
      after: cloneAuditValue(event.after),
    };
    const nextEvents = [nextEvent, ...readAuditEvents()].slice(0, maxAuditEvents);

    writeJsonStorage(auditStorageKey, nextEvents);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audit:recorded', { detail: nextEvent }));
    }

    return nextEvent;
  } catch {
    return null;
  }
}
