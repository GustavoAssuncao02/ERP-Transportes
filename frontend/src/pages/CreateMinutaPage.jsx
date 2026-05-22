import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import ReportPanel from '../components/ReportPanel.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { currency, normalizeText, todayValue } from '../data/financeData.js';
import { getRegisteredSuppliers } from '../data/managementRegistry.js';
import {
  formatCpf,
  getRegisteredDrivers,
  getRegisteredVehicles,
  normalizePlate,
  onlyDigits,
} from '../data/transportRegistry.js';
import { getMinutaDeletionBlockers } from '../data/deletionRules.js';
import { deactivateMinuta, deleteMinuta, getRegisteredMinutas, saveMinuta } from '../data/operationRegistry.js';
import {
  addressFieldSet,
  blankAddressFields,
  copyAddressFields,
  defaultAddressFields,
  normalizeAddressFields,
} from '../utils/address.js';
import { fetchCityOptions, initialCityOptions } from '../utils/cities.js';
import { formatReportDate, isDateInRange, normalizeReportText, uniqueSortedOptions } from '../utils/report.js';
import { identifierNumberValue, sortTableRows } from '../utils/tableSort.js';

const pickupAddressFields = addressFieldSet('pickup', 'pickupAddress');
const deliveryAddressFields = addressFieldSet('delivery', 'deliveryAddress');

const cargoTypes = [
  'Carga geral',
  'Carga fracionada',
  'Carga lotacao',
  'Produto perigoso',
  'Carga refrigerada',
  'Carga indivisivel',
];

const freightTypes = [
  'CIF',
  'FOB',
  'A pagar',
  'Pago',
  'Terceiros',
];

const minutaStatuses = [
  'Rascunho',
  'Emitida',
  'Em coleta',
  'Em transporte',
  'Entregue',
  'Cancelada',
];
const minutaReportDefaultFilters = {
  search: '',
  periodField: 'issueDate',
  periodStart: '',
  periodEnd: '',
  status: '',
  freightType: '',
  cargoType: '',
  originCity: '',
  destinationCity: '',
  senderName: '',
  recipientName: '',
  driverName: '',
  vehiclePlate: '',
};

const minutaSortColumns = [
  { key: 'id', label: 'Minuta', type: 'number', defaultDirection: 'asc', getValue: (minuta) => identifierNumberValue(minuta.id) },
  { key: 'issueDate', label: 'Emissao', type: 'date', defaultDirection: 'asc', getValue: (minuta) => minuta.issueDate },
  { key: 'senderName', label: 'Cliente/remetente', type: 'text', getValue: (minuta) => minuta.senderName },
  { key: 'recipientName', label: 'Destinatario', type: 'text', getValue: (minuta) => minuta.recipientName },
  { key: 'originCity', label: 'Origem', type: 'text', getValue: (minuta) => minuta.originCity },
  { key: 'destinationCity', label: 'Destino', type: 'text', getValue: (minuta) => minuta.destinationCity },
  { key: 'freightValue', label: 'Frete', type: 'number', defaultDirection: 'asc', getValue: (minuta) => minuta.freightValue },
  { key: 'status', label: 'Status', type: 'text', getValue: (minuta) => minuta.status },
];

const minutaReportColumns = [
  { key: 'id', label: 'Minuta', pdfWidth: 18, getValue: (minuta) => minuta.id, render: (minuta) => <strong>{minuta.id}</strong> },
  { key: 'issueDate', label: 'Emissao', pdfWidth: 10, getValue: (minuta) => formatReportDate(minuta.issueDate) },
  { key: 'senderName', label: 'Cliente/remetente', pdfWidth: 24, getValue: (minuta) => minuta.senderName },
  { key: 'recipientName', label: 'Destinatario', pdfWidth: 24, getValue: (minuta) => minuta.recipientName },
  { key: 'originCity', label: 'Origem', pdfWidth: 18, getValue: (minuta) => minuta.originCity },
  { key: 'destinationCity', label: 'Destino', pdfWidth: 18, getValue: (minuta) => minuta.destinationCity },
  { key: 'driverName', label: 'Motorista', pdfWidth: 20, getValue: (minuta) => minuta.driverName || '-' },
  { key: 'vehiclePlate', label: 'Placa', pdfWidth: 8, getValue: (minuta) => minuta.vehiclePlate || '-' },
  { key: 'freightType', label: 'Frete', pdfWidth: 8, getValue: (minuta) => minuta.freightType },
  { key: 'status', label: 'Status', pdfWidth: 12, getValue: (minuta) => minuta.status },
  { key: 'freightValue', label: 'Valor frete', pdfWidth: 12, getValue: (minuta) => currency(minuta.freightValue) },
];

