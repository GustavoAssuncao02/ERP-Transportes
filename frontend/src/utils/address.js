export const defaultAddressFields = {
  zipCode: 'zipCode',
  street: 'street',
  number: 'addressNumber',
  district: 'district',
  formatted: 'address',
};

const zipCodeCacheKey = 'viacepZipCodeLookupCache';
const zipCodeCacheTtlMs = 30 * 24 * 60 * 60 * 1000;

export function addressFieldSet(prefix, formatted) {
  return {
    zipCode: `${prefix}ZipCode`,
    street: `${prefix}Street`,
    number: `${prefix}Number`,
    district: `${prefix}District`,
    formatted,
  };
}

export function blankAddressFields(fields = defaultAddressFields) {
  return {
    [fields.zipCode]: '',
    [fields.street]: '',
    [fields.number]: '',
    [fields.district]: '',
    [fields.formatted]: '',
  };
}

export function zipCodeDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 8);
}

export function formatZipCode(value) {
  const digits = zipCodeDigits(value);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

function parseLegacyAddress(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return blankAddressFields();
  }

  const zipCodeMatch = rawValue.match(/\d{5}-?\d{3}/);
  const withoutZipCode = zipCodeMatch ? rawValue.replace(zipCodeMatch[0], '').replace(/\s+-\s*$/, '').trim() : rawValue;
  const parts = withoutZipCode.split(/\s+-\s+/);
  const [streetPart = ''] = parts;
  const districtPart = parts.length === 2 ? parts[1] : '';
  const [street = streetPart, number = ''] = streetPart.split(',').map((part) => part.trim());

  return {
    zipCode: zipCodeMatch ? formatZipCode(zipCodeMatch[0]) : '',
    street: street.trim(),
    addressNumber: number.trim(),
    district: districtPart.trim(),
    address: rawValue,
  };
}

export function formatAddress(record, fields = defaultAddressFields) {
  const street = String(record?.[fields.street] || '').trim();
  const number = String(record?.[fields.number] || '').trim();
  const district = String(record?.[fields.district] || '').trim();
  const zipCode = formatZipCode(record?.[fields.zipCode] || '');
  const streetLine = [street, number].filter(Boolean).join(', ');

  return [streetLine, district, zipCode ? `CEP ${zipCode}` : ''].filter(Boolean).join(' - ');
}

export function normalizeAddressFields(record = {}, fields = defaultAddressFields) {
  const legacy = parseLegacyAddress(record[fields.formatted]);
  const normalized = {
    [fields.zipCode]: formatZipCode(record[fields.zipCode] || legacy.zipCode),
    [fields.street]: String(record[fields.street] || legacy.street || '').trim(),
    [fields.number]: String(record[fields.number] || legacy.addressNumber || '').trim(),
    [fields.district]: String(record[fields.district] || legacy.district || '').trim(),
  };
  const formattedAddress = formatAddress(normalized, fields);

  return {
    ...record,
    ...normalized,
    [fields.formatted]: formattedAddress || record[fields.formatted] || '',
  };
}

export function copyAddressFields(source = {}, targetFields, sourceFields = defaultAddressFields) {
  return {
    [targetFields.zipCode]: formatZipCode(source[sourceFields.zipCode] || ''),
    [targetFields.street]: source[sourceFields.street] || '',
    [targetFields.number]: source[sourceFields.number] || '',
    [targetFields.district]: source[sourceFields.district] || '',
    [targetFields.formatted]: formatAddress(source, sourceFields),
  };
}

function readCachedZipCodeAddress(digits) {
  try {
    const cache = JSON.parse(localStorage.getItem(zipCodeCacheKey) || '{}');
    const entry = cache?.[digits];

    if (entry?.address && entry.updatedAt && Date.now() - entry.updatedAt <= zipCodeCacheTtlMs) {
      return entry.address;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedZipCodeAddress(digits, address) {
  try {
    const cache = JSON.parse(localStorage.getItem(zipCodeCacheKey) || '{}');
    const nextCache = cache && typeof cache === 'object' ? cache : {};

    nextCache[digits] = {
      updatedAt: Date.now(),
      address,
    };

    localStorage.setItem(zipCodeCacheKey, JSON.stringify(nextCache));
  } catch {
    // O cache é apenas otimização; se o navegador bloquear, a consulta continua normal.
  }
}

export async function fetchAddressByZipCode(value) {
  const digits = zipCodeDigits(value);

  if (digits.length !== 8) {
    return null;
  }

  const cachedAddress = readCachedZipCodeAddress(digits);
  if (cachedAddress) {
    return cachedAddress;
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar CEP');
  }

  const data = await response.json();
  if (data?.erro) {
    return null;
  }

  const address = {
    zipCode: formatZipCode(data.cep || digits),
    street: data.logradouro || '',
    district: data.bairro || '',
    city: data.localidade || '',
    state: data.uf || '',
    complement: data.complemento || '',
  };

  writeCachedZipCodeAddress(digits, address);
  return address;
}
