import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FileText, MapPinned, Route, Save, Search, Truck, UserRound } from 'lucide-react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { normalizeText } from '../data/financeData.js';
import { getRegisteredManifests, pendingManifestIdKey } from '../data/operationRegistry.js';
import { maxQuickQueryNameLength, saveQuickQuery } from '../data/quickQueries.js';
import {
  formatCpf,
  getRegisteredDrivers,
  getRegisteredVehicles,
  normalizePlate,
  onlyDigits,
  pendingVehiclePlateKey,
} from '../data/transportRegistry.js';
import { sortTableRows } from '../utils/tableSort.js';

const statusFilters = [
  { value: 'all', label: 'Todos' },
  { value: 'transit', label: 'Em trânsito' },
  { value: 'available', label: 'Disponíveis' },
  { value: 'inactive', label: 'Inativos' },
];

const mapStatusFilters = [
  { value: 'all', label: 'Todos os manifestos' },
  { value: 'active', label: 'Ativos' },
  { value: 'canceled', label: 'Cancelados' },
];

const manifestTypeFilters = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'Manifesto de Controle', label: 'Manifesto de Controle' },
  { value: 'Manifesto de Trânsito', label: 'Manifesto de Trânsito' },
];

const driverTypeFilters = [
  { value: 'fleet', label: 'Motorista da frota' },
  { value: 'third-party', label: 'Motorista terceiro' },
  { value: 'both', label: 'Ambos' },
];

const brazilBounds = [
  [-34.2, -74.1],
  [5.4, -33.7],
];

function fleetStatusLabel(row) {
  if (row.inTransit) return 'Em trânsito';
  if (row.inactive) return 'Inativo';
  return 'Disponível';
}

const fleetSortColumns = [
  { key: 'plate', label: 'Veiculo', type: 'text', getValue: (row) => `${row.plate} ${row.model || row.type}` },
  { key: 'status', label: 'Status', type: 'text', getValue: (row) => fleetStatusLabel(row) },
  { key: 'manifest', label: 'Manifesto', type: 'text', getValue: (row) => row.manifest?.id },
  { key: 'driverName', label: 'Motorista', type: 'text', getValue: (row) => row.driverName },
  { key: 'route', label: 'Rota', type: 'text', getValue: (row) => row.route },
  { key: 'createdAt', label: 'Inicio', type: 'date', getValue: (row) => row.manifest?.createdAt },
];

const cityGeoCacheKey = 'fleetCityGeoCache';
const mapTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const mapTileOptions = {
  attribution: '&copy; OpenStreetMap contributors',
  className: 'fleet-map-tile',
  keepBuffer: 4,
  maxZoom: 18,
  updateWhenZooming: false,
};
const mapOptions = {
  attributionControl: true,
  fadeAnimation: false,
  markerZoomAnimation: false,
  minZoom: 3,
  scrollWheelZoom: false,
  zoomAnimation: false,
  zoomControl: true,
  zoomSnap: 1,
};
const seamlessTilePadding = 3;
const seamlessTileCrop = 1;
const SeamlessTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const size = this.getTileSize();
    const tile = document.createElement('canvas');
    const pixelRatio = window.devicePixelRatio || 1;
    const width = size.x + (seamlessTilePadding * 2);
    const height = size.y + (seamlessTilePadding * 2);
    const context = tile.getContext('2d');
    const image = new Image();

    tile.width = width * pixelRatio;
    tile.height = height * pixelRatio;
    tile.style.width = `${width}px`;
    tile.style.height = `${height}px`;
    tile.style.marginLeft = `-${seamlessTilePadding}px`;
    tile.style.marginTop = `-${seamlessTilePadding}px`;

    context.scale(pixelRatio, pixelRatio);

    image.decoding = 'async';
    image.onload = () => {
      context.drawImage(
        image,
        seamlessTileCrop,
        seamlessTileCrop,
        size.x - (seamlessTileCrop * 2),
        size.y - (seamlessTileCrop * 2),
        0,
        0,
        width,
        height,
      );
      done(null, tile);
    };
    image.onerror = () => {
      done(new Error(`Nao foi possivel carregar o tile ${image.src}`), tile);
    };
    image.src = this.getTileUrl(coords);

    return tile;
  },
});

function createMapTileLayer() {
  return new SeamlessTileLayer(mapTileUrl, mapTileOptions);
}

const stateNames = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapa',
  BA: 'Bahia',
  CE: 'Ceara',
  DF: 'Distrito Federal',
  ES: 'Espirito Santo',
  GO: 'Goias',
  MA: 'Maranhao',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Para',
  PB: 'Paraiba',
  PE: 'Pernambuco',
  PI: 'Piaui',
  PR: 'Parana',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondonia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'Sao Paulo',
  TO: 'Tocantins',
};

const stateFallbackCoordinates = {
  AC: { lat: -9.02, lng: -70.81 },
  AL: { lat: -9.57, lng: -36.78 },
  AM: { lat: -4.08, lng: -63.14 },
  AP: { lat: 1.41, lng: -51.77 },
  BA: { lat: -12.98, lng: -41.7 },
  CE: { lat: -5.21, lng: -39.53 },
  DF: { lat: -15.79, lng: -47.88 },
  ES: { lat: -19.19, lng: -40.34 },
  GO: { lat: -16.64, lng: -49.31 },
  MA: { lat: -5.42, lng: -45.44 },
  MG: { lat: -18.1, lng: -44.38 },
  MS: { lat: -20.51, lng: -54.54 },
  MT: { lat: -12.64, lng: -55.42 },
  PA: { lat: -3.79, lng: -52.48 },
  PB: { lat: -7.28, lng: -36.72 },
  PE: { lat: -8.38, lng: -37.86 },
  PI: { lat: -7.72, lng: -42.73 },
  PR: { lat: -24.89, lng: -51.55 },
  RJ: { lat: -22.25, lng: -42.66 },
  RN: { lat: -5.8, lng: -36.59 },
  RO: { lat: -10.83, lng: -63.34 },
  RR: { lat: 2.08, lng: -61.39 },
  RS: { lat: -30.03, lng: -53.2 },
  SC: { lat: -27.24, lng: -50.22 },
  SE: { lat: -10.57, lng: -37.45 },
  SP: { lat: -22.19, lng: -48.79 },
  TO: { lat: -10.18, lng: -48.33 },
};