function reportFilterLabel(value, allLabel = 'Todos') {
  return value || allLabel;
}

const defaultMinutas = [
  {
    id: 'MIN-202605-00001',
    issueDate: '2026-05-18',
    senderName: 'Auto Posto Central LTDA',
    senderDocument: '12.345.678/0001-90',
    recipientName: 'Transportes Parceiros SA',
    recipientDocument: '45.678.901/0001-33',
    pickupZipCode: '',
    pickupStreet: 'Av. Tancredo Neves',
    pickupNumber: '1000',
    pickupDistrict: '',
    pickupAddress: 'Av. Tancredo Neves, 1000 - Salvador - BA',
    deliveryZipCode: '',
    deliveryStreet: 'Rua Sao Bento',
    deliveryNumber: '440',
    deliveryDistrict: '',
    deliveryAddress: 'Rua Sao Bento, 440 - Feira de Santana - BA',
    originCity: 'Salvador - BA',
    destinationCity: 'Feira de Santana - BA',
    cargoType: 'Carga geral',
    volumeQuantity: '12',
    cargoWeight: '2400',
    merchandiseValue: '18500',
    linkedInvoice: 'NF-8742',
    freightType: 'CIF',
    freightValue: '1450',
    driverCpf: '52998224725',
    driverName: 'Joao Pereira Santos',
    vehiclePlate: 'ABC1D23',
    vehicleModel: 'Volvo FH 540',
    notes: 'Minuta criada para coleta programada.',
    status: 'Emitida',
    createdAt: '2026-05-18T08:30:00.000Z',
  },
];

function cityLabel(city) {
  const uf = city.microrregiao?.mesorregiao?.UF?.sigla
    || city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
    || '';

  return uf ? `${city.nome} - ${uf}` : city.nome;
}

