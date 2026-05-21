const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
const getResponseCache = new Map();

function requestCacheKey(path, options) {
  return `${path}:${JSON.stringify(options.body || null)}`;
}

export function clearApiCache(path) {
  if (!path) {
    getResponseCache.clear();
    return;
  }

  [...getResponseCache.keys()]
    .filter((key) => key.startsWith(`${path}:`))
    .forEach((key) => getResponseCache.delete(key));
}

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function createApiError(response, body, fallbackMessage) {
  const technicalMessage = typeof body === 'object' ? body?.message : body;
  const error = new Error(fallbackMessage || 'Nao foi possivel concluir a operacao. Tente novamente.');

  error.status = response.status;
  error.requestId = response.headers.get('x-request-id') || body?.requestId || '';
  error.technicalMessage = technicalMessage || `HTTP ${response.status}`;
  return error;
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const cacheTtlMs = options.cacheTtlMs || 0;
  const friendlyErrorMessage = options.friendlyErrorMessage;
  const canUseCache = method === 'GET' && cacheTtlMs > 0;
  const cacheKey = canUseCache ? requestCacheKey(path, options) : '';

  if (canUseCache) {
    const cached = getResponseCache.get(cacheKey);

    if (cached && Date.now() - cached.updatedAt <= cacheTtlMs) {
      return cached.data;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw createApiError(response, body, friendlyErrorMessage);
  }

  if (canUseCache) {
    getResponseCache.set(cacheKey, {
      updatedAt: Date.now(),
      data: body,
    });
  }

  return body;
}
