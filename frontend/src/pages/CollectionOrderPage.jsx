import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import ReportPanel from '../components/ReportPanel.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { currency, normalizeText, todayValue } from '../data/financeData.js';
import { getRegisteredSuppliers, getRegisteredUnits } from '../data/managementRegistry.js';
import {
  formatCpf,
  getRegisteredDrivers,
  getRegisteredVehicles,
  normalizePlate,
  onlyDigits,
} from '../data/transportRegistry.js';
import { getCollectionOrderDeletionBlockers } from '../data/deletionRules.js';
import { deactivateCollectionOrder, deleteCollectionOrder, getRegisteredCollectionOrders, saveCollectionOrder } from '../data/operationRegistry.js';
import { formatReportDate, formatReportDateTime, isDateInRange, isReportOptionSelected, reportSelectionLabel, uniqueSortedOptions } from '../utils/report.js';
import { sortTableRows } from '../utils/tableSort.js';

const collectionOrderStorageKey = 'collectionOrders';

const defaultCollectionOrders = [
  {
    id: 'OC-202605-00001',
    requestDate: '2026-05-18',
    senderName: 'Auto Posto Central LTDA',
    recipientName: 'JTD Armazéns Salvador',
    cargoDescription: 'Peças automotivas paletizadas',
    volumeQuantity: '12',
    cargoWeight: '2400',
    merchandiseValue: '18500',
    invoiceKey: '29260512345678000190550010000087421000087425',
    collectionDateTime: '2026-05-18T14:30',
    driverCpf: '52998224725',
    driverName: 'João Pereira Santos',
    vehiclePlate: 'ABC1D23',
    vehicleModel: 'Volvo FH 540',
    notes: 'Coleta com conferência de volumes no carregamento.',
    status: 'Agendada',
  },
];

const orderStatuses = ['Solicitada', 'Agendada', 'Em coleta', 'Coletada', 'Cancelada'];
const collectionOrderReportBaseFilters = {
  orderIds: [],
  periodField: 'requestDate',
  periodStart: '',
  periodEnd: '',
  status: [],
  senderName: [],
  recipientName: [],
  driverName: [],
  vehiclePlate: [],
};

function collectionOrderNumber(orderId) {
  const numericParts = String(orderId || '').match(/\d+/g);
  return numericParts ? Number(numericParts.join('')) : 0;
}

const collectionOrderSortColumns = [
  { key: 'id', label: 'Ordem', type: 'number', getValue: (order) => collectionOrderNumber(order.id) },
  { key: 'requestDate', label: 'Solicitação', type: 'date', getValue: (order) => order.requestDate },
  { key: 'senderName', label: 'Remetente', type: 'text', getValue: (order) => order.senderName },
  { key: 'recipientName', label: 'Destinatário', type: 'text', getValue: (order) => order.recipientName },
  { key: 'driverName', label: 'Motorista', type: 'text', getValue: (order) => order.driverName },
  { key: 'vehiclePlate', label: 'Veículo', type: 'text', getValue: (order) => `${order.vehiclePlate} ${order.vehicleModel}` },
  { key: 'status', label: 'Status', type: 'text', getValue: (order) => order.status },
];

const collectionOrderReportColumns = [
  { key: 'id', label: 'Ordem', pdfWidth: 18, getValue: (order) => order.id, render: (order) => <strong>{order.id}</strong> },
  { key: 'requestDate', label: 'Solicitacao', pdfWidth: 10, getValue: (order) => formatReportDate(order.requestDate) },
  { key: 'collectionDateTime', label: 'Coleta', pdfWidth: 16, getValue: (order) => formatReportDateTime(order.collectionDateTime) },
  { key: 'senderName', label: 'Remetente', pdfWidth: 24, getValue: (order) => order.senderName },
  { key: 'recipientName', label: 'Destinatario', pdfWidth: 24, getValue: (order) => order.recipientName },
  { key: 'driverName', label: 'Motorista', pdfWidth: 20, getValue: (order) => order.driverName || '-' },
  { key: 'vehiclePlate', label: 'Placa', pdfWidth: 8, getValue: (order) => order.vehiclePlate || '-' },
  { key: 'status', label: 'Status', pdfWidth: 10, getValue: (order) => order.status },
  { key: 'merchandiseValue', label: 'Valor', pdfWidth: 12, getValue: (order) => currency(order.merchandiseValue) },
];