function readCachedCities() {
  try {
    const cached = JSON.parse(localStorage.getItem(cityCacheKey) || 'null');

    if (cached?.options?.length) {
      return cached;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedCities(options) {
  try {
    localStorage.setItem(cityCacheKey, JSON.stringify({
      updatedAt: Date.now(),
      options,
    }));
  } catch {
    // O cache é apenas otimização; a tela segue usando fallback ou dados carregados.
  }
}

function shouldRefreshCities(cache) {
  return !cache?.updatedAt || Date.now() - cache.updatedAt > cityCacheTtlMs;
}

function readMinutas() {
  try {
    const rawValue = localStorage.getItem(minutaStorageKey);
    if (rawValue !== null) {
      const stored = JSON.parse(rawValue);
      return Array.isArray(stored) ? stored.map(normalizeMinutaAddressFields) : defaultMinutas.map(normalizeMinutaAddressFields);
    }
  } catch {
    return defaultMinutas.map(normalizeMinutaAddressFields);
  }

  return defaultMinutas.map(normalizeMinutaAddressFields);
}

function writeMinutas(minutas) {
  localStorage.setItem(minutaStorageKey, JSON.stringify(minutas.map(normalizeMinutaAddressFields)));
}

function nextMinutaNumber() {
  const now = new Date();
  const key = 'minutaSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `MIN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

function dateDistance(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.abs(date.getTime() - Date.now());
}

function blankMinuta() {
  return {
    id: '',
    issueDate: todayValue(),
    senderName: '',
    senderDocument: '',
    recipientName: '',
    recipientDocument: '',
    ...blankAddressFields(pickupAddressFields),
    ...blankAddressFields(deliveryAddressFields),
    originCity: '',
    destinationCity: '',
    cargoType: 'Carga geral',
    volumeQuantity: '',
    cargoWeight: '',
    merchandiseValue: '',
    linkedInvoice: '',
    freightType: 'CIF',
    freightValue: '',
    driverCpf: '',
    driverName: '',
    vehiclePlate: '',
    vehicleModel: '',
    notes: '',
    status: 'Rascunho',
    createdAt: '',
  };
}

function normalizeMinutaAddressFields(minuta) {
  return normalizeAddressFields(
    normalizeAddressFields(minuta, pickupAddressFields),
    deliveryAddressFields,
  );
}

function copySupplierAddressTo(targetFields, supplier) {
  return copyAddressFields(supplier, targetFields, defaultAddressFields);
}

export default function CreateMinutaPage({ initialSavedQuery = null, onSavedQueriesChange }) {
  const [minutas, setMinutas] = useState(getRegisteredMinutas);
  const [form, setForm] = useState(blankMinuta);
  const [cities, setCities] = useState(initialCityOptions);
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [minutaSort, setMinutaSort] = useState({ key: 'id', direction: 'asc' });
  const [message, setMessage] = useAutoClearMessage();

  useEffect(() => {
    let ignore = false;
    async function loadCities() {
      try {
        const nextCities = await fetchCityOptions();

        if (!ignore) {
          setCities(nextCities);
        }
      } catch {
        if (!ignore) {
          setCities(initialCityOptions());
        }
      }
    }

    loadCities();

    return () => {
      ignore = true;
    };
  }, []);

  const suppliers = useMemo(
    () => getRegisteredSuppliers().map((supplier) => {
      const normalizedSupplier = normalizeAddressFields(supplier);

      return {
        id: normalizedSupplier.id || normalizedSupplier.cnpj,
        name: normalizedSupplier.name,
        document: normalizedSupplier.cnpj,
        status: normalizedSupplier.active ? 'Ativo' : 'Inativo',
        ...normalizedSupplier,
      };
    }),
    [],
  );
  const drivers = useMemo(() => getRegisteredDrivers(), []);
  const vehicles = useMemo(() => getRegisteredVehicles(), []);
  const sortedMinutas = useMemo(
    () => sortTableRows(
      minutas,
      minutaSortColumns,
      minutaSort,
      (left, right) => identifierNumberValue(left.id) - identifierNumberValue(right.id),
    ),
    [minutaSort, minutas],
  );
  const minutasByClosestDate = useMemo(
    () => [...minutas].sort((left, right) => dateDistance(left.createdAt || left.issueDate) - dateDistance(right.createdAt || right.issueDate)),
    [minutas],
  );
  const lookupItems = useMemo(() => {
    const query = normalizeText(lookupSearch);

    if (lookupType === 'minuta') {
      if (!query) return minutasByClosestDate;
      return minutasByClosestDate.filter((minuta) => (
        normalizeText(`${minuta.id} ${minuta.senderName} ${minuta.recipientName} ${minuta.linkedInvoice} ${minuta.status}`).includes(query)
      ));
    }

    if (lookupType === 'sender' || lookupType === 'recipient') {
      if (!query) return suppliers;
      return suppliers.filter((supplier) => normalizeText(`${supplier.name} ${supplier.document} ${supplier.status}`).includes(query));
    }

    if (lookupType === 'driver') {
      if (!query) return drivers;
      return drivers.filter((driver) => normalizeText(`${driver.name} ${formatCpf(driver.cpf)} ${driver.cnh} ${driver.status}`).includes(query));
    }

    if (lookupType === 'vehicle') {
      if (!query) return vehicles;
      return vehicles.filter((vehicle) => normalizeText(`${vehicle.plate} ${vehicle.model} ${vehicle.owner} ${vehicle.status}`).includes(query));
    }

    return [];
  }, [drivers, lookupSearch, lookupType, minutasByClosestDate, suppliers, vehicles]);

  const lookupTitles = {
    minuta: 'Pesquisar minuta',
    sender: 'Pesquisar cliente/remetente',
    recipient: 'Pesquisar destinatario',
    driver: 'Pesquisar motorista',
    vehicle: 'Pesquisar veiculo',
  };
  const lookupPlaceholder = lookupType === 'minuta'
    ? 'Pesquisar por minuta, cliente, destinatario, nota fiscal ou status'
    : lookupType === 'driver'
      ? 'Pesquisar por nome, CPF, CNH ou status'
      : lookupType === 'vehicle'
        ? 'Pesquisar por placa, modelo, proprietario ou status'
        : 'Pesquisar por nome, CNPJ ou status';
  const originOptions = form.originCity && !cities.includes(form.originCity) ? [form.originCity, ...cities] : cities;
  const destinationOptions = form.destinationCity && !cities.includes(form.destinationCity) ? [form.destinationCity, ...cities] : cities;
  const minutaReportFields = useMemo(() => [
    { type: 'text', key: 'search', label: 'Pesquisar', placeholder: 'Minuta, NF, cliente, rota, motorista ou placa' },
    {
      type: 'dateRange',
      key: 'period',
      label: 'Periodo',
      fieldKey: 'periodField',
      startKey: 'periodStart',
      endKey: 'periodEnd',
      options: [
        { value: 'issueDate', label: 'Emissao' },
        { value: 'createdAt', label: 'Cadastro' },
      ],
    },
    { type: 'select', key: 'status', label: 'Status', options: minutaStatuses },
    { type: 'select', key: 'freightType', label: 'Tipo de frete', options: freightTypes },
    { type: 'select', key: 'cargoType', label: 'Tipo da carga', options: cargoTypes },
    { type: 'select', key: 'originCity', label: 'Origem', options: uniqueSortedOptions(minutas.map((minuta) => minuta.originCity)) },
    { type: 'select', key: 'destinationCity', label: 'Destino', options: uniqueSortedOptions(minutas.map((minuta) => minuta.destinationCity)) },
    { type: 'select', key: 'senderName', label: 'Cliente/remetente', options: uniqueSortedOptions(minutas.map((minuta) => minuta.senderName)) },
    { type: 'select', key: 'recipientName', label: 'Destinatario', options: uniqueSortedOptions(minutas.map((minuta) => minuta.recipientName)) },
    { type: 'select', key: 'driverName', label: 'Motorista', options: uniqueSortedOptions(minutas.map((minuta) => minuta.driverName)) },
    { type: 'select', key: 'vehiclePlate', label: 'Placa', options: uniqueSortedOptions(minutas.map((minuta) => minuta.vehiclePlate)) },
  ], [minutas]);

  function buildMinutaReportRows(filters) {
    const query = normalizeReportText(filters.search);

    return sortedMinutas.filter((minuta) => {
      const periodValue = filters.periodField === 'createdAt' ? minuta.createdAt : minuta.issueDate;

      return (!query || normalizeReportText([
        minuta.id,
        minuta.senderName,
        minuta.recipientName,
        minuta.linkedInvoice,
        minuta.originCity,
        minuta.destinationCity,
        minuta.driverName,
        minuta.vehiclePlate,
        minuta.status,
      ].join(' ')).includes(query))
        && (!filters.status || minuta.status === filters.status)
        && (!filters.freightType || minuta.freightType === filters.freightType)
        && (!filters.cargoType || minuta.cargoType === filters.cargoType)
        && (!filters.originCity || minuta.originCity === filters.originCity)
        && (!filters.destinationCity || minuta.destinationCity === filters.destinationCity)
        && (!filters.senderName || minuta.senderName === filters.senderName)
        && (!filters.recipientName || minuta.recipientName === filters.recipientName)
        && (!filters.driverName || minuta.driverName === filters.driverName)
        && (!filters.vehiclePlate || minuta.vehiclePlate === filters.vehiclePlate)
        && isDateInRange(periodValue, filters.periodStart, filters.periodEnd);
    });
  }

  function minutaReportMetadata(filters, rows) {
    const periodOption = minutaReportFields
      .find((field) => field.type === 'dateRange')
      ?.options.find((option) => option.value === filters.periodField);

    return [
      ['Pesquisa', reportFilterLabel(filters.search)],
      ['Periodo por', periodOption?.label || 'Emissao'],
      ['Periodo de', reportFilterLabel(filters.periodStart)],
      ['Periodo ate', reportFilterLabel(filters.periodEnd)],
      ['Status', reportFilterLabel(filters.status)],
      ['Frete', reportFilterLabel(filters.freightType)],
      ['Carga', reportFilterLabel(filters.cargoType)],
      ['Origem', reportFilterLabel(filters.originCity)],
      ['Destino', reportFilterLabel(filters.destinationCity)],
      ['Motorista', reportFilterLabel(filters.driverName)],
      ['Placa', reportFilterLabel(filters.vehiclePlate)],
      ['Resultado', `${rows.length} minuta(s)`],
    ];
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function updateFields(updates) {
    setForm((current) => ({ ...current, ...updates }));
    setMessage('');
  }

  function loadMinuta(minuta) {
    setForm({ ...blankMinuta(), ...normalizeMinutaAddressFields(minuta) });
    setMessage(`Minuta ${minuta.id} carregada para edicao`);
  }

  function handleMinutaNumberChange(value) {
    const nextId = value.toUpperCase();
    setForm((current) => ({ ...current, id: nextId }));

    const existingMinuta = minutas.find((minuta) => normalizeText(minuta.id) === normalizeText(nextId));
    if (existingMinuta) {
      loadMinuta(existingMinuta);
      return;
    }

    setMessage('');
  }

  function openLookup(type) {
    setLookupType(type);
    setLookupSearch('');
  }

  function closeLookup() {
    setLookupType(null);
    setLookupSearch('');
  }

  function selectLookupItem(item) {
    if (lookupType === 'minuta') {
      loadMinuta(item);
      closeLookup();
      return;
    }

    if (lookupType === 'sender') {
      setForm((current) => ({
        ...current,
        senderName: item.name,
        senderDocument: item.document,
        ...copySupplierAddressTo(pickupAddressFields, item),
      }));
    }

    if (lookupType === 'recipient') {
      setForm((current) => ({
        ...current,
        recipientName: item.name,
        recipientDocument: item.document,
        ...copySupplierAddressTo(deliveryAddressFields, item),
      }));
    }

    if (lookupType === 'driver') {
      setForm((current) => ({
        ...current,
        driverCpf: onlyDigits(item.cpf),
        driverName: item.name,
      }));
    }

    if (lookupType === 'vehicle') {
      setForm((current) => ({
        ...current,
        vehiclePlate: normalizePlate(item.plate),
        vehicleModel: item.model,
      }));
    }

    closeLookup();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (form.issueDate > todayValue()) {
      setMessage('A data de emissao nao pode ser superior a data de hoje');
      return;
    }

    if (!form.senderName) {
      setMessage('Selecione o cliente/remetente');
      return;
    }

    if (!form.recipientName) {
      setMessage('Selecione o destinatario');
      return;
    }

    if (!form.driverName) {
      setMessage('Selecione o motorista');
      return;
    }

    if (!form.vehiclePlate) {
      setMessage('Selecione o veiculo/placa');
      return;
    }

    const id = form.id.trim().toUpperCase() || nextMinutaNumber();
    const nextMinuta = normalizeMinutaAddressFields({
      ...form,
      id,
      createdAt: form.createdAt || new Date().toISOString(),
    });
    const existingIndex = minutas.findIndex((minuta) => normalizeText(minuta.id) === normalizeText(id));
    const nextMinutas = saveMinuta(nextMinuta);
    setMinutas(nextMinutas);
    setForm(nextMinuta);
    setMessage(existingIndex >= 0 ? `Minuta ${id} atualizada` : `Minuta ${id} criada`);
  }

  function handleReset() {
    setForm(blankMinuta());
    closeLookup();
    setMessage('');
  }

  function handleDelete() {
    const currentMinuta = minutas.find((minuta) => normalizeText(minuta.id) === normalizeText(form.id));

    if (!currentMinuta) {
      setMessage('Selecione uma minuta cadastrada para excluir');
      return;
    }

    const blockers = getMinutaDeletionBlockers(currentMinuta);

    if (blockers.length) {
      const nextMinutas = deactivateMinuta(currentMinuta.id);
      const inactiveMinuta = nextMinutas.find((minuta) => minuta.id === currentMinuta.id);
      setMinutas(nextMinutas);
      setForm(inactiveMinuta || { ...currentMinuta, status: 'Cancelada' });
      setMessage(`Minuta possui vinculo em ${blockers.join(', ')} e foi cancelada`);
      return;
    }

    const nextMinutas = deleteMinuta(currentMinuta.id);
    setMinutas(nextMinutas);
    setForm(blankMinuta());
    setMessage(`Minuta ${currentMinuta.id} excluida`);
  }

  return (
    <section className="create-minuta-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Criar Minuta</h1>
          <p className="page-kicker">Registro operacional da minuta com coleta, entrega, carga, frete, motorista e veiculo</p>
        </div>
      </header>

      <form className="finance-form create-minuta-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <div className="field">
            <span>Numero da minuta</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Gerado ao salvar ou informe uma minuta existente"
                value={form.id}
                onChange={(event) => handleMinutaNumberChange(event.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar minuta"
                title="Pesquisar minuta"
                tabIndex={-1}
                onClick={() => openLookup('minuta')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Data de emissao</span>
            <input type="date" max={todayValue()} value={form.issueDate} onChange={(event) => updateField('issueDate', event.target.value)} required />
          </label>

          <label className="field">
            <span>Status da minuta</span>
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)} required>
              {minutaStatuses.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo de frete</span>
            <select value={form.freightType} onChange={(event) => updateField('freightType', event.target.value)} required>
              {freightTypes.map((type) => (
                <option value={type} key={type}>{type}</option>
              ))}
            </select>
          </label>

          <div className="field field--span-2">
            <span>Cliente/remetente</span>
            <div className="lookup-field">
              <input type="text" value={form.senderName} placeholder="Pesquise um fornecedor cadastrado" readOnly required />
              <button type="button" className="icon-button" aria-label="Pesquisar cliente/remetente" title="Pesquisar cliente/remetente" tabIndex={-1} onClick={() => openLookup('sender')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field field--span-2">
            <span>Destinatario</span>
            <div className="lookup-field">
              <input type="text" value={form.recipientName} placeholder="Pesquise um fornecedor cadastrado" readOnly required />
              <button type="button" className="icon-button" aria-label="Pesquisar destinatario" title="Pesquisar destinatario" tabIndex={-1} onClick={() => openLookup('recipient')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="form-section-title field--span-4">Endereço de coleta</div>

          <AddressFields
            values={form}
            fields={pickupAddressFields}
            context="de coleta"
            onChange={updateField}
            onChangeMany={updateFields}
            onStatus={setMessage}
            required
          />

          <div className="form-section-title field--span-4">Endereço de entrega</div>

          <AddressFields
            values={form}
            fields={deliveryAddressFields}
            context="de entrega"
            onChange={updateField}
            onChangeMany={updateFields}
            onStatus={setMessage}
            required
          />

          <label className="field field--span-2">
            <span>Cidade/UF de origem</span>
            <select value={form.originCity} onChange={(event) => updateField('originCity', event.target.value)} required>
              <option value="">Selecione a origem</option>
              {originOptions.map((city) => (
                <option value={city} key={`origin-${city}`}>{city}</option>
              ))}
            </select>
          </label>

          <label className="field field--span-2">
            <span>Cidade/UF de destino</span>
            <select value={form.destinationCity} onChange={(event) => updateField('destinationCity', event.target.value)} required>
              <option value="">Selecione o destino</option>
              {destinationOptions.map((city) => (
                <option value={city} key={`destination-${city}`}>{city}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo da carga</span>
            <select value={form.cargoType} onChange={(event) => updateField('cargoType', event.target.value)} required>
              {cargoTypes.map((type) => (
                <option value={type} key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Quantidade de volumes</span>
            <input type="number" min="1" step="1" value={form.volumeQuantity} onChange={(event) => updateField('volumeQuantity', event.target.value)} required />
          </label>

          <label className="field">
            <span>Peso da carga</span>
            <input type="number" min="0" step="0.01" placeholder="kg" value={form.cargoWeight} onChange={(event) => updateField('cargoWeight', event.target.value)} required />
          </label>

          <label className="field">
            <span>Valor da mercadoria</span>
            <input type="number" min="0" step="0.01" placeholder="0,00" value={form.merchandiseValue} onChange={(event) => updateField('merchandiseValue', event.target.value)} required />
          </label>

          <label className="field field--span-2">
            <span>Nota fiscal vinculada</span>
            <input type="text" value={form.linkedInvoice} onChange={(event) => updateField('linkedInvoice', event.target.value)} required />
          </label>

          <label className="field">
            <span>Valor do frete</span>
            <input type="number" min="0" step="0.01" placeholder="0,00" value={form.freightValue} onChange={(event) => updateField('freightValue', event.target.value)} required />
          </label>

          <label className="field">
            <span>Total declarado</span>
            <input type="text" value={currency(form.merchandiseValue)} readOnly tabIndex={-1} />
          </label>

          <div className="field field--span-2">
            <span>Motorista</span>
            <div className="lookup-field">
              <input type="text" value={form.driverName} placeholder="Pesquise o motorista cadastrado" readOnly required />
              <button type="button" className="icon-button" aria-label="Pesquisar motorista" title="Pesquisar motorista" tabIndex={-1} onClick={() => openLookup('driver')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field field--span-2">
            <span>Veiculo/placa</span>
            <div className="lookup-field">
              <input
                type="text"
                value={form.vehiclePlate ? `${form.vehiclePlate} - ${form.vehicleModel}` : ''}
                placeholder="Pesquise o veiculo cadastrado"
                readOnly
                required
              />
              <button type="button" className="icon-button" aria-label="Pesquisar veiculo" title="Pesquisar veiculo" tabIndex={-1} onClick={() => openLookup('vehicle')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field field--span-4">
            <span>Observacoes</span>
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar minuta</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir minuta
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="minutas-title">
        <div className="registered-launches-header">
          <h2 id="minutas-title">Minutas cadastradas</h2>
          <div>
            <span>{sortedMinutas.length} minuta(s)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <SortableTableHeader
                  columns={minutaSortColumns}
                  sort={minutaSort}
                  onSortChange={setMinutaSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedMinutas.map((minuta) => (
                <tr key={minuta.id} onClick={() => loadMinuta(minuta)}>
                  <td><strong>{minuta.id}</strong></td>
                  <td>{minuta.issueDate}</td>
                  <td>{minuta.senderName}</td>
                  <td>{minuta.recipientName}</td>
                  <td>{minuta.originCity}</td>
                  <td>{minuta.destinationCity}</td>
                  <td>{currency(minuta.freightValue)}</td>
                  <td>{minuta.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReportPanel
        title="Relatorio de minutas"
        titleId="minuta-report-title"
        pageId="create-minuta"
        reportType="minuta-report"
        module="Operacao"
        icon="operation"
        defaultFilters={minutaReportDefaultFilters}
        fields={minutaReportFields}
        columns={minutaReportColumns}
        buildRows={buildMinutaReportRows}
        filenamePrefix="relatorio-minutas"
        initialSavedQuery={initialSavedQuery}
        onSavedQueriesChange={onSavedQueriesChange}
        getSummary={(rows) => `${rows.length} minuta(s)`}
        getMetadata={minutaReportMetadata}
        getRowKey={(minuta) => minuta.id}
      />

      {lookupType && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="minuta-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="minuta-lookup-title">{lookupTitles[lookupType] || 'Pesquisar'}</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder={lookupPlaceholder}
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  {lookupType === 'minuta' ? (
                    <tr>
                      <th>Minuta</th>
                      <th>Emissao</th>
                      <th>Cliente/remetente</th>
                      <th>Destinatario</th>
                      <th>Status</th>
                    </tr>
                  ) : lookupType === 'driver' ? (
                    <tr>
                      <th>CPF</th>
                      <th>Nome</th>
                      <th>CNH</th>
                      <th>Status</th>
                    </tr>
                  ) : lookupType === 'vehicle' ? (
                    <tr>
                      <th>Placa</th>
                      <th>Modelo</th>
                      <th>Proprietario</th>
                      <th>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Codigo</th>
                      <th>Fornecedor</th>
                      <th>CNPJ</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {lookupItems.map((item) => (
                    <tr key={lookupType === 'minuta' ? item.id : lookupType === 'driver' ? item.cpf : lookupType === 'vehicle' ? item.plate : item.id} onClick={() => selectLookupItem(item)}>
                      {lookupType === 'minuta' ? (
                        <>
                          <td>{item.id}</td>
                          <td>{item.issueDate}</td>
                          <td>{item.senderName}</td>
                          <td>{item.recipientName}</td>
                          <td>{item.status}</td>
                        </>
                      ) : lookupType === 'driver' ? (
                        <>
                          <td>{formatCpf(item.cpf)}</td>
                          <td>{item.name}</td>
                          <td>{item.cnh} / {item.category}</td>
                          <td>{item.status}</td>
                        </>
                      ) : lookupType === 'vehicle' ? (
                        <>
                          <td>{item.plate}</td>
                          <td>{item.model}</td>
                          <td>{item.owner}</td>
                          <td>{item.status}</td>
                        </>
                      ) : (
                        <>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.document}</td>
                          <td>{item.status}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!lookupItems.length && <div className="lookup-empty">Nenhuma opcao encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
