import { readJsonStorage, writeJsonStorage } from './storage.js';

export const cityApiUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';
export const cityCacheKey = 'ibgeCityOptionsCache';
export const cityCacheTtlMs = 15 * 24 * 60 * 60 * 1000;

export const fallbackCities = [
  'Aracaju - SE',
  'Camacari - BA',
  'Feira de Santana - BA',
  'Lauro de Freitas - BA',
  'Maceio - AL',
  'Recife - PE',
  'Salvador - BA',
];
let cityOptionsRequest = null;

function cityLabel(city) {
  const uf = city.microrregiao?.mesorregiao?.UF?.sigla
    || city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
    || '';

  return uf ? `${city.nome} - ${uf}` : city.nome;
}

function normalizeCityOptions(values) {
  return [...new Set((values || []).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

export function readCachedCityOptions() {
  const cached = readJsonStorage(cityCacheKey, null, {
    validate: (value) => value && Array.isArray(value.options),
  });

  if (cached?.options?.length && cached.updatedAt && Date.now() - cached.updatedAt <= cityCacheTtlMs) {
    return cached.options;
  }

  return null;
}

export function initialCityOptions() {
  return readCachedCityOptions() || fallbackCities;
}

export async function fetchCityOptions() {
  const cachedOptions = readCachedCityOptions();
  if (cachedOptions) {
    return cachedOptions;
  }

  if (cityOptionsRequest) {
    return cityOptionsRequest;
  }

  cityOptionsRequest = (async () => {
    const response = await fetch(cityApiUrl);

    if (!response.ok) {
      throw new Error('Falha ao carregar cidades');
    }

    const data = await response.json();
    const options = normalizeCityOptions(data.map(cityLabel));

    writeJsonStorage(cityCacheKey, {
      updatedAt: Date.now(),
      options,
    });

    return options;
  })();

  try {
    return await cityOptionsRequest;
  } finally {
    cityOptionsRequest = null;
  }
}
