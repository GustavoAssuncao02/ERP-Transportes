const jsonStorageCache = new Map();

function getLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function fallbackValidator() {
  return true;
}

export function readJsonStorage(key, fallback, options = {}) {
  const storage = getLocalStorage();
  const validate = options.validate || fallbackValidator;

  if (!storage) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(key);
    if (rawValue === null) {
      jsonStorageCache.delete(key);
      return fallback;
    }

    const cached = jsonStorageCache.get(key);
    if (cached?.rawValue === rawValue) {
      return cached.value;
    }

    const parsedValue = JSON.parse(rawValue);
    const value = validate(parsedValue) ? parsedValue : fallback;

    jsonStorageCache.set(key, { rawValue, value });
    return value;
  } catch {
    jsonStorageCache.delete(key);
    return fallback;
  }
}

export function writeJsonStorage(key, value) {
  const storage = getLocalStorage();

  if (!storage) {
    return value;
  }

  const rawValue = JSON.stringify(value);
  storage.setItem(key, rawValue);
  jsonStorageCache.set(key, { rawValue, value });
  return value;
}

export function removeJsonStorage(key) {
  const storage = getLocalStorage();

  jsonStorageCache.delete(key);
  storage?.removeItem(key);
}

export function clearJsonStorageCache(key) {
  if (key) {
    jsonStorageCache.delete(key);
    return;
  }

  jsonStorageCache.clear();
}

export function createReferenceCache(transform) {
  const cache = new WeakMap();

  return (value) => {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
      return transform(value);
    }

    if (cache.has(value)) {
      return cache.get(value);
    }

    const transformedValue = transform(value);
    cache.set(value, transformedValue);
    return transformedValue;
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key) {
      jsonStorageCache.delete(event.key);
    } else {
      jsonStorageCache.clear();
    }
  });
}
