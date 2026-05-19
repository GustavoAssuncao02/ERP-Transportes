import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { currency, normalizeText, toNumber } from '../data/financeData.js';
import { getRegisteredSuppliers } from '../data/managementRegistry.js';
import {
  getRegisteredCollectionOrders,
  getRegisteredCtes,
  getRegisteredManifests,
} from '../data/operationRegistry.js';
import {
  blankReceivable,
  calculateStatus,
  calculateTotal,
  differenceInDays,
  formatCpfCnpj,
  nextReceivableNumber,
  readReceivables,
  receivableSearchText,
  saveReceivable,
} from '../data/accountsReceivableRegistry.js';
import { onlyDigits } from '../data/transportRegistry.js';
import { copyAddressFields, defaultAddressFields, formatAddress, normalizeAddressFields } from '../utils/address.js';

export default function AccountsReceivablePage() {
  const [receivables, setReceivables] = useState(readReceivables);
  const [form, setForm] = useState(blankReceivable);
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [message, setMessage] = useAutoClearMessage();

  const customers = useMemo(
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
  const ctes = useMemo(() => getRegisteredCtes(), []);
  const manifests = useMemo(() => getRegisteredManifests(), []);
  const collectionOrders = useMemo(() => getRegisteredCollectionOrders(), []);

  const totalValue = calculateTotal(form);
  const paidValue = Math.min(toNumber(form.paidValue), totalValue);
  const openBalance = Math.max(0, totalValue - paidValue);
  const dueTermDays = differenceInDays(form.issueDate, form.paymentForecastDate);
  const titleStatus = calculateStatus({ totalValue, paidValue, paymentForecastDate: form.paymentForecastDate });

  const sortedReceivables = useMemo(
    () => [...receivables].sort((left, right) => right.id.localeCompare(left.id, 'pt-BR')),
    [receivables],
  );

  const lookupItems = useMemo(() => {
    const query = normalizeText(lookupSearch);

    if (lookupType === 'title') {
      if (!query) return sortedReceivables;
      return sortedReceivables.filter((receivable) => normalizeText(receivableSearchText(receivable)).includes(query));
    }

    if (lookupType === 'customer') {
      if (!query) return customers;
      return customers.filter((customer) => normalizeText(`${customer.name} ${customer.document} ${customer.status}`).includes(query));
    }

    if (lookupType === 'cte') {
      if (!query) return ctes;
      return ctes.filter((cte) => normalizeText(`${cte.id} ${cte.number} ${cte.issuer} ${cte.origin} ${cte.destination}`).includes(query));
    }

    if (lookupType === 'mdfe') {
      if (!query) return manifests;
      return manifests.filter((manifest) => normalizeText(`${manifest.id} ${manifest.origin} ${manifest.destination} ${manifest.driverName} ${manifest.truckPlate}`).includes(query));
    }

    if (lookupType === 'collectionOrder') {
      if (!query) return collectionOrders;
      return collectionOrders.filter((order) => normalizeText(`${order.id} ${order.senderName} ${order.recipientName} ${order.invoiceKey}`).includes(query));
    }

    return [];
  }, [collectionOrders, ctes, customers, lookupSearch, lookupType, manifests, sortedReceivables]);

  const lookupTitles = {
    title: 'Pesquisar titulo a receber',
    customer: 'Pesquisar cliente / tomador',
    cte: 'Pesquisar CT-e',
    mdfe: 'Pesquisar MDF-e',
    collectionOrder: 'Pesquisar ordem de coleta / viagem',
  };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function updateFields(updates) {
    setForm((current) => ({ ...current, ...updates }));
    setMessage('');
  }

  function applyCustomer(customer) {
    const addressUpdates = copyAddressFields(customer, defaultAddressFields);

    setForm((current) => ({
      ...current,
      customerName: customer.name,
      customerDocument: customer.document,
      ...addressUpdates,
      address: addressUpdates.address || current.address,
    }));
  }

  function findCustomerByName(value) {
    return customers.find((customer) => normalizeText(customer.name) === normalizeText(value.trim()));
  }

  function findCustomerByDocument(value) {
    const digits = onlyDigits(value);
    return customers.find((customer) => onlyDigits(customer.document) === digits);
  }

  function handleCustomerNameChange(value) {
    setForm((current) => ({ ...current, customerName: value }));
    const customer = findCustomerByName(value);
    if (customer) applyCustomer(customer);
    setMessage('');
  }

  function handleCustomerDocumentChange(value) {
    const formattedValue = formatCpfCnpj(value);
    setForm((current) => ({ ...current, customerDocument: formattedValue }));

    const digits = onlyDigits(formattedValue);
    if (digits.length === 11 || digits.length === 14) {
      const customer = findCustomerByDocument(formattedValue);
      if (customer) applyCustomer(customer);
    }

    setMessage('');
  }

  function loadReceivable(receivable) {
    setForm({
      ...blankReceivable(),
      ...receivable,
      freightValue: String(receivable.freightValue || ''),
      discountValue: String(receivable.discountValue || ''),
      additionValue: String(receivable.additionValue || ''),
      tollValue: String(receivable.tollValue || ''),
      insuranceValue: String(receivable.insuranceValue || ''),
      pickupFee: String(receivable.pickupFee || ''),
      deliveryFee: String(receivable.deliveryFee || ''),
      paidValue: String(receivable.paidValue || ''),
    });
    setMessage(`Titulo ${receivable.id} carregado para edicao`);
  }

  function handleTitleNumberChange(value) {
    const nextId = value.toUpperCase();
    setForm((current) => ({ ...current, id: nextId }));

    const existingTitle = receivables.find((receivable) => normalizeText(receivable.id) === normalizeText(nextId));
    if (existingTitle) loadReceivable(existingTitle);
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
    if (lookupType === 'title') {
      loadReceivable(item);
      closeLookup();
      return;
    }

    if (lookupType === 'customer') {
      applyCustomer(item);
    }

    if (lookupType === 'cte') {
      setForm((current) => {
        const manifest = manifests.find((itemManifest) => (itemManifest.selectedCteIds || []).includes(item.id));
        return {
          ...current,
          cteId: item.id,
          mdfeId: current.mdfeId || manifest?.id || '',
          freightValue: current.freightValue || String(item.freightValue || ''),
          nfeNumber: current.nfeNumber || item.cargoDocuments?.[0]?.number || '',
        };
      });
    }

    if (lookupType === 'mdfe') {
      setForm((current) => ({
        ...current,
        mdfeId: item.id,
        cteId: current.cteId || item.selectedCteIds?.[0] || '',
      }));
    }

    if (lookupType === 'collectionOrder') {
      const customer = customers.find((itemCustomer) => normalizeText(itemCustomer.name) === normalizeText(item.senderName));
      setForm((current) => ({
        ...current,
        collectionOrderId: item.id,
        nfeNumber: current.nfeNumber || item.invoiceKey || '',
        customerName: current.customerName || customer?.name || item.senderName || '',
        customerDocument: current.customerDocument || customer?.document || '',
        ...(customer ? copyAddressFields(customer, defaultAddressFields) : {}),
        address: current.address || (customer ? formatAddress(customer) : ''),
      }));
    }

    closeLookup();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.customerName || !form.customerDocument) {
      setMessage('Informe o cliente/tomador e o CPF/CNPJ');
      return;
    }

    const id = form.id.trim().toUpperCase() || nextReceivableNumber();
    const nextReceivable = {
      ...form,
      id,
      originalValue: totalValue.toFixed(2),
      paidValue: paidValue.toFixed(2),
      openBalance: openBalance.toFixed(2),
      dueTermDays,
      status: titleStatus,
    };
    const { receivables: nextReceivables, receivable: savedReceivable, updated } = saveReceivable(nextReceivable);
    setReceivables(nextReceivables);
    setForm(savedReceivable);
    setMessage(updated ? `Titulo ${id} atualizado` : `Titulo ${id} cadastrado`);
  }

  function handleReset() {
    setForm(blankReceivable());
    closeLookup();
    setMessage('');
  }

  return (
    <section className="accounts-receivable-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Cadastrar Titulo a Receber</h1>
          <p className="page-kicker">Fatura de frete com documentos vinculados, prazo, valor original, valor pago e saldo</p>
        </div>
      </header>

      <form className="finance-form accounts-receivable-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <div className="field">
            <span>Numero do titulo/fatura</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Gerado ao salvar ou informe um titulo"
                value={form.id}
                onChange={(event) => handleTitleNumberChange(event.target.value)}
              />
              <button type="button" className="icon-button" aria-label="Pesquisar titulo" title="Pesquisar titulo" tabIndex={-1} onClick={() => openLookup('title')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Data de emissao</span>
            <input type="date" value={form.issueDate} onChange={(event) => updateField('issueDate', event.target.value)} required />
          </label>

          <label className="field">
            <span>Previsao de pagamento</span>
            <input type="date" value={form.paymentForecastDate} onChange={(event) => updateField('paymentForecastDate', event.target.value)} required />
          </label>

          <label className="field">
            <span>Prazo</span>
            <input type="text" value={dueTermDays === '' ? '' : `${dueTermDays} dia(s)`} readOnly tabIndex={-1} />
          </label>

          <div className="form-section-title field--span-4">Cliente / tomador</div>

          <div className="field field--span-2">
            <span>Cliente / tomador</span>
            <div className="lookup-field">
              <input type="text" value={form.customerName} onChange={(event) => handleCustomerNameChange(event.target.value)} required />
              <button type="button" className="icon-button" aria-label="Pesquisar cliente/tomador" title="Pesquisar cliente/tomador" tabIndex={-1} onClick={() => openLookup('customer')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field">
            <span>CPF/CNPJ</span>
            <div className="lookup-field">
              <input type="text" inputMode="numeric" value={form.customerDocument} onChange={(event) => handleCustomerDocumentChange(event.target.value)} required />
              <button type="button" className="icon-button" aria-label="Pesquisar por CPF/CNPJ" title="Pesquisar por CPF/CNPJ" tabIndex={-1} onClick={() => openLookup('customer')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Status do titulo</span>
            <input type="text" value={titleStatus} readOnly tabIndex={-1} />
          </label>

          <AddressFields
            values={form}
            onChange={updateField}
            onChangeMany={updateFields}
            onStatus={setMessage}
          />

          <div className="form-section-title field--span-4">Documentos vinculados</div>

          <div className="field">
            <span>CT-e</span>
            <div className="lookup-field">
              <input type="text" value={form.cteId} onChange={(event) => updateField('cteId', event.target.value.toUpperCase())} />
              <button type="button" className="icon-button" aria-label="Pesquisar CT-e" title="Pesquisar CT-e" tabIndex={-1} onClick={() => openLookup('cte')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>NF-e da mercadoria</span>
            <input type="text" value={form.nfeNumber} onChange={(event) => updateField('nfeNumber', event.target.value)} />
          </label>

          <div className="field">
            <span>MDF-e</span>
            <div className="lookup-field">
              <input type="text" value={form.mdfeId} onChange={(event) => updateField('mdfeId', event.target.value.toUpperCase())} />
              <button type="button" className="icon-button" aria-label="Pesquisar MDF-e" title="Pesquisar MDF-e" tabIndex={-1} onClick={() => openLookup('mdfe')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field">
            <span>Ordem de coleta / viagem</span>
            <div className="lookup-field">
              <input type="text" value={form.collectionOrderId} onChange={(event) => updateField('collectionOrderId', event.target.value.toUpperCase())} />
              <button type="button" className="icon-button" aria-label="Pesquisar ordem de coleta" title="Pesquisar ordem de coleta" tabIndex={-1} onClick={() => openLookup('collectionOrder')}>
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field field--span-4">
            <span>Comprovante de entrega</span>
            <input type="text" placeholder="Numero do comprovante, canhoto ou observacao de entrega" value={form.deliveryProof} onChange={(event) => updateField('deliveryProof', event.target.value)} />
          </label>

          <div className="form-section-title field--span-4">Valores</div>

          <label className="field">
            <span>Valor do frete</span>
            <input type="number" min="0" step="0.01" value={form.freightValue} onChange={(event) => updateField('freightValue', event.target.value)} required />
          </label>

          <label className="field">
            <span>Descontos</span>
            <input type="number" min="0" step="0.01" value={form.discountValue} onChange={(event) => updateField('discountValue', event.target.value)} />
          </label>

          <label className="field">
            <span>Acrescimos</span>
            <input type="number" min="0" step="0.01" value={form.additionValue} onChange={(event) => updateField('additionValue', event.target.value)} />
          </label>

          <label className="field">
            <span>Pedagio</span>
            <input type="number" min="0" step="0.01" value={form.tollValue} onChange={(event) => updateField('tollValue', event.target.value)} />
          </label>

          <label className="field">
            <span>Seguro / GRIS</span>
            <input type="number" min="0" step="0.01" value={form.insuranceValue} onChange={(event) => updateField('insuranceValue', event.target.value)} />
          </label>

          <label className="field">
            <span>Taxa de coleta</span>
            <input type="number" min="0" step="0.01" value={form.pickupFee} onChange={(event) => updateField('pickupFee', event.target.value)} />
          </label>

          <label className="field">
            <span>Taxa de entrega</span>
            <input type="number" min="0" step="0.01" value={form.deliveryFee} onChange={(event) => updateField('deliveryFee', event.target.value)} />
          </label>

          <label className="field">
            <span>Valor total</span>
            <input type="text" value={currency(totalValue)} readOnly tabIndex={-1} />
          </label>

          <label className="field">
            <span>Valor original</span>
            <input type="text" value={currency(totalValue)} readOnly tabIndex={-1} />
          </label>

          <label className="field">
            <span>Valor pago</span>
            <input type="number" min="0" step="0.01" value={form.paidValue} onChange={(event) => updateField('paidValue', event.target.value)} />
          </label>

          <label className="field">
            <span>Saldo em aberto</span>
            <input type="text" value={currency(openBalance)} readOnly tabIndex={-1} />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar titulo</button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="receivable-list-title">
        <div className="registered-launches-header">
          <h2 id="receivable-list-title">Titulos a receber cadastrados</h2>
          <div>
            <span>{sortedReceivables.length} titulo(s)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Cliente / tomador</th>
                <th>CT-e</th>
                <th>Previsao</th>
                <th>Original</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedReceivables.map((receivable) => (
                <tr key={receivable.id} onClick={() => loadReceivable(receivable)}>
                  <td><strong>{receivable.id}</strong></td>
                  <td>{receivable.customerName}</td>
                  <td>{receivable.cteId || '-'}</td>
                  <td>{receivable.paymentForecastDate}</td>
                  <td>{currency(receivable.originalValue)}</td>
                  <td>{currency(receivable.paidValue)}</td>
                  <td>{currency(receivable.openBalance)}</td>
                  <td>{receivable.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {lookupType && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="receivable-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="receivable-lookup-title">{lookupTitles[lookupType] || 'Pesquisar'}</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar"
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  {lookupType === 'title' ? (
                    <tr>
                      <th>Titulo</th>
                      <th>Cliente</th>
                      <th>Previsao</th>
                      <th>Saldo</th>
                      <th>Status</th>
                    </tr>
                  ) : lookupType === 'customer' ? (
                    <tr>
                      <th>Codigo</th>
                      <th>Cliente</th>
                      <th>CPF/CNPJ</th>
                      <th>Status</th>
                    </tr>
                  ) : lookupType === 'cte' ? (
                    <tr>
                      <th>CT-e</th>
                      <th>Emissor</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th>Status</th>
                    </tr>
                  ) : lookupType === 'mdfe' ? (
                    <tr>
                      <th>MDF-e</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th>Motorista</th>
                      <th>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Ordem</th>
                      <th>Solicitacao</th>
                      <th>Remetente</th>
                      <th>Destinatario</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {lookupItems.map((item) => (
                    <tr key={item.id || item.document} onClick={() => selectLookupItem(item)}>
                      {lookupType === 'title' ? (
                        <>
                          <td>{item.id}</td>
                          <td>{item.customerName}</td>
                          <td>{item.paymentForecastDate}</td>
                          <td>{currency(item.openBalance)}</td>
                          <td>{item.status}</td>
                        </>
                      ) : lookupType === 'customer' ? (
                        <>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.document}</td>
                          <td>{item.status}</td>
                        </>
                      ) : lookupType === 'cte' ? (
                        <>
                          <td>{item.id}</td>
                          <td>{item.issuer}</td>
                          <td>{item.origin}</td>
                          <td>{item.destination}</td>
                          <td>{item.status}</td>
                        </>
                      ) : lookupType === 'mdfe' ? (
                        <>
                          <td>{item.id}</td>
                          <td>{item.origin}</td>
                          <td>{item.destination}</td>
                          <td>{item.driverName}</td>
                          <td>{item.status}</td>
                        </>
                      ) : (
                        <>
                          <td>{item.id}</td>
                          <td>{item.collectionDateTime || item.requestDate}</td>
                          <td>{item.senderName}</td>
                          <td>{item.recipientName}</td>
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