function reportFilterLabel(value, allLabel = 'Todos') {
  return value || allLabel;
}

function collectionOrderReportOption(order) {
  return {
    value: order.id,
    label: order.id,
    meta: {
      remetente: order.senderName || '-',
      destinatario: order.recipientName || '-',
      status: order.status || '-',
    },
    searchText: [order.id, order.senderName, order.recipientName, order.driverName, order.vehiclePlate, order.status].join(' '),
  };
}

function readCollectionOrders() {
  try {
    const rawValue = localStorage.getItem(collectionOrderStorageKey);
    if (rawValue !== null) {
      const stored = JSON.parse(rawValue);
      return Array.isArray(stored) ? stored : defaultCollectionOrders;
    }
  } catch {
    return defaultCollectionOrders;
  }

  return defaultCollectionOrders;
}

function writeCollectionOrders(orders) {
  localStorage.setItem(collectionOrderStorageKey, JSON.stringify(orders));
}

function localDateTimeValue() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function nextCollectionOrderNumber() {
  const now = new Date();
  const key = 'collectionOrderSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `OC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

function dateDistance(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.abs(date.getTime() - Date.now());
}

function blankOrder() {
  return {
    id: '',
    requestDate: todayValue(),
    senderName: '',
    recipientName: '',
    cargoDescription: '',
    volumeQuantity: '',
    cargoWeight: '',
    merchandiseValue: '',
    invoiceKey: '',
    collectionDateTime: localDateTimeValue(),
    driverCpf: '',
    driverName: '',
    vehiclePlate: '',
    vehicleModel: '',
    notes: '',
    status: 'Solicitada',
  };
}

export default function CollectionOrderPage({ initialSavedQuery = null, onSavedQueriesChange }) {
  const [orders, setOrders] = useState(getRegisteredCollectionOrders);
  const [form, setForm] = useState(blankOrder);
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [orderSort, setOrderSort] = useState({ key: 'id', direction: 'desc' });
  const [message, setMessage] = useAutoClearMessage();

  const drivers = useMemo(() => getRegisteredDrivers(), []);
  const vehicles = useMemo(() => getRegisteredVehicles(), []);
  const parties = useMemo(() => [
    ...getRegisteredSuppliers().map((supplier) => ({
      id: `supplier-${supplier.id || supplier.cnpj}`,
      type: 'Fornecedor',
      name: supplier.name,
      document: supplier.cnpj,
      status: supplier.active ? 'Ativo' : 'Inativo',
    })),
    ...getRegisteredUnits().map((unit) => ({
      id: `unit-${unit.id || unit.cnpj}`,
      type: 'Unidade',
      name: unit.name,
      document: unit.cnpj,
      status: unit.active ? 'Ativo' : 'Inativo',
    })),
  ], []);
  const sortedOrders = useMemo(
    () => sortTableRows(
      orders,
      collectionOrderSortColumns,
      orderSort,
      (left, right) => collectionOrderNumber(right.id) - collectionOrderNumber(left.id),
    ),
    [orderSort, orders],
  );
  const ordersByClosestDate = useMemo(
    () => [...orders].sort((left, right) => (
      dateDistance(left.collectionDateTime || left.requestDate) - dateDistance(right.collectionDateTime || right.requestDate)
    )),
    [orders],
  );
  const lookupItems = useMemo(() => {
    const query = normalizeText(lookupSearch);

    if (lookupType === 'order') {
      if (!query) return ordersByClosestDate;
      return ordersByClosestDate.filter((order) => (
        normalizeText(`${order.id} ${order.senderName} ${order.recipientName} ${order.driverName} ${order.vehiclePlate} ${order.status}`).includes(query)
      ));
    }

    if (lookupType === 'driver') {
      if (!query) return drivers;
      return drivers.filter((driver) => normalizeText(`${driver.name} ${formatCpf(driver.cpf)} ${driver.cnh}`).includes(query));
    }

    if (lookupType === 'vehicle') {
      if (!query) return vehicles;
      return vehicles.filter((vehicle) => normalizeText(`${vehicle.plate} ${vehicle.model} ${vehicle.owner}`).includes(query));
    }

    if (lookupType === 'sender' || lookupType === 'recipient') {
      if (!query) return parties;
      return parties.filter((party) => normalizeText(`${party.name} ${party.document} ${party.type}`).includes(query));
    }

    return [];
  }, [drivers, lookupSearch, lookupType, ordersByClosestDate, parties, vehicles]);
  const collectionOrderReportOptions = useMemo(
    () => sortedOrders.map(collectionOrderReportOption),
    [sortedOrders],
  );
  const collectionOrderStatusOptions = useMemo(() => uniqueSortedOptions(orders.map((order) => order.status)), [orders]);
  const collectionOrderSenderOptions = useMemo(() => uniqueSortedOptions(orders.map((order) => order.senderName)), [orders]);
  const collectionOrderRecipientOptions = useMemo(() => uniqueSortedOptions(orders.map((order) => order.recipientName)), [orders]);
  const collectionOrderDriverOptions = useMemo(() => uniqueSortedOptions(orders.map((order) => order.driverName)), [orders]);
  const collectionOrderVehicleOptions = useMemo(() => uniqueSortedOptions(orders.map((order) => order.vehiclePlate)), [orders]);
  const collectionOrderReportDefaultFilters = useMemo(() => ({
    ...collectionOrderReportBaseFilters,
    orderIds: collectionOrderReportOptions.map((option) => option.value),
    status: collectionOrderStatusOptions,
    senderName: collectionOrderSenderOptions,
    recipientName: collectionOrderRecipientOptions,
    driverName: collectionOrderDriverOptions,
    vehiclePlate: collectionOrderVehicleOptions,
  }), [
    collectionOrderDriverOptions,
    collectionOrderRecipientOptions,
    collectionOrderReportOptions,
    collectionOrderSenderOptions,
    collectionOrderStatusOptions,
    collectionOrderVehicleOptions,
  ]);
  const collectionOrderReportFields = useMemo(() => [
    {
      type: 'lookupMulti',
      key: 'orderIds',
      label: 'Ordem de Coleta',
      options: collectionOrderReportOptions,
      searchPlaceholder: 'Pesquisar ordem de coleta',
      columns: [
        { key: 'remetente', label: 'Remetente' },
        { key: 'destinatario', label: 'Destinatario' },
        { key: 'status', label: 'Status' },
      ],
    },
    { type: 'lookupMulti', key: 'status', label: 'Status', options: collectionOrderStatusOptions.length ? collectionOrderStatusOptions : orderStatuses, searchPlaceholder: 'Pesquisar status' },
    { type: 'lookupMulti', key: 'senderName', label: 'Remetente', options: collectionOrderSenderOptions, searchPlaceholder: 'Pesquisar remetente' },
    { type: 'lookupMulti', key: 'recipientName', label: 'Destinatario', options: collectionOrderRecipientOptions, searchPlaceholder: 'Pesquisar destinatario' },
    { type: 'lookupMulti', key: 'driverName', label: 'Motorista', options: collectionOrderDriverOptions, searchPlaceholder: 'Pesquisar motorista' },
    { type: 'lookupMulti', key: 'vehiclePlate', label: 'Placa', options: collectionOrderVehicleOptions, searchPlaceholder: 'Pesquisar placa' },
    {
      type: 'dateRange',
      key: 'period',
      label: 'Periodo',
      fieldKey: 'periodField',
      startKey: 'periodStart',
      endKey: 'periodEnd',
      options: [
        { value: 'requestDate', label: 'Solicitacao' },
        { value: 'collectionDateTime', label: 'Data da coleta' },
        { value: 'createdAt', label: 'Cadastro' },
      ],
    },
  ], [
    collectionOrderDriverOptions,
    collectionOrderRecipientOptions,
    collectionOrderReportOptions,
    collectionOrderSenderOptions,
    collectionOrderStatusOptions,
    collectionOrderVehicleOptions,
  ]);

  function buildCollectionOrderReportRows(filters) {
    return sortedOrders.filter((order) => {
      const periodValue = filters.periodField === 'collectionDateTime'
        ? order.collectionDateTime
        : filters.periodField === 'createdAt'
          ? order.createdAt
          : order.requestDate;

      return isReportOptionSelected(order.id, filters.orderIds)
        && isReportOptionSelected(order.status, filters.status)
        && isReportOptionSelected(order.senderName, filters.senderName)
        && isReportOptionSelected(order.recipientName, filters.recipientName)
        && isReportOptionSelected(order.driverName, filters.driverName)
        && isReportOptionSelected(order.vehiclePlate, filters.vehiclePlate)
        && isDateInRange(periodValue, filters.periodStart, filters.periodEnd);
    });
  }

  function collectionOrderReportMetadata(filters, rows) {
    const periodOption = collectionOrderReportFields
      .find((field) => field.type === 'dateRange')
      ?.options.find((option) => option.value === filters.periodField);

    return [
      ['Ordem de Coleta', reportSelectionLabel(filters.orderIds, collectionOrderReportOptions)],
      ['Status', reportSelectionLabel(filters.status, collectionOrderStatusOptions)],
      ['Remetente', reportSelectionLabel(filters.senderName, collectionOrderSenderOptions)],
      ['Destinatario', reportSelectionLabel(filters.recipientName, collectionOrderRecipientOptions)],
      ['Motorista', reportSelectionLabel(filters.driverName, collectionOrderDriverOptions)],
      ['Placa', reportSelectionLabel(filters.vehiclePlate, collectionOrderVehicleOptions)],
      ['Periodo por', periodOption?.label || 'Solicitacao'],
      ['Periodo de', reportFilterLabel(filters.periodStart)],
      ['Periodo ate', reportFilterLabel(filters.periodEnd)],
      ['Resultado', `${rows.length} ordem(ns)`],
    ];
  }

  const lookupTitles = {
    order: 'Pesquisar ordem de coleta',
    driver: 'Pesquisar motorista',
    vehicle: 'Pesquisar veículo',
    sender: 'Pesquisar remetente',
    recipient: 'Pesquisar destinatário',
  };
  const activeLookupTitle = lookupTitles[lookupType] || 'Pesquisar';
  const lookupPlaceholder = lookupType === 'order'
    ? 'Pesquisar por ordem, remetente, destinatário ou status'
    : lookupType === 'driver'
    ? 'Pesquisar por nome, CPF ou CNH'
    : lookupType === 'vehicle'
      ? 'Pesquisar por placa, modelo ou proprietário'
      : 'Pesquisar por nome, CNPJ ou tipo';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function loadOrder(order) {
    setForm(order);
    setMessage(`Ordem ${order.id} carregada para edição`);
  }

  function handleOrderNumberChange(value) {
    const nextId = value.toUpperCase();
    setForm((current) => ({ ...current, id: nextId }));

    const existingOrder = orders.find((order) => normalizeText(order.id) === normalizeText(nextId));
    if (existingOrder) {
      loadOrder(existingOrder);
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
    if (lookupType === 'order') {
      loadOrder(item);
      closeLookup();
      return;
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

    if (lookupType === 'sender') {
      setForm((current) => ({
        ...current,
        senderName: item.name,
      }));
    }

    if (lookupType === 'recipient') {
      setForm((current) => ({
        ...current,
        recipientName: item.name,
      }));
    }

    closeLookup();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.senderName) {
      setMessage('Selecione o remetente');
      return;
    }

    if (!form.recipientName) {
      setMessage('Selecione o destinatário');
      return;
    }

    if (!form.driverCpf) {
      setMessage('Selecione o motorista responsável');
      return;
    }

    if (!form.vehiclePlate) {
      setMessage('Selecione o veículo da coleta');
      return;
    }

    const id = form.id || nextCollectionOrderNumber();
    const nextOrder = { ...form, id };
    const existingIndex = orders.findIndex((order) => normalizeText(order.id) === normalizeText(id));
    const nextOrders = saveCollectionOrder(nextOrder);
    setOrders(nextOrders);
    setForm(nextOrder);
    setMessage(existingIndex >= 0 ? `Ordem ${id} atualizada` : `Ordem ${id} criada`);
  }

  function handleReset() {
    setForm(blankOrder());
    closeLookup();
    setMessage('');
  }

  function handleDelete() {
    const currentOrder = orders.find((order) => normalizeText(order.id) === normalizeText(form.id));

    if (!currentOrder) {
      setMessage('Selecione uma ordem de coleta cadastrada para excluir');
      return;
    }

    const blockers = getCollectionOrderDeletionBlockers(currentOrder);

    if (blockers.length) {
      const nextOrders = deactivateCollectionOrder(currentOrder.id);
      const inactiveOrder = nextOrders.find((order) => order.id === currentOrder.id);
      setOrders(nextOrders);
      setForm(inactiveOrder || { ...currentOrder, status: 'Cancelada' });
      setMessage(`Ordem possui vinculo em ${blockers.join(', ')} e foi cancelada`);
      return;
    }

    const nextOrders = deleteCollectionOrder(currentOrder.id);
    setOrders(nextOrders);
    setForm(blankOrder());
    setMessage(`Ordem ${currentOrder.id} excluida`);
  }

  return (
    <section className="collection-order-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Ordem de Coleta</h1>
          <p className="page-kicker">Solicitação operacional de coleta com motorista, veículo e dados da carga</p>
        </div>
      </header>

      <form className="finance-form collection-order-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <div className="field">
            <span>Número da ordem</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Gerado ao salvar ou informe uma ordem existente"
                value={form.id}
                onChange={(event) => handleOrderNumberChange(event.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar ordem de coleta"
                title="Pesquisar ordem de coleta"
                tabIndex={-1}
                onClick={() => openLookup('order')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Data da solicitação</span>
            <input type="date" value={form.requestDate} onChange={(event) => updateField('requestDate', event.target.value)} required />
          </label>

          <label className="field">
            <span>Status da ordem</span>
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)} required>
              {orderStatuses.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Data e horário da coleta</span>
            <input type="datetime-local" value={form.collectionDateTime} onChange={(event) => updateField('collectionDateTime', event.target.value)} required />
          </label>

          <div className="field field--span-2">
            <span>Nome do remetente</span>
            <div className="lookup-field">
              <input type="text" value={form.senderName} placeholder="Pesquise o remetente cadastrado" readOnly required />
              <button type="button" className="icon-button" aria-label="Pesquisar remetente" title="Pesquisar remetente" tabIndex={-1} onClick={() => openLookup('sender')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field field--span-2">
            <span>Nome do destinatário</span>
            <div className="lookup-field">
              <input type="text" value={form.recipientName} placeholder="Pesquise o destinatário cadastrado" readOnly required />
              <button type="button" className="icon-button" aria-label="Pesquisar destinatário" title="Pesquisar destinatário" tabIndex={-1} onClick={() => openLookup('recipient')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field field--span-4">
            <span>Descrição da carga</span>
            <textarea value={form.cargoDescription} onChange={(event) => updateField('cargoDescription', event.target.value)} required />
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

          <label className="field">
            <span>Valor declarado</span>
            <input type="text" value={currency(form.merchandiseValue)} readOnly tabIndex={-1} />
          </label>

          <label className="field field--span-4">
            <span>Nota fiscal / chave da NF-e</span>
            <input type="text" value={form.invoiceKey} onChange={(event) => updateField('invoiceKey', event.target.value)} required />
          </label>

          <div className="field field--span-2">
            <span>Motorista responsável</span>
            <div className="lookup-field">
              <input type="text" value={form.driverName} placeholder="Pesquise o motorista cadastrado" readOnly required />
              <button type="button" className="icon-button" aria-label="Pesquisar motorista" title="Pesquisar motorista" tabIndex={-1} onClick={() => openLookup('driver')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field field--span-2">
            <span>Veículo / placa</span>
            <div className="lookup-field">
              <input
                type="text"
                value={form.vehiclePlate ? `${form.vehiclePlate} - ${form.vehicleModel}` : ''}
                placeholder="Pesquise o veículo cadastrado"
                readOnly
                required
              />
              <button type="button" className="icon-button" aria-label="Pesquisar veículo" title="Pesquisar veículo" tabIndex={-1} onClick={() => openLookup('vehicle')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field field--span-4">
            <span>Observações</span>
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar ordem</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir ordem
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="collection-orders-title">
        <div className="registered-launches-header">
          <h2 id="collection-orders-title">Ordens cadastradas</h2>
          <div>
            <span>{sortedOrders.length} ordem(ns)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <SortableTableHeader
                  columns={collectionOrderSortColumns}
                  sort={orderSort}
                  onSortChange={setOrderSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr key={order.id} onClick={() => loadOrder(order)}>
                  <td><strong>{order.id}</strong></td>
                  <td>{order.requestDate}</td>
                  <td>{order.senderName}</td>
                  <td>{order.recipientName}</td>
                  <td>{order.driverName}</td>
                  <td>{order.vehiclePlate}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReportPanel
        title="Relatorio de ordens de coleta"
        titleId="collection-order-report-title"
        pageId="collection-order"
        reportType="collection-order-report"
        module="Operacao"
        icon="operation"
        defaultFilters={collectionOrderReportDefaultFilters}
        fields={collectionOrderReportFields}
        columns={collectionOrderReportColumns}
        buildRows={buildCollectionOrderReportRows}
        filenamePrefix="relatorio-ordens-coleta"
        initialSavedQuery={initialSavedQuery}
        onSavedQueriesChange={onSavedQueriesChange}
        getSummary={(rows) => `${rows.length} ordem(ns)`}
        getMetadata={collectionOrderReportMetadata}
        getRowKey={(order) => order.id}
      />

      {lookupType && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="collection-order-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="collection-order-lookup-title">{activeLookupTitle}</h2>
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
                  {lookupType === 'order' ? (
                    <tr>
                      <th>Ordem</th>
                      <th>Data</th>
                      <th>Remetente</th>
                      <th>Destinatário</th>
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
                      <th>Proprietário</th>
                      <th>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Tipo</th>
                      <th>Nome</th>
                      <th>CNPJ</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {lookupItems.map((item) => (
                    <tr key={lookupType === 'order' ? item.id : lookupType === 'driver' ? item.cpf : lookupType === 'vehicle' ? item.plate : item.id} onClick={() => selectLookupItem(item)}>
                      {lookupType === 'order' ? (
                        <>
                          <td>{item.id}</td>
                          <td>{item.collectionDateTime || item.requestDate}</td>
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
                          <td>{item.type}</td>
                          <td>{item.name}</td>
                          <td>{item.document}</td>
                          <td>{item.status}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!lookupItems.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