const knownCityEntries = [
  ['Rio Branco - AC', -9.9749, -67.8243],
  ['Maceio - AL', -9.6658, -35.7353],
  ['Macapa - AP', 0.0349, -51.0694],
  ['Manaus - AM', -3.119, -60.0217],
  ['Salvador - BA', -12.9777, -38.5016],
  ['Fortaleza - CE', -3.7319, -38.5267],
  ['Brasilia - DF', -15.7939, -47.8828],
  ['Vitoria - ES', -20.3155, -40.3128],
  ['Goiania - GO', -16.6869, -49.2648],
  ['Sao Luis - MA', -2.5307, -44.3068],
  ['Cuiaba - MT', -15.601, -56.0974],
  ['Campo Grande - MS', -20.4697, -54.6201],
  ['Belo Horizonte - MG', -19.9167, -43.9345],
  ['Belem - PA', -1.4558, -48.4902],
  ['Joao Pessoa - PB', -7.1195, -34.845],
  ['Curitiba - PR', -25.4284, -49.2733],
  ['Recife - PE', -8.0476, -34.877],
  ['Teresina - PI', -5.0892, -42.8019],
  ['Rio de Janeiro - RJ', -22.9068, -43.1729],
  ['Natal - RN', -5.7793, -35.2009],
  ['Porto Alegre - RS', -30.0346, -51.2177],
  ['Porto Velho - RO', -8.7608, -63.8999],
  ['Boa Vista - RR', 2.8235, -60.6758],
  ['Florianopolis - SC', -27.5949, -48.5482],
  ['Sao Paulo - SP', -23.5558, -46.6396],
  ['Aracaju - SE', -10.9472, -37.0731],
  ['Palmas - TO', -10.2491, -48.3243],
  ['Camacari - BA', -12.6972, -38.3239],
  ['Feira de Santana - BA', -12.2664, -38.9663],
  ['Lauro de Freitas - BA', -12.8944, -38.3272],
  ['Guarulhos - SP', -23.4543, -46.5337],
  ['Campinas - SP', -22.9056, -47.0608],
  ['Santos - SP', -23.9608, -46.3336],
  ['Sao Bernardo do Campo - SP', -23.6914, -46.5646],
  ['Sorocaba - SP', -23.5015, -47.4526],
  ['Ribeirao Preto - SP', -21.1775, -47.8103],
  ['Jundiai - SP', -23.1857, -46.8978],
  ['Osasco - SP', -23.5329, -46.7918],
  ['Barueri - SP', -23.5112, -46.8764],
  ['Uberlandia - MG', -18.9186, -48.2772],
  ['Contagem - MG', -19.9317, -44.0536],
  ['Betim - MG', -19.9673, -44.1983],
  ['Juiz de Fora - MG', -21.7622, -43.3434],
  ['Governador Valadares - MG', -18.8549, -41.9559],
  ['Montes Claros - MG', -16.7282, -43.8578],
  ['Anapolis - GO', -16.3285, -48.9534],
  ['Rio Verde - GO', -17.7923, -50.9192],
  ['Aparecida de Goiania - GO', -16.8233, -49.2437],
  ['Dourados - MS', -22.2231, -54.812],
  ['Rondonopolis - MT', -16.4673, -54.6372],
  ['Sinop - MT', -11.8604, -55.5091],
  ['Londrina - PR', -23.3045, -51.1696],
  ['Maringa - PR', -23.4205, -51.9331],
  ['Cascavel - PR', -24.9555, -53.4552],
  ['Foz do Iguacu - PR', -25.5163, -54.5854],
  ['Joinville - SC', -26.3044, -48.8487],
  ['Itajai - SC', -26.9101, -48.6705],
  ['Blumenau - SC', -26.9155, -49.0709],
  ['Caxias do Sul - RS', -29.1681, -51.179],
  ['Pelotas - RS', -31.7654, -52.3376],
  ['Novo Hamburgo - RS', -29.6875, -51.1328],
  ['Canoas - RS', -29.9177, -51.1837],
  ['Niteroi - RJ', -22.8832, -43.1034],
  ['Duque de Caxias - RJ', -22.7858, -43.3049],
  ['Nova Iguacu - RJ', -22.7592, -43.4511],
  ['Campos dos Goytacazes - RJ', -21.762, -41.3181],
  ['Serra - ES', -20.1286, -40.3078],
  ['Vila Velha - ES', -20.3478, -40.2949],
  ['Cariacica - ES', -20.2632, -40.4165],
  ['Cachoeiro de Itapemirim - ES', -20.8489, -41.1128],
  ['Juazeiro - BA', -9.4162, -40.5033],
  ['Vitoria da Conquista - BA', -14.8619, -40.8445],
  ['Ilheus - BA', -14.7935, -39.0392],
  ['Barreiras - BA', -12.1477, -44.9953],
  ['Itabuna - BA', -14.7876, -39.2781],
  ['Simoes Filho - BA', -12.7866, -38.4029],
  ['Petrolina - PE', -9.3891, -40.5027],
  ['Caruaru - PE', -8.2846, -35.9699],
  ['Jaboatao dos Guararapes - PE', -8.112, -35.0153],
  ['Ipojuca - PE', -8.3987, -35.0636],
  ['Mossoro - RN', -5.1875, -37.3443],
  ['Campina Grande - PB', -7.2291, -35.8811],
  ['Arapiraca - AL', -9.7525, -36.6615],
  ['Nossa Senhora do Socorro - SE', -10.855, -37.126],
  ['Itabaiana - SE', -10.685, -37.425],
  ['Maracanau - CE', -3.8667, -38.6256],
  ['Sobral - CE', -3.689, -40.3482],
  ['Juazeiro do Norte - CE', -7.2131, -39.3159],
  ['Caucaia - CE', -3.7279, -38.6619],
  ['Imperatriz - MA', -5.5264, -47.4753],
  ['Balsas - MA', -7.5321, -46.0372],
  ['Parnaiba - PI', -2.9055, -41.7754],
  ['Santarem - PA', -2.4431, -54.7083],
  ['Ananindeua - PA', -1.365, -48.372],
  ['Maraba - PA', -5.3686, -49.1176],
  ['Castanhal - PA', -1.297, -47.9214],
  ['Altamira - PA', -3.2033, -52.2066],
  ['Parauapebas - PA', -6.0675, -49.9023],
  ['Ji-Parana - RO', -10.8853, -61.9517],
  ['Ariquemes - RO', -9.9133, -63.0408],
  ['Tabatinga - AM', -4.2521, -69.9386],
  ['Itacoatiara - AM', -3.1386, -58.4449],
  ['Parintins - AM', -2.6374, -56.729],
  ['Cruzeiro do Sul - AC', -7.6276, -72.6756],
  ['Araguaina - TO', -7.1924, -48.2044],
  ['Gurupi - TO', -11.7292, -49.0686],
];

const knownCityCoordinates = knownCityEntries.reduce((coordinates, [label, lat, lng]) => {
  const point = { lat, lng, source: 'catalog' };
  const { name } = parseCityLabel(label);

  coordinates[cityKey(label)] = point;
  if (!coordinates[cityKey(name)]) {
    coordinates[cityKey(name)] = point;
  }

  return coordinates;
}, {});

function activeManifest(manifest) {
  return manifest.truckPlate && !['cancelado', 'cancelada'].includes(normalizeText(manifest.status || ''));
}

function dateValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function latestFirst(left, right) {
  return dateValue(right.createdAt) - dateValue(left.createdAt);
}

function formatDateTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateOnlyValue(value) {
  if (!value) return '';

  const textValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(textValue)) {
    return textValue.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

function getDriverName(manifest, drivers) {
  if (manifest.driverName) return manifest.driverName;

  const driver = drivers.find((item) => onlyDigits(item.cpf) === onlyDigits(manifest.driverCpf));
  return driver?.name || 'Motorista não informado';
}

function manifestDriverKey(manifest) {
  return onlyDigits(manifest.driverCpf) || normalizeText(manifest.driverName);
}

function driverRegistryKeys(driver) {
  return [
    onlyDigits(driver.cpf),
    normalizeText(driver.name),
  ].filter(Boolean);
}

function isFleetDriverManifest(manifest, registeredDriverKeys) {
  return registeredDriverKeys.has(onlyDigits(manifest.driverCpf))
    || registeredDriverKeys.has(normalizeText(manifest.driverName));
}

function parseCityLabel(city) {
  const parts = String(city || '').split(' - ');
  const uf = parts.length > 1 ? parts.pop().trim().toUpperCase() : '';
  const name = parts.join(' - ').trim();

  return { name, uf };
}

function cityKey(city) {
  const { name, uf } = parseCityLabel(city);
  return normalizeText(`${name}${uf ? ` - ${uf}` : ''}`).replace(/\s+/g, ' ').trim();
}

function isValidCoordinate(point) {
  return point
    && Number.isFinite(Number(point.lat))
    && Number.isFinite(Number(point.lng))
    && Number(point.lat) >= -35
    && Number(point.lat) <= 6
    && Number(point.lng) >= -75
    && Number(point.lng) <= -33;
}

function normalizeCoordinate(point, source = 'cache') {
  if (!isValidCoordinate(point)) return null;

  return {
    lat: Number(point.lat),
    lng: Number(point.lng),
    source,
  };
}

function readStoredGeoCache() {
  try {
    const rawValue = localStorage.getItem(cityGeoCacheKey);
    const stored = rawValue ? JSON.parse(rawValue) : {};

    return Object.fromEntries(
      Object.entries(stored)
        .map(([key, point]) => [key, normalizeCoordinate(point)])
        .filter(([, point]) => point),
    );
  } catch {
    return {};
  }
}

function writeStoredGeoCache(cache) {
  try {
    localStorage.setItem(cityGeoCacheKey, JSON.stringify(cache));
  } catch {
    // Cache geografico e opcional.
  }
}

function resolveCityCoordinates(city, geoCache = {}) {
  const key = cityKey(city);
  const knownPoint = knownCityCoordinates[key];

  if (knownPoint) return knownPoint;

  const cachedPoint = normalizeCoordinate(geoCache[key]);
  if (cachedPoint) return cachedPoint;

  const { uf } = parseCityLabel(city);
  const fallbackPoint = stateFallbackCoordinates[uf];

  return fallbackPoint ? { ...fallbackPoint, source: 'state', approximate: true } : null;
}

function unresolvedCity(city, geoCache = {}) {
  const key = cityKey(city);
  if (!key || knownCityCoordinates[key] || geoCache[key]) return false;

  const { uf } = parseCityLabel(city);
  return !stateFallbackCoordinates[uf];
}

function geocodingUrl(city) {
  const { name, uf } = parseCityLabel(city);
  const stateName = stateNames[uf] || uf;
  const query = [name, stateName, 'Brasil'].filter(Boolean).join(', ');
  const url = new URL('https://nominatim.openstreetmap.org/search');

  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('q', query);

  return url.toString();
}

async function geocodeCity(city) {
  const response = await fetch(geocodingUrl(city), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel localizar a cidade');
  }

  const data = await response.json();
  const bestMatch = Array.isArray(data) ? data.find((item) => item?.lat && item?.lon) : null;

  return normalizeCoordinate(bestMatch ? { lat: bestMatch.lat, lng: bestMatch.lon } : null);
}

function routeKey(manifest) {
  return `${cityKey(manifest.origin)}__${cityKey(manifest.destination)}`;
}

function countByCity(manifests, field) {
  const counts = new Map();

  manifests.forEach((manifest) => {
    const value = manifest[field];
    const key = cityKey(value);
    if (!key) return;

    const current = counts.get(key) || { label: value, count: 0 };
    counts.set(key, { ...current, count: current.count + 1 });
  });

  return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'pt-BR'));
}

