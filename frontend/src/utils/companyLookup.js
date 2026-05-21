import { formatZipCode } from './address.js';
import { readJsonStorage, writeJsonStorage } from './storage.js';

const companyLookupCacheKey = 'brasilApiCnpjLookupCache';
const companyLookupCacheTtlMs = 30 * 24 * 60 * 60 * 1000;

function cnpjDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 14);
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatBrazilPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

function stripTrailingNumber(street, number) {
  const streetText = compactText(street);
  const numberText = compactText(number);

  if (!streetText || !numberText) {
    return streetText;
  }

  const escapedNumber = numberText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return streetText.replace(new RegExp(`\\s*,?\\s*${escapedNumber}$`), '').trim();
}

function companyStreet(data) {
  const street = stripTrailingNumber(data?.logradouro, data?.numero);
  const streetType = compactText(data?.descricao_tipo_de_logradouro);

  if (!street) {
    return '';
  }

  if (!streetType || street.toLocaleLowerCase('pt-BR').startsWith(streetType.toLocaleLowerCase('pt-BR'))) {
    return street;
  }

  return `${streetType} ${street}`;
}

function companyPhoneFromCnpja(data) {
  const phone = Array.isArray(data?.phones) ? data.phones[0] : null;

  if (!phone) {
    return '';
  }

  return formatBrazilPhone(`${phone.area || ''}${phone.number || ''}`);
}

function companyEmailFromCnpja(data) {
  const email = Array.isArray(data?.emails) ? data.emails[0] : null;
  return compactText(email?.address).toLocaleLowerCase('pt-BR');
}

function normalizeBrasilApiCompany(data, cnpj) {
  return {
    cnpj: cnpjDigits(data.cnpj || cnpj),
    name: compactText(data.nome_fantasia) || compactText(data.razao_social),
    legalName: compactText(data.razao_social),
    zipCode: formatZipCode(data.cep || ''),
    street: companyStreet(data),
    addressNumber: compactText(data.numero),
    district: compactText(data.bairro),
    city: compactText(data.municipio),
    state: compactText(data.uf),
    email: compactText(data.email).toLocaleLowerCase('pt-BR'),
    phone: formatBrazilPhone(data.ddd_telefone_1 || data.ddd_telefone_2),
    cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : '',
    cnaeDescription: compactText(data.cnae_fiscal_descricao),
  };
}

function normalizeCnpjaCompany(data, cnpj) {
  return {
    cnpj: cnpjDigits(data.taxId || cnpj),
    name: compactText(data.alias) || compactText(data.company?.name),
    legalName: compactText(data.company?.name),
    zipCode: formatZipCode(data.address?.zip || ''),
    street: compactText(data.address?.street),
    addressNumber: compactText(data.address?.number),
    district: compactText(data.address?.district),
    city: compactText(data.address?.city),
    state: compactText(data.address?.state),
    email: companyEmailFromCnpja(data),
    phone: companyPhoneFromCnpja(data),
    cnae: data.mainActivity?.id ? String(data.mainActivity.id) : '',
    cnaeDescription: compactText(data.mainActivity?.text),
  };
}

function readCachedCompany(cnpj) {
  const cache = readJsonStorage(companyLookupCacheKey, {}, {
    validate: (value) => value && typeof value === 'object' && !Array.isArray(value),
  });
  const entry = cache?.[cnpj];

  if (entry?.company && entry.updatedAt && Date.now() - entry.updatedAt <= companyLookupCacheTtlMs) {
    return entry.company;
  }

  return null;
}

function writeCachedCompany(cnpj, company) {
  try {
    const cache = readJsonStorage(companyLookupCacheKey, {}, {
      validate: (value) => value && typeof value === 'object' && !Array.isArray(value),
    });
    const nextCache = cache && typeof cache === 'object' ? cache : {};

    nextCache[cnpj] = {
      updatedAt: Date.now(),
      company,
    };

    writeJsonStorage(companyLookupCacheKey, nextCache);
  } catch {
    // Cache is only an optimization; the form keeps working without it.
  }
}

async function requestCompany(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Falha ao consultar CNPJ: ${response.status}`);
  }

  return response.json();
}

export async function fetchCompanyByCnpj(value) {
  const cnpj = cnpjDigits(value);

  if (cnpj.length !== 14) {
    return null;
  }

  const cachedCompany = readCachedCompany(cnpj);
  if (cachedCompany) {
    return cachedCompany;
  }

  const providers = [
    {
      url: `https://open.cnpja.com/office/${cnpj}`,
      normalize: (data) => normalizeCnpjaCompany(data, cnpj),
    },
    {
      url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      normalize: (data) => normalizeBrasilApiCompany(data, cnpj),
    },
    {
      url: `https://minhareceita.org/${cnpj}`,
      normalize: (data) => normalizeBrasilApiCompany(data, cnpj),
    },
  ];

  let lastError = null;

  for (const provider of providers) {
    try {
      const data = await requestCompany(provider.url);

      if (!data) {
        continue;
      }

      const company = provider.normalize(data);

      if (company?.name || company?.legalName) {
        writeCachedCompany(cnpj, company);
        return company;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}
