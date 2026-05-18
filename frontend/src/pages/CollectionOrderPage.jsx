import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
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
import { deactivateCollectionOrder, deleteCollectionOrder } from '../data/operationRegistry.js';

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

export default function CollectionOrderPage() {
  const [orders, setOrders] = useState(readCollectionOrders);
  const [form, setForm] = useState(blankOrder);
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
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
    () => [...orders].sort((left, right) => right.id.localeCompare(left.id, 'pt-BR')),
    [orders],
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
    const nextOrders = [...orders];

    if (existingIndex >= 0) {
      nextOrders[existingIndex] = nextOrder;
    } else {
      nextOrders.push(nextOrder);
    }

    writeCollectionOrders(nextOrders);
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
                <th>Ordem</th>
                <th>Solicitação</th>
                <th>Remetente</th>
                <th>Destinatário</th>
                <th>Motorista</th>
                <th>Veículo</th>
                <th>Status</th>
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