function pointToLatLng(point) {
  return [point.lat, point.lng];
}

function routeBearing(origin, destination) {
  const lat1 = origin.lat * (Math.PI / 180);
  const lat2 = destination.lat * (Math.PI / 180);
  const deltaLng = (destination.lng - origin.lng) * (Math.PI / 180);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = (Math.cos(lat1) * Math.sin(lat2)) - (Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return bearing - 90;
}

function midpoint(origin, destination, ratio = 0.5) {
  return [
    origin.lat + ((destination.lat - origin.lat) * ratio),
    origin.lng + ((destination.lng - origin.lng) * ratio),
  ];
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

export default function FleetManagementPage({ onNavigate, initialSavedQuery = null, onSavedQueriesChange }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('fleet');
  const [fleetSort, setFleetSort] = useState({ key: 'plate', direction: 'asc' });
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [driverTypeFilter, setDriverTypeFilter] = useState('both');
  const [plateFilter, setPlateFilter] = useState('');
  const [mapDateFilter, setMapDateFilter] = useState('');
  const [mapStatusFilter, setMapStatusFilter] = useState('active');
  const [manifestTypeFilter, setManifestTypeFilter] = useState('Manifesto de Trânsito');
  const [selectedManifestId, setSelectedManifestId] = useState('');
  const [activeHeatRegionKey, setActiveHeatRegionKey] = useState('');
  const [routeQuickQueryName, setRouteQuickQueryName] = useState('');
  const [heatQuickQueryName, setHeatQuickQueryName] = useState('');
  const [quickQueryStatus, setQuickQueryStatus] = useAutoClearMessage();
  const [cityGeoCache, setCityGeoCache] = useState(readStoredGeoCache);
  const [geocodingCities, setGeocodingCities] = useState([]);
  const mapElementRef = useRef(null);
  const routeMapSectionRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const lastRouteSignatureRef = useRef('');
  const heatMapElementRef = useRef(null);
  const heatMapSectionRef = useRef(null);
  const heatMapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const lastHeatSignatureRef = useRef('');

  const vehicles = useMemo(() => getRegisteredVehicles(), []);
  const manifests = useMemo(() => getRegisteredManifests(), []);
  const drivers = useMemo(() => getRegisteredDrivers(), []);
  const registeredDriverKeys = useMemo(
    () => new Set(drivers.flatMap(driverRegistryKeys)),
    [drivers],
  );

  const transitManifests = useMemo(
    () => manifests.filter(activeManifest).sort(latestFirst),
    [manifests],
  );

  const latestManifestByPlate = useMemo(() => {
    const nextMap = new Map();

    transitManifests.forEach((manifest) => {
      const plate = normalizePlate(manifest.truckPlate);
      if (!plate || nextMap.has(plate)) return;
      nextMap.set(plate, manifest);
    });

    return nextMap;
  }, [transitManifests]);

  const currentTransitManifests = useMemo(
    () => [...latestManifestByPlate.values()].sort(latestFirst),
    [latestManifestByPlate],
  );

  const currentTransitManifestIds = useMemo(
    () => new Set(currentTransitManifests.map((manifest) => manifest.id)),
    [currentTransitManifests],
  );

  const fleetRows = useMemo(() => vehicles.map((vehicle) => {
    const plate = normalizePlate(vehicle.plate);
    const manifest = latestManifestByPlate.get(plate) || null;
    const inactive = normalizeText(vehicle.status || '') === 'inativo';
    const inTransit = Boolean(manifest);

    return {
      ...vehicle,
      plate,
      inactive,
      inTransit,
      manifest,
      driverName: manifest ? getDriverName(manifest, drivers) : '',
      route: manifest ? `${manifest.origin || '-'} -> ${manifest.destination || '-'}` : '',
    };
  }), [drivers, latestManifestByPlate, vehicles]);

  const transitRows = fleetRows.filter((row) => row.inTransit);
  const availableRows = fleetRows.filter((row) => !row.inTransit && !row.inactive);
  const inactiveRows = fleetRows.filter((row) => row.inactive);
  const transitDriverKeys = new Set(transitRows.map((row) => onlyDigits(row.manifest?.driverCpf) || normalizeText(row.driverName)));
  const driversInTransit = transitDriverKeys.size;
  const availableDrivers = drivers.filter((driver) => (
    normalizeText(driver.status || '') !== 'inativo' && !transitDriverKeys.has(onlyDigits(driver.cpf) || normalizeText(driver.name))
  ));

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    const rows = fleetRows.filter((row) => {
      const statusMatches = statusFilter === 'all'
        || (statusFilter === 'transit' && row.inTransit)
        || (statusFilter === 'available' && !row.inTransit && !row.inactive)
        || (statusFilter === 'inactive' && row.inactive);
      const queryMatches = !normalizedQuery || normalizeText([
        row.plate,
        row.model,
        row.type,
        row.owner,
        row.driverName,
        row.manifest?.id,
        row.route,
        row.status,
      ].join(' ')).includes(normalizedQuery);

      return statusMatches && queryMatches;
    });

    return sortTableRows(
      rows,
      fleetSortColumns,
      fleetSort,
      (left, right) => left.plate.localeCompare(right.plate, 'pt-BR'),
    );
  }, [fleetRows, fleetSort, query, statusFilter]);

  const originOptions = useMemo(() => uniqueOptions(manifests.map((manifest) => manifest.origin)), [manifests]);
  const destinationOptions = useMemo(() => uniqueOptions(manifests.map((manifest) => manifest.destination)), [manifests]);
  const plateOptions = useMemo(() => uniqueOptions(manifests.map((manifest) => normalizePlate(manifest.truckPlate))), [manifests]);
  const driverOptions = useMemo(() => {
    const options = new Map();

    manifests.forEach((manifest) => {
      const value = manifestDriverKey(manifest);
      if (!value || options.has(value)) return;

      const cpf = onlyDigits(manifest.driverCpf);
      const name = getDriverName(manifest, drivers);
      const label = cpf ? `${name} - ${formatCpf(cpf)}` : name;

      options.set(value, { value, label });
    });

    return [...options.values()].sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'));
  }, [drivers, manifests]);
  const filteredPlateSet = useMemo(() => new Set(filteredRows.map((row) => row.plate)), [filteredRows]);

  const baseFilteredMapManifests = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return manifests
      .filter((manifest) => {
        const currentTransit = currentTransitManifestIds.has(manifest.id);
        const canceled = !activeManifest(manifest);
        const plate = normalizePlate(manifest.truckPlate);
        const statusMatches = mapStatusFilter === 'all'
          || (mapStatusFilter === 'active' && currentTransit)
          || (mapStatusFilter === 'canceled' && canceled);
        const manifestType = manifest.manifestType || 'Manifesto de Trânsito';
        const typeMatches = manifestTypeFilter === 'all' || manifestType === manifestTypeFilter;
        const originMatches = !originFilter || manifest.origin === originFilter;
        const destinationMatches = !destinationFilter || manifest.destination === destinationFilter;
        const driverMatches = !driverFilter || manifestDriverKey(manifest) === driverFilter;
        const fleetDriver = isFleetDriverManifest(manifest, registeredDriverKeys);
        const driverTypeMatches = driverTypeFilter === 'both'
          || (driverTypeFilter === 'fleet' && fleetDriver)
          || (driverTypeFilter === 'third-party' && !fleetDriver);
        const plateMatches = !plateFilter || plate === plateFilter;
        const dateMatches = !mapDateFilter || dateOnlyValue(manifest.createdAt) === mapDateFilter;
        const fleetStatusMatches = statusFilter === 'all'
          || (statusFilter === 'transit' && filteredPlateSet.has(plate))
          || (statusFilter !== 'transit' && false);
        const queryMatches = !normalizedQuery || normalizeText([
          manifest.id,
          manifestType,
          manifest.origin,
          manifest.destination,
          manifest.driverName,
          manifest.driverCpf,
          manifest.truckPlate,
          manifest.truckModel,
          manifest.status,
        ].join(' ')).includes(normalizedQuery);

        return statusMatches
          && typeMatches
          && originMatches
          && destinationMatches
          && driverMatches
          && driverTypeMatches
          && plateMatches
          && dateMatches
          && fleetStatusMatches
          && queryMatches;
      })
      .sort(latestFirst);
  }, [
    destinationFilter,
    driverFilter,
    driverTypeFilter,
    currentTransitManifestIds,
    filteredPlateSet,
    manifests,
    mapDateFilter,
    mapStatusFilter,
    manifestTypeFilter,
    originFilter,
    plateFilter,
    query,
    registeredDriverKeys,
    statusFilter,
  ]);

  const filteredMapManifests = useMemo(() => {
    if (!activeHeatRegionKey) {
      return baseFilteredMapManifests;
    }

    return baseFilteredMapManifests.filter((manifest) => (
      cityKey(manifest.origin) === activeHeatRegionKey
      || cityKey(manifest.destination) === activeHeatRegionKey
    ));
  }, [activeHeatRegionKey, baseFilteredMapManifests]);

  const citiesToResolve = useMemo(
    () => uniqueOptions(filteredMapManifests.flatMap((manifest) => [manifest.origin, manifest.destination])),
    [filteredMapManifests],
  );

  const citiesPendingGeocode = useMemo(() => citiesToResolve.filter((city) => {
    const key = cityKey(city);
    return key && !knownCityCoordinates[key] && !cityGeoCache[key];
  }), [citiesToResolve, cityGeoCache]);

  useEffect(() => {
    let ignore = false;
    const nextCities = citiesPendingGeocode.slice(0, 6);

    if (!nextCities.length) {
      setGeocodingCities([]);
      return undefined;
    }

    setGeocodingCities(nextCities);

    async function loadCoordinates() {
      const updates = {};

      for (const [index, city] of nextCities.entries()) {
        if (ignore) return;
        if (index > 0) await sleep(700);

        try {
          const point = await geocodeCity(city);
          if (point) {
            updates[cityKey(city)] = point;
          }
        } catch {
          // A rota continua usando coordenada aproximada por UF quando disponivel.
        }
      }

      if (!ignore && Object.keys(updates).length) {
        setCityGeoCache((currentCache) => {
          const nextCache = { ...currentCache, ...updates };
          writeStoredGeoCache(nextCache);
          return nextCache;
        });
      }

      if (!ignore) {
        setGeocodingCities([]);
      }
    }

    loadCoordinates();

    return () => {
      ignore = true;
    };
  }, [citiesPendingGeocode]);

  const routeGroups = useMemo(() => {
    const groups = new Map();

    filteredMapManifests.forEach((manifest) => {
      const originPoint = resolveCityCoordinates(manifest.origin, cityGeoCache);
      const destinationPoint = resolveCityCoordinates(manifest.destination, cityGeoCache);

      if (!originPoint || !destinationPoint) return;

      const key = routeKey(manifest);
      const canceled = !activeManifest(manifest);
      const currentGroup = groups.get(key) || {
        key,
        originLabel: manifest.origin || 'Origem nao informada',
        destinationLabel: manifest.destination || 'Destino nao informado',
        originPoint,
        destinationPoint,
        manifests: [],
        count: 0,
        activeCount: 0,
        canceledCount: 0,
        approximate: Boolean(originPoint.approximate || destinationPoint.approximate),
      };

      currentGroup.manifests.push(manifest);
      currentGroup.count += 1;
      currentGroup.activeCount += canceled ? 0 : 1;
      currentGroup.canceledCount += canceled ? 1 : 0;
      currentGroup.approximate = currentGroup.approximate || Boolean(originPoint.approximate || destinationPoint.approximate);
      groups.set(key, currentGroup);
    });

    return [...groups.values()]
      .map((group) => {
        const sortedManifests = [...group.manifests].sort(latestFirst);
        return {
          ...group,
          manifests: sortedManifests,
          latestManifest: sortedManifests[0],
        };
      })
      .sort((left, right) => right.count - left.count || latestFirst(left.latestManifest, right.latestManifest));
  }, [cityGeoCache, filteredMapManifests]);

  const mapTrips = useMemo(() => filteredMapManifests
    .map((manifest) => {
      const originPoint = resolveCityCoordinates(manifest.origin, cityGeoCache);
      const destinationPoint = resolveCityCoordinates(manifest.destination, cityGeoCache);

      if (!originPoint || !destinationPoint) return null;

      return {
        manifest,
        originPoint,
        destinationPoint,
        approximate: Boolean(originPoint.approximate || destinationPoint.approximate),
        canceled: !activeManifest(manifest),
      };
    })
    .filter(Boolean), [cityGeoCache, filteredMapManifests]);

  const heatPoints = useMemo(() => {
    const points = new Map();

    filteredMapManifests.forEach((manifest) => {
      [
        { field: 'origin', countKey: 'originCount' },
        { field: 'destination', countKey: 'destinationCount' },
      ].forEach(({ field, countKey }) => {
        const label = manifest[field];
        const key = cityKey(label);
        const point = resolveCityCoordinates(label, cityGeoCache);

        if (!key || !point) return;

        const currentPoint = points.get(key) || {
          key,
          label,
          point,
          originCount: 0,
          destinationCount: 0,
          total: 0,
        };

        currentPoint[countKey] += 1;
        currentPoint.total += 1;
        currentPoint.point = point;
        points.set(key, currentPoint);
      });
    });

    return [...points.values()]
      .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, 'pt-BR'));
  }, [cityGeoCache, filteredMapManifests]);

  const maxHeatCount = Math.max(1, ...heatPoints.map((point) => point.total));
  const topOriginRegions = useMemo(() => countByCity(filteredMapManifests, 'origin').slice(0, 5), [filteredMapManifests]);
  const topDestinationRegions = useMemo(() => countByCity(filteredMapManifests, 'destination').slice(0, 5), [filteredMapManifests]);
  const heatSummary = useMemo(() => ({
    origins: heatPoints.reduce((sum, point) => sum + point.originCount, 0),
    destinations: heatPoints.reduce((sum, point) => sum + point.destinationCount, 0),
    regions: heatPoints.length,
  }), [heatPoints]);

  const selectedTrip = useMemo(() => {
    const matchedTrip = mapTrips.find((trip) => trip.manifest.id === selectedManifestId);
    return matchedTrip || mapTrips[0] || null;
  }, [mapTrips, selectedManifestId]);

  const operationalSummary = useMemo(() => {
    const plates = new Set();
    let fleetDrivers = 0;
    let thirdPartyDrivers = 0;

    filteredMapManifests.forEach((manifest) => {
      const plate = normalizePlate(manifest.truckPlate);
      if (plate) plates.add(plate);

      if (isFleetDriverManifest(manifest, registeredDriverKeys)) {
        fleetDrivers += 1;
      } else {
        thirdPartyDrivers += 1;
      }
    });

    return {
      vehicles: plates.size,
      fleetDrivers,
      thirdPartyDrivers,
      routes: routeGroups.length,
    };
  }, [filteredMapManifests, registeredDriverKeys, routeGroups.length]);

  const unmappedCities = useMemo(
    () => citiesToResolve.filter((city) => unresolvedCity(city, cityGeoCache)).slice(0, 4),
    [citiesToResolve, cityGeoCache],
  );

  useEffect(() => {
    if (!activeHeatRegionKey) return;

    const activeRegionStillAvailable = baseFilteredMapManifests.some((manifest) => (
      cityKey(manifest.origin) === activeHeatRegionKey
      || cityKey(manifest.destination) === activeHeatRegionKey
    ));

    if (!activeRegionStillAvailable) {
      setActiveHeatRegionKey('');
    }
  }, [activeHeatRegionKey, baseFilteredMapManifests]);

  useEffect(() => {
    if (!filteredMapManifests.length) {
      if (selectedManifestId) setSelectedManifestId('');
      return;
    }

    if (!filteredMapManifests.some((manifest) => manifest.id === selectedManifestId)) {
      setSelectedManifestId(filteredMapManifests[0].id);
    }
  }, [filteredMapManifests, selectedManifestId]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, mapOptions);

    createMapTileLayer().addTo(map);

    L.control.scale({ imperial: false, metric: true }).addTo(map);
    map.fitBounds(brazilBounds, { padding: [18, 18] });
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      lastRouteSignatureRef.current = '';
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
    }

    const layer = L.layerGroup().addTo(map);
    const bounds = L.latLngBounds([]);
    const renderedTrips = [...mapTrips].sort((left, right) => {
      const leftSelected = left.manifest.id === selectedManifestId ? 1 : 0;
      const rightSelected = right.manifest.id === selectedManifestId ? 1 : 0;
      return leftSelected - rightSelected;
    });

    renderedTrips.forEach((trip) => {
      const selected = selectedManifestId === trip.manifest.id;
      const routeColor = selected ? '#e87722' : trip.canceled ? '#7b8794' : '#1a7a72';
      const routeWeight = selected ? 5 : 3;
      const latLngs = [pointToLatLng(trip.originPoint), pointToLatLng(trip.destinationPoint)];
      const selectTrip = () => setSelectedManifestId(trip.manifest.id);
      const tooltip = [
        `${trip.manifest.id}: ${trip.manifest.origin} -> ${trip.manifest.destination}`,
        normalizePlate(trip.manifest.truckPlate),
        getDriverName(trip.manifest, drivers),
        trip.approximate ? 'coordenada aproximada' : '',
      ].filter(Boolean).join(' | ');

      const line = L.polyline(latLngs, {
        color: routeColor,
        dashArray: trip.canceled ? '8 8' : trip.approximate ? '5 7' : null,
        opacity: selected ? 0.96 : 0.72,
        weight: routeWeight,
      }).addTo(layer);

      line.bindTooltip(tooltip, { sticky: true });
      line.on('click', selectTrip);

      const arrow = L.marker(midpoint(trip.originPoint, trip.destinationPoint, 0.84), {
        icon: L.divIcon({
          className: selected ? 'fleet-map-arrow fleet-map-arrow--selected' : 'fleet-map-arrow',
          html: `<span style="--route-angle:${routeBearing(trip.originPoint, trip.destinationPoint)}deg"></span>`,
          iconAnchor: [13, 13],
          iconSize: [26, 26],
        }),
      }).addTo(layer);

      arrow.bindTooltip(tooltip, { sticky: true });
      arrow.on('click', selectTrip);

      [
        { point: trip.originPoint, type: 'origin', label: trip.manifest.origin },
        { point: trip.destinationPoint, type: 'destination', label: trip.manifest.destination },
      ].forEach((stop) => {
        L.circleMarker(pointToLatLng(stop.point), {
          color: '#ffffff',
          fillColor: stop.type === 'origin' ? '#1a7a72' : '#e87722',
          fillOpacity: selected ? 0.98 : 0.82,
          opacity: 1,
          radius: selected ? 8 : 6,
          weight: selected ? 3 : 2,
        })
          .bindTooltip(`${stop.label} | ${trip.manifest.id}`, { sticky: true })
          .on('click', selectTrip)
          .addTo(layer);
      });

      bounds.extend(latLngs[0]);
      bounds.extend(latLngs[1]);
    });

    routeLayerRef.current = layer;

    const routeSignature = mapTrips
      .map((trip) => `${trip.manifest.id}:${trip.originPoint.lat}:${trip.originPoint.lng}:${trip.destinationPoint.lat}:${trip.destinationPoint.lng}`)
      .join('|');

    if (routeSignature && bounds.isValid() && lastRouteSignatureRef.current !== routeSignature) {
      map.fitBounds(bounds.pad(0.18), {
        animate: false,
        maxZoom: 6,
        padding: [24, 24],
      });
      lastRouteSignatureRef.current = routeSignature;
    } else if (!routeSignature && lastRouteSignatureRef.current !== 'empty') {
      map.fitBounds(brazilBounds, { padding: [18, 18] });
      lastRouteSignatureRef.current = 'empty';
    }

    window.setTimeout(() => map.invalidateSize(), 0);
  }, [drivers, mapTrips, selectedManifestId]);

  useEffect(() => {
    if (!heatMapElementRef.current || heatMapRef.current) return undefined;

    const map = L.map(heatMapElementRef.current, mapOptions);

    createMapTileLayer().addTo(map);

    L.control.scale({ imperial: false, metric: true }).addTo(map);
    map.fitBounds(brazilBounds, { padding: [18, 18] });
    heatMapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      heatMapRef.current = null;
      heatLayerRef.current = null;
      lastHeatSignatureRef.current = '';
    };
  }, []);

  useEffect(() => {
    const map = heatMapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
    }

    const layer = L.layerGroup().addTo(map);
    const bounds = L.latLngBounds([]);

    heatPoints.forEach((region) => {
      const dominance = region.originCount === region.destinationCount
        ? 'mixed'
        : region.originCount > region.destinationCount ? 'origin' : 'destination';
      const heatColor = dominance === 'origin' ? '#1a7a72' : dominance === 'destination' ? '#e87722' : '#4f46e5';
      const heatRatio = region.total / maxHeatCount;
      const radius = 12 + (Math.sqrt(heatRatio) * 34);
      const latLng = pointToLatLng(region.point);
      const tooltip = [
        region.label,
        `${region.total} ponto(s)`,
        `Origem ${region.originCount}`,
        `Destino ${region.destinationCount}`,
        region.point.approximate ? 'coordenada aproximada' : '',
      ].filter(Boolean).join(' | ');

      L.circleMarker(latLng, {
        color: heatColor,
        fillColor: heatColor,
        fillOpacity: 0.12,
        opacity: 0.18,
        radius: radius + 16,
        weight: 1,
      }).addTo(layer);

      L.circleMarker(latLng, {
        color: heatColor,
        fillColor: heatColor,
        fillOpacity: 0.48,
        opacity: 0,
        radius,
        stroke: false,
      })
        .bindTooltip(tooltip, { sticky: true })
        .addTo(layer);

      L.marker(latLng, {
        icon: L.divIcon({
          className: `fleet-map-count-badge fleet-heatmap-badge fleet-heatmap-badge--${dominance}`,
          html: `<span>${region.total}</span>`,
          iconAnchor: [14, 14],
          iconSize: [28, 28],
        }),
      })
        .bindTooltip(tooltip, { sticky: true })
        .addTo(layer);

      bounds.extend(latLng);
    });

    heatLayerRef.current = layer;

    const heatSignature = heatPoints
      .map((point) => `${point.key}:${point.total}:${point.originCount}:${point.destinationCount}:${point.point.lat}:${point.point.lng}`)
      .join('|');

    if (heatSignature && bounds.isValid() && lastHeatSignatureRef.current !== heatSignature) {
      map.fitBounds(bounds.pad(0.22), {
        animate: false,
        maxZoom: 6,
        padding: [24, 24],
      });
      lastHeatSignatureRef.current = heatSignature;
    } else if (!heatSignature && lastHeatSignatureRef.current !== 'empty') {
      map.fitBounds(brazilBounds, { padding: [18, 18] });
      lastHeatSignatureRef.current = 'empty';
    }

    window.setTimeout(() => map.invalidateSize(), 0);
  }, [heatPoints, maxHeatCount]);

  const selectedManifest = manifests.find((manifest) => manifest.id === selectedManifestId) || null;

  function currentMapFilters() {
    return {
      query,
      statusFilter,
      originFilter,
      destinationFilter,
      driverFilter,
      driverTypeFilter,
      plateFilter,
      mapDateFilter,
      mapStatusFilter,
      manifestTypeFilter,
      activeHeatRegionKey,
      selectedManifestId,
    };
  }

  function normalizeOptionValue(value, options, fallback = '') {
    if (fallback === value || options.some((option) => option.value === value || option === value)) {
      return value || fallback;
    }

    return fallback;
  }

  function applySavedMapFilters(filters) {
    if (!filters || typeof filters !== 'object') return;

    setQuery(filters.query || '');
    setStatusFilter(normalizeOptionValue(filters.statusFilter, statusFilters, 'all'));
    setOriginFilter(originOptions.includes(filters.originFilter) ? filters.originFilter : '');
    setDestinationFilter(destinationOptions.includes(filters.destinationFilter) ? filters.destinationFilter : '');
    setDriverFilter(driverOptions.some((driver) => driver.value === filters.driverFilter) ? filters.driverFilter : '');
    setDriverTypeFilter(normalizeOptionValue(filters.driverTypeFilter, driverTypeFilters, 'both'));
    setPlateFilter(plateOptions.includes(filters.plateFilter) ? filters.plateFilter : '');
    setMapDateFilter(filters.mapDateFilter || '');
    setMapStatusFilter(normalizeOptionValue(filters.mapStatusFilter, mapStatusFilters, 'active'));
    setManifestTypeFilter(normalizeOptionValue(filters.manifestTypeFilter, manifestTypeFilters, manifestTypeFilters[2]?.value || 'all'));
    setActiveHeatRegionKey(filters.activeHeatRegionKey || '');
    setSelectedManifestId(filters.selectedManifestId || '');
  }

  useEffect(() => {
    if (!initialSavedQuery?.filters) return;

    applySavedMapFilters(initialSavedQuery.filters);

    if (initialSavedQuery.reportType === 'fleet-heat-map') {
      setHeatQuickQueryName(initialSavedQuery.name || '');
      window.setTimeout(() => heatMapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } else {
      setRouteQuickQueryName(initialSavedQuery.name || '');
      window.setTimeout(() => routeMapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }

    setQuickQueryStatus(`Consulta rapida "${initialSavedQuery.name}" carregada`);
  }, [initialSavedQuery?.id, initialSavedQuery?.updatedAt, initialSavedQuery?.appliedAt]);

  function handleSaveMapQuickQuery(reportType) {
    const isHeatMap = reportType === 'fleet-heat-map';
    const result = saveQuickQuery({
      name: isHeatMap ? heatQuickQueryName : routeQuickQueryName,
      reportType,
      pageId: 'fleet-management',
      module: 'Operacao',
      icon: 'operation',
      filters: currentMapFilters(),
    });

    if (result.error) {
      setQuickQueryStatus(result.error);
      return;
    }

    if (isHeatMap) {
      setHeatQuickQueryName(result.quickQuery.name);
    } else {
      setRouteQuickQueryName(result.quickQuery.name);
    }

    onSavedQueriesChange?.(result.queries);
    setQuickQueryStatus(`Consulta rapida "${result.quickQuery.name}" salva`);
  }

  function handleMetricClick(metric, nextStatusFilter = statusFilter) {
    setSelectedMetric(metric);
    setStatusFilter(nextStatusFilter);
  }

  function openVehicle(vehiclePlate) {
    try {
      localStorage.setItem(pendingVehiclePlateKey, normalizePlate(vehiclePlate));
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }

    onNavigate?.({ pageId: 'vehicle-registration', label: 'Cadastrar Veículo' });
  }

  function openManifest(manifestId) {
    if (!manifestId) return;

    try {
      localStorage.setItem(pendingManifestIdKey, manifestId);
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }

    onNavigate?.({ pageId: 'generate-manifest', label: 'Gerar Manifesto' });
  }

  function toggleHeatRegionFilter(regionKey) {
    setActiveHeatRegionKey((currentRegionKey) => (currentRegionKey === regionKey ? '' : regionKey));
    setSelectedManifestId('');
  }

  const metricDetails = {
    fleet: {
      title: 'Frota cadastrada',
      count: fleetRows.length,
      items: fleetRows,
      type: 'vehicle',
    },
    transit: {
      title: 'Veículos em trânsito',
      count: transitRows.length,
      items: transitRows,
      type: 'vehicle',
    },
    available: {
      title: 'Veículos disponíveis',
      count: availableRows.length,
      items: availableRows,
      type: 'vehicle',
    },
    inactive: {
      title: 'Veículos inativos',
      count: inactiveRows.length,
      items: inactiveRows,
      type: 'vehicle',
    },
    driversTransit: {
      title: 'Motoristas em trânsito',
      count: driversInTransit,
      items: transitRows,
      type: 'driverTransit',
    },
    driversAvailable: {
      title: 'Motoristas disponíveis',
      count: availableDrivers.length,
      items: availableDrivers,
      type: 'driverAvailable',
    },
    manifests: {
      title: 'Manifestos ativos',
      count: currentTransitManifests.length,
      items: currentTransitManifests,
      type: 'manifest',
    },
  };
  const activeDetail = metricDetails[selectedMetric] || metricDetails.fleet;

  return (
    <section className="fleet-management-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gestão de Frota</h1>
          <p className="page-kicker">Acompanhamento dos veículos em operação por manifesto</p>
        </div>
      </header>

      <div className="fleet-metrics-grid">
        <button type="button" className={selectedMetric === 'fleet' ? 'fleet-metric fleet-metric--active' : 'fleet-metric'} onClick={() => handleMetricClick('fleet', 'all')}>
          <Truck size={20} strokeWidth={2.2} />
          <span>Frota cadastrada</span>
          <strong>{fleetRows.length}</strong>
        </button>

        <button type="button" className={selectedMetric === 'transit' ? 'fleet-metric fleet-metric--transit fleet-metric--active' : 'fleet-metric fleet-metric--transit'} onClick={() => handleMetricClick('transit', 'transit')}>
          <Route size={20} strokeWidth={2.2} />
          <span>Veículos em trânsito</span>
          <strong>{transitRows.length}</strong>
        </button>

        <button type="button" className={selectedMetric === 'available' ? 'fleet-metric fleet-metric--active' : 'fleet-metric'} onClick={() => handleMetricClick('available', 'available')}>
          <Truck size={20} strokeWidth={2.2} />
          <span>Disponíveis</span>
          <strong>{availableRows.length}</strong>
        </button>

        <button type="button" className={selectedMetric === 'driversTransit' ? 'fleet-metric fleet-metric--active' : 'fleet-metric'} onClick={() => handleMetricClick('driversTransit', 'transit')}>
          <UserRound size={20} strokeWidth={2.2} />
          <span>Motoristas em trânsito</span>
          <strong>{driversInTransit}</strong>
        </button>

        <button type="button" className={selectedMetric === 'driversAvailable' ? 'fleet-metric fleet-metric--active' : 'fleet-metric'} onClick={() => handleMetricClick('driversAvailable', 'available')}>
          <UserRound size={20} strokeWidth={2.2} />
          <span>Motoristas disponíveis</span>
          <strong>{availableDrivers.length}</strong>
        </button>

        <button type="button" className={selectedMetric === 'manifests' ? 'fleet-metric fleet-metric--active' : 'fleet-metric'} onClick={() => handleMetricClick('manifests', 'transit')}>
          <FileText size={20} strokeWidth={2.2} />
          <span>Manifestos ativos</span>
          <strong>{currentTransitManifests.length}</strong>
        </button>
      </div>

      <form className="finance-form fleet-filter-form" onSubmit={(event) => event.preventDefault()}>
        <div className="fleet-toolbar">
          <div className="lookup-field fleet-search">
            <input
              type="search"
              placeholder="Pesquisar por placa, modelo, motorista, manifesto ou rota"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" className="icon-button" aria-label="Pesquisar frota" title="Pesquisar frota" tabIndex={-1}>
              <Search size={17} strokeWidth={2.2} />
            </button>
          </div>

          <div className="lookup-mode fleet-status-filter" aria-label="Filtrar frota por status">
            {statusFilters.map((filter) => (
              <button
                type="button"
                className={statusFilter === filter.value ? 'lookup-mode-button active' : 'lookup-mode-button'}
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setSelectedMetric(filter.value === 'transit' ? 'transit' : filter.value === 'available' ? 'available' : filter.value === 'inactive' ? 'inactive' : 'fleet');
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div className="fleet-layout">
        <section className="registered-launches-panel fleet-table-panel" aria-labelledby="fleet-table-title">
          <div className="registered-launches-header">
            <h2 id="fleet-table-title">Situação da frota</h2>
            <div>
              <span>{filteredRows.length} veículo(s)</span>
            </div>
          </div>

          <div className="registered-launches-table-wrap">
            <table className="registered-launches-table fleet-table">
              <thead>
                <tr>
                  <SortableTableHeader
                    columns={fleetSortColumns}
                    sort={fleetSort}
                    onSortChange={setFleetSort}
                  />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.plate}
                    onDoubleClick={() => {
                      if (row.inTransit) openManifest(row.manifest.id);
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        className="fleet-plate-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openVehicle(row.plate);
                        }}
                      >
                        {row.plate}
                      </button>
                      <span>{row.model || row.type}</span>
                    </td>
                    <td>
                      <span className={row.inTransit ? 'fleet-status-pill fleet-status-pill--transit' : row.inactive ? 'fleet-status-pill fleet-status-pill--inactive' : 'fleet-status-pill'}>
                        {fleetStatusLabel(row)}
                      </span>
                    </td>
                    <td>{row.manifest?.id || '-'}</td>
                    <td>
                      {row.driverName || '-'}
                      {row.manifest?.driverCpf && <span>{formatCpf(row.manifest.driverCpf)}</span>}
                    </td>
                    <td>{row.route || '-'}</td>
                    <td>{formatDateTime(row.manifest?.createdAt) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredRows.length && <div className="empty-list">Nenhum veículo encontrado</div>}
          </div>
        </section>

        <section className="selection-panel fleet-transit-panel" aria-labelledby="fleet-transit-title">
          <div className="selection-panel-header">
            <h2 id="fleet-transit-title">{activeDetail.title}</h2>
            <strong>{activeDetail.count}</strong>
          </div>

          <div className="selected-list-box fleet-transit-list">
            {activeDetail.items.map((item) => {
              if (activeDetail.type === 'driverAvailable') {
                return (
                  <div className="fleet-transit-row" key={`driver-${item.cpf}`}>
                    <div>
                      <strong>{formatCpf(item.cpf)}</strong>
                      <span>{item.category ? `CNH ${item.category}` : item.status}</span>
                    </div>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.phone || 'Telefone não informado'}</span>
                    </div>
                  </div>
                );
              }

              if (activeDetail.type === 'manifest') {
                return (
                  <button
                    type="button"
                    className={selectedManifestId === item.id ? 'fleet-transit-row fleet-transit-row--button fleet-transit-row--selected' : 'fleet-transit-row fleet-transit-row--button'}
                    key={`manifest-${item.id}`}
                    onClick={() => setSelectedManifestId(item.id)}
                    onDoubleClick={() => openManifest(item.id)}
                  >
                    <div>
                      <strong>{item.id}</strong>
                      <span>{item.truckPlate}</span>
                    </div>
                    <div>
                      <strong>{getDriverName(item, drivers)}</strong>
                      <span>{`${item.origin} -> ${item.destination}`}</span>
                    </div>
                  </button>
                );
              }

              return (
                <div className="fleet-transit-row" key={`${activeDetail.type}-${item.plate}-${item.manifest?.id || item.status}`}>
                  <div>
                    <strong>{activeDetail.type === 'driverTransit' ? item.driverName : item.plate}</strong>
                    <span>{activeDetail.type === 'driverTransit' ? formatCpf(item.manifest?.driverCpf) : item.manifest?.id || item.status}</span>
                  </div>
                  <div>
                    <strong>{activeDetail.type === 'driverTransit' ? item.plate : item.driverName || item.model}</strong>
                    <span>{item.route || item.model || item.type}</span>
                  </div>
                </div>
              );
            })}

            {!activeDetail.items.length && <div className="empty-list">Nenhuma informação encontrada</div>}
          </div>
        </section>
      </div>

      <section className="registered-launches-panel fleet-map-panel" aria-labelledby="fleet-map-title" ref={routeMapSectionRef}>
        <div className="registered-launches-header">
          <h2 id="fleet-map-title">Mapa operacional de rotas</h2>
          <div>
            <span>{filteredMapManifests.length} manifesto(s)</span>
          </div>
        </div>

        <div className="fleet-map-filters">
          <label>
            <span>Status</span>
            <select value={mapStatusFilter} onChange={(event) => setMapStatusFilter(event.target.value)}>
              {mapStatusFilters.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipo manifesto</span>
            <select value={manifestTypeFilter} onChange={(event) => setManifestTypeFilter(event.target.value)}>
              {manifestTypeFilters.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipo motorista</span>
            <select value={driverTypeFilter} onChange={(event) => setDriverTypeFilter(event.target.value)}>
              {driverTypeFilters.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Motorista</span>
            <select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}>
              <option value="">Todos</option>
              {driverOptions.map((driver) => (
                <option value={driver.value} key={driver.value}>{driver.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Placa</span>
            <select value={plateFilter} onChange={(event) => setPlateFilter(event.target.value)}>
              <option value="">Todas</option>
              {plateOptions.map((plate) => (
                <option value={plate} key={plate}>{plate}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Data</span>
            <input
              type="date"
              value={mapDateFilter}
              onChange={(event) => setMapDateFilter(event.target.value)}
            />
          </label>

          <label>
            <span>Origem</span>
            <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value)}>
              <option value="">Todas</option>
              {originOptions.map((origin) => (
                <option value={origin} key={origin}>{origin}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Destino</span>
            <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
              <option value="">Todos</option>
              {destinationOptions.map((destination) => (
                <option value={destination} key={destination}>{destination}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="fleet-map-save-query">
          <label>
            <span>Nome da consulta rapida</span>
            <input
              type="text"
              maxLength={maxQuickQueryNameLength}
              placeholder="Ate 25 caracteres"
              value={routeQuickQueryName}
              onChange={(event) => setRouteQuickQueryName(event.target.value.slice(0, maxQuickQueryNameLength))}
            />
          </label>
          <button type="button" className="secondary-button" onClick={() => handleSaveMapQuickQuery('fleet-route-map')}>
            <Save size={15} strokeWidth={2.2} />
            Salvar consulta padrao
          </button>
          <span className="status-line" aria-live="polite">{quickQueryStatus}</span>
        </div>

        <div className="fleet-map-wrap">
          <div className="fleet-map-shell">
            <div
              className="fleet-route-map"
              ref={mapElementRef}
              role="region"
              aria-label="Mapa real do Brasil com rotas de manifestos"
            />
            {!routeGroups.length && (
              <div className="fleet-map-empty">
                Nenhuma rota com coordenada para os filtros atuais
              </div>
            )}
          </div>

          <aside className="fleet-map-summary">
            <div className="fleet-map-summary-title">
              <MapPinned size={19} strokeWidth={2.2} />
              <strong>{selectedManifest?.id || selectedTrip?.manifest?.id || 'Nenhum manifesto destacado'}</strong>
            </div>
            {selectedManifest ? (
              <>
                <span>{`${selectedManifest.origin} -> ${selectedManifest.destination}`}</span>
                <span>{selectedManifest.truckPlate} - {selectedManifest.truckModel}</span>
                <span>{getDriverName(selectedManifest, drivers)}</span>
                <span>{isFleetDriverManifest(selectedManifest, registeredDriverKeys) ? 'Motorista da frota' : 'Motorista terceiro'}</span>
                <button type="button" className="secondary-button" onClick={() => openManifest(selectedManifest.id)}>Abrir manifesto</button>
              </>
            ) : (
              <span>Selecione uma rota no mapa</span>
            )}

            {selectedTrip && (
              <div className="fleet-route-highlight">
                <h3>Viagem selecionada</h3>
                <span>{`${selectedTrip.manifest.origin} -> ${selectedTrip.manifest.destination}`}</span>
                <strong>{normalizePlate(selectedTrip.manifest.truckPlate) || '-'}</strong>
                <small>{`${getDriverName(selectedTrip.manifest, drivers)} | ${formatDateTime(selectedTrip.manifest.createdAt) || 'Sem início'}`}</small>
              </div>
            )}

            <div className="fleet-map-insight-block">
              <h3>Viagens filtradas</h3>
              {filteredMapManifests.slice(0, 8).map((manifest) => (
                <button
                  type="button"
                  className={selectedManifestId === manifest.id ? 'fleet-trip-card fleet-trip-card--active' : 'fleet-trip-card'}
                  key={manifest.id}
                  onClick={() => setSelectedManifestId(manifest.id)}
                >
                  <div>
                    <strong>{manifest.id}</strong>
                    <span>{`${manifest.origin} -> ${manifest.destination}`}</span>
                  </div>
                  <div>
                    <strong>{normalizePlate(manifest.truckPlate) || '-'}</strong>
                    <span>{isFleetDriverManifest(manifest, registeredDriverKeys) ? 'Frota' : 'Terceiro'}</span>
                  </div>
                </button>
              ))}
              {!filteredMapManifests.length && <span>Nenhuma viagem encontrada</span>}
            </div>

            <div className="fleet-map-insight-block">
              <h3>Resumo da operação</h3>
              <div className="fleet-operation-summary">
                <div>
                  <span>Veículos</span>
                  <strong>{operationalSummary.vehicles}</strong>
                </div>
                <div>
                  <span>Rotas</span>
                  <strong>{operationalSummary.routes}</strong>
                </div>
                <div>
                  <span>Frotistas</span>
                  <strong>{operationalSummary.fleetDrivers}</strong>
                </div>
                <div>
                  <span>Terceiros</span>
                  <strong>{operationalSummary.thirdPartyDrivers}</strong>
                </div>
              </div>
            </div>

            {geocodingCities.length > 0 && (
              <span>{`Localizando coordenadas: ${geocodingCities.join(', ')}`}</span>
            )}

            {unmappedCities.length > 0 && (
              <span>{`Sem coordenada: ${unmappedCities.join(', ')}`}</span>
            )}
          </aside>
        </div>
      </section>

      <section className="registered-launches-panel fleet-map-panel fleet-heatmap-panel" aria-labelledby="fleet-heatmap-title" ref={heatMapSectionRef}>
        <div className="registered-launches-header">
          <h2 id="fleet-heatmap-title">Mapa de calor das principais regiões de origem e destino</h2>
          <div>
            <span>{heatSummary.regions} região(ões)</span>
          </div>
        </div>

        <div className="fleet-map-filters">
          <label>
            <span>Status</span>
            <select value={mapStatusFilter} onChange={(event) => setMapStatusFilter(event.target.value)}>
              {mapStatusFilters.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipo manifesto</span>
            <select value={manifestTypeFilter} onChange={(event) => setManifestTypeFilter(event.target.value)}>
              {manifestTypeFilters.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tipo motorista</span>
            <select value={driverTypeFilter} onChange={(event) => setDriverTypeFilter(event.target.value)}>
              {driverTypeFilters.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Motorista</span>
            <select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}>
              <option value="">Todos</option>
              {driverOptions.map((driver) => (
                <option value={driver.value} key={driver.value}>{driver.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Placa</span>
            <select value={plateFilter} onChange={(event) => setPlateFilter(event.target.value)}>
              <option value="">Todas</option>
              {plateOptions.map((plate) => (
                <option value={plate} key={plate}>{plate}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Data</span>
            <input
              type="date"
              value={mapDateFilter}
              onChange={(event) => setMapDateFilter(event.target.value)}
            />
          </label>

          <label>
            <span>Origem</span>
            <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value)}>
              <option value="">Todas</option>
              {originOptions.map((origin) => (
                <option value={origin} key={origin}>{origin}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Destino</span>
            <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
              <option value="">Todos</option>
              {destinationOptions.map((destination) => (
                <option value={destination} key={destination}>{destination}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="fleet-map-save-query">
          <label>
            <span>Nome da consulta rapida</span>
            <input
              type="text"
              maxLength={maxQuickQueryNameLength}
              placeholder="Ate 25 caracteres"
              value={heatQuickQueryName}
              onChange={(event) => setHeatQuickQueryName(event.target.value.slice(0, maxQuickQueryNameLength))}
            />
          </label>
          <button type="button" className="secondary-button" onClick={() => handleSaveMapQuickQuery('fleet-heat-map')}>
            <Save size={15} strokeWidth={2.2} />
            Salvar consulta padrao
          </button>
          <span className="status-line" aria-live="polite">{quickQueryStatus}</span>
        </div>

        <div className="fleet-map-wrap">
          <div className="fleet-map-shell">
            <div
              className="fleet-route-map fleet-heatmap-map"
              ref={heatMapElementRef}
              role="region"
              aria-label="Mapa de calor de origens e destinos dos manifestos"
            />
            {!heatPoints.length && (
              <div className="fleet-map-empty">
                Nenhuma região com coordenada para os filtros atuais
              </div>
            )}
          </div>

          <aside className="fleet-map-summary">
            <div className="fleet-map-summary-title">
              <MapPinned size={19} strokeWidth={2.2} />
              <strong>Regiões mais movimentadas</strong>
            </div>

            <div className="fleet-route-highlight">
              <h3>Concentração filtrada</h3>
              <span>{`${filteredMapManifests.length} manifesto(s)`}</span>
              <strong>{heatSummary.regions}</strong>
              <small>{`Origem ${heatSummary.origins} | Destino ${heatSummary.destinations}`}</small>
            </div>

            <div className="fleet-map-insight-block">
              <h3>Principais regiões</h3>
              {heatPoints.slice(0, 8).map((region) => (
                <button
                  type="button"
                  className={activeHeatRegionKey === region.key ? 'fleet-heat-region-card fleet-heat-region-card--active' : 'fleet-heat-region-card'}
                  key={region.key}
                  aria-pressed={activeHeatRegionKey === region.key}
                  onClick={() => toggleHeatRegionFilter(region.key)}
                >
                  <div>
                    <strong>{region.label}</strong>
                    <span>{`${region.originCount} origem(ns) | ${region.destinationCount} destino(s)`}</span>
                  </div>
                  <div>
                    <strong>{region.total}</strong>
                    <span>pontos</span>
                  </div>
                </button>
              ))}
              {!heatPoints.length && <span>Nenhuma região encontrada</span>}
            </div>

            <div className="fleet-map-insight-block">
              <h3>Origem x destino</h3>
              <div className="fleet-point-columns">
                <div>
                  <strong>Origem</strong>
                  {topOriginRegions.map((region) => (
                    <span key={region.label}>{`${region.label}: ${region.count}`}</span>
                  ))}
                  {!topOriginRegions.length && <span>Nenhuma origem</span>}
                </div>
                <div>
                  <strong>Destino</strong>
                  {topDestinationRegions.map((region) => (
                    <span key={region.label}>{`${region.label}: ${region.count}`}</span>
                  ))}
                  {!topDestinationRegions.length && <span>Nenhum destino</span>}
                </div>
              </div>
            </div>

            {unmappedCities.length > 0 && (
              <span>{`Sem coordenada: ${unmappedCities.join(', ')}`}</span>
            )}
          </aside>
        </div>
      </section>
    </section>
  );
}
