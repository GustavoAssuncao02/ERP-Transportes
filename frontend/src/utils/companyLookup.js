import { formatZipCode } from './address.js';

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

function readCachedCompany(cnpj) {
  try {
    const cache = JSON.parse(localStorage.getItem(companyLookupCacheKey) || '{}');
    const entry = cache?.[cnpj];

    if (entry?.company && entry.updatedAt && Date.now() - entry.updatedAt <= companyLookupCacheTtlMs) {
      return entry.company;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedCompany(cnpj, company) {
  try {
    const cache = JSON.parse(localStorage.getItem(companyLookupCacheKey) || '{}');
    const nextCache = cache && typeof cache === 'object' ? cache : {};

    nextCache[cnpj] = {
      updatedAt: Date.now(),
      company,
    };

    localStorage.setItem(companyLookupCacheKey, JSON.stringify(nextCache));
  } catch {
    // Cache is only an optimization; the form keeps working without it.
  }
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

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Falha ao consultar CNPJ');
  }

  const data = await response.json();
  const company = {
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

  writeCachedCompany(cnpj, company);
  return company;
}
