import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  accountingTypes,
  businessUnits,
  chargeTypes,
  currency,
  findFinanceLaunchById,
  financeLaunches,
  formatAccountingType,
  formatSupplier,
  formatUnit,
  suppliers,
  todayValue,
  toNumber,
} from '../data/financeData.js';

const defaultUnit = businessUnits[0].label;

function dateDistance(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.abs(date.getTime() - Date.now());
}

const lookupConfig = {
  launch: {
    title: 'Pesquisar lançamento',
    columns: ['Lançamento', 'Data', 'Fornecedor', 'Documento', 'Situação', 'Valor'],
    items: [...financeLaunches].sort((left, right) => (
      dateDistance(left.dueDate || left.issueDate || left.createdDate) - dateDistance(right.dueDate || right.issueDate || right.createdDate)
    )),
    format: (item) => item.id,
  },
  unit: {
    title: 'Pesquisar unidade',
    columns: ['Código', 'Unidade'],
    items: businessUnits,
    format: (item) => item.label,
  },
  supplier: {
    title: 'Pesquisar fornecedor',
    columns: ['Código', 'Nome', 'CNPJ'],
    items: suppliers,
    format: (item) => `${item.code} - ${item.name} - ${item.cnpj}`,
  },
  accountingType: {
    title: 'Pesquisar tipo',
    columns: ['Código', 'Classificação contábil'],
    items: accountingTypes,
    format: (item) => `${item.code} - ${item.name}`,
  },
};

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
  if (!dateValue) return '';

  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return toDateInputValue(date);
}

function toPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function splitAmount(total, count) {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0);
    return cents / 100;
  });
}

function buildInstallments({ total, quantity, dueDate, interval, fixedValue }) {
  const count = toPositiveInteger(quantity);
  const values = fixedValue === undefined
    ? splitAmount(toNumber(total), count)
    : Array.from({ length: count }, () => toNumber(fixedValue));

  return values.map((value, index) => ({
    number: index + 1,
    dueDate: addDays(dueDate, Math.max(toNumber(interval), 0) * index),
    value: value ? value.toFixed(2) : '',
  }));
}

function nextLaunchNumber() {
  const now = new Date();
  const key = 'accountsPayableSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `CAP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

function getLookupCells(type, item) {
  if (type === 'launch') {
    return [
      item.id,
      item.dueDate || item.issueDate || item.createdDate || '',
      item.supplier,
      item.document,
      item.status,
      currency(item.amount),
    ];
  }

  if (type === 'supplier') {
    return [item.code, item.name, item.cnpj];
  }

  return [item.code, item.name];
}

export default function AccountsPayablePage({ initialLaunch = null }) {
  const [unit, setUnit] = useState(defaultUnit);
  const [launchNumber, setLaunchNumber] = useState('');
  const [loadedLaunchId, setLoadedLaunchId] = useState('');
  const [loadedLaunchStatus, setLoadedLaunchStatus] = useState('');
  const [supplier, setSupplier] = useState('');
  const [accountingType, setAccountingType] = useState('');
  const [chargeType, setChargeType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [supplierSearchBy, setSupplierSearchBy] = useState('name');
  const [issueDate, setIssueDate] = useState(todayValue());
  const [dueDate, setDueDate] = useState('');
  const [launchValue, setLaunchValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [interval, setInterval] = useState('30');
  const [installmentValue, setInstallmentValue] = useState('');
  const [installments, setInstallments] = useState([{ number: 1, dueDate: '', value: '' }]);
  const [notes, setNotes] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [paymentBank, setPaymentBank] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [status, setStatus] = useAutoClearMessage();

  const activeLookup = lookupType ? lookupConfig[lookupType] : null;
  const isSettledLaunch = loadedLaunchStatus === 'Baixado';
  const lookupItems = useMemo(() => {
    if (!activeLookup) return [];

    const query = lookupSearch.trim().toLowerCase();
    if (!query) return activeLookup.items;

    return activeLookup.items.filter((item) => {
      if (lookupType === 'launch') {
        return `${item.id} ${item.supplier} ${item.document} ${item.status}`.toLowerCase().includes(query);
      }

      if (lookupType === 'supplier' && supplierSearchBy === 'cnpj') {
        return item.cnpj.toLowerCase().includes(query);
      }

      return `${item.code} ${item.name}`.toLowerCase().includes(query);
    });
  }, [activeLookup, lookupSearch, lookupType, supplierSearchBy]);

  function populateFromLaunch(launch, message = `Lançamento ${launch.id} carregado para edição`) {
    const nextInstallments = launch.installments?.length
      ? launch.installments
      : [{ number: 1, dueDate: launch.dueDate, value: launch.amount.toFixed(2) }];

    setUnit(formatUnit(launch.unit));
    setLaunchNumber(launch.id);
    setLoadedLaunchId(launch.id);
    setLoadedLaunchStatus(launch.status || '');
    setSupplier(formatSupplier(launch));
    setAccountingType(formatAccountingType(launch));
    setChargeType(launch.chargeType || '');
    setDocumentNumber(launch.document || '');
    setIssueDate(launch.issueDate || todayValue());
    setDueDate(launch.dueDate || '');
    setLaunchValue(launch.amount ? launch.amount.toFixed(2) : '');
    setQuantity(String(nextInstallments.length || 1));
    setInterval('30');
    setInstallmentValue(nextInstallments.length ? (launch.amount / nextInstallments.length).toFixed(2) : '');
    setInstallments(nextInstallments);
    setNotes(launch.notes || '');
    setSettlementNote(launch.settlementNote || '');
    setPaymentBank(launch.paymentBank || '');
    setAttachments(launch.attachments || []);
    setStatus(message);
  }

  useEffect(() => {
    if (initialLaunch?.id) {
      populateFromLaunch(initialLaunch);
    }
  }, [initialLaunch?.id]);

  function refreshInstallments(next = {}) {
    const nextLaunchValue = next.launchValue ?? launchValue;
    const nextQuantity = next.quantity ?? quantity;
    const nextDueDate = next.dueDate ?? dueDate;
    const nextInterval = next.interval ?? interval;

    setInstallments(buildInstallments({
      total: nextLaunchValue,
      quantity: nextQuantity,
      dueDate: nextDueDate,
      interval: nextInterval,
      fixedValue: next.fixedValue,
    }));

    if (next.fixedValue === undefined) {
      const average = toNumber(nextLaunchValue) / toPositiveInteger(nextQuantity);
      setInstallmentValue(average ? average.toFixed(2) : '');
    }

    setStatus('');
  }

  function openLookup(type) {
    setLookupType(type);
    setLookupSearch('');
    setSupplierSearchBy('name');
  }

  function closeLookup() {
    setLookupType(null);
    setLookupSearch('');
  }

  function selectLookupItem(item) {
    const value = activeLookup.format(item);

    if (lookupType === 'launch') {
      populateFromLaunch(item);
      closeLookup();
      return;
    }

    if (lookupType === 'unit') setUnit(value);
    if (lookupType === 'supplier') setSupplier(value);
    if (lookupType === 'accountingType') setAccountingType(value);

    closeLookup();
  }

  function handleLaunchNumberChange(value) {
    setLaunchNumber(value);
    const launch = findFinanceLaunchById(value);

    if (launch) {
      populateFromLaunch(launch);
      return;
    }

    setLoadedLaunchId('');
    setLoadedLaunchStatus('');
    setStatus('');
  }

  function handleLaunchValueChange(value) {
    setLaunchValue(value);
    refreshInstallments({ launchValue: value });
  }

  function handleQuantityChange(value) {
    setQuantity(value);
    refreshInstallments({ quantity: value });
  }

  function handleIntervalChange(value) {
    setInterval(value);
    refreshInstallments({ interval: value });
  }

  function handleDueDateChange(value) {
    setDueDate(value);
    refreshInstallments({ dueDate: value });
  }

  function handleInstallmentValueChange(value) {
    const total = toNumber(value) * toPositiveInteger(quantity);
    setInstallmentValue(value);
    setLaunchValue(total ? total.toFixed(2) : '');
    refreshInstallments({ launchValue: total, fixedValue: value });
  }

  function handleInstallmentRowChange(index, field, value) {
    const nextInstallments = installments.map((installment, itemIndex) => (
      itemIndex === index ? { ...installment, [field]: value } : installment
    ));
    const total = nextInstallments.reduce((sum, installment) => sum + toNumber(installment.value), 0);

    setInstallments(nextInstallments);
    setLaunchValue(total ? total.toFixed(2) : '');
    setInstallmentValue(nextInstallments.length && total ? (total / nextInstallments.length).toFixed(2) : '');
    setStatus('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const generatedLaunchNumber = launchNumber || nextLaunchNumber();

    if (isSettledLaunch) {
      setStatus(`Lançamento ${generatedLaunchNumber} baixado: somente novos documentos podem ser anexados`);
      return;
    }

    setLaunchNumber(generatedLaunchNumber);
    setLoadedLaunchId(generatedLaunchNumber);
    setLoadedLaunchStatus('Aberto');
    setStatus(
      loadedLaunchId
        ? `Lançamento ${generatedLaunchNumber} atualizado`
        : `Lançamento ${generatedLaunchNumber} criado com ${attachments.length} anexo(s)`,
    );
  }

  function handleReset() {
    setUnit(defaultUnit);
    setLaunchNumber('');
    setLoadedLaunchId('');
    setLoadedLaunchStatus('');
    setSupplier('');
    setAccountingType('');
    setChargeType('');
    setDocumentNumber('');
    closeLookup();
    setIssueDate(todayValue());
    setDueDate('');
    setLaunchValue('');
    setQuantity('1');
    setInterval('30');
    setInstallmentValue('');
    setInstallments([{ number: 1, dueDate: '', value: '' }]);
    setNotes('');
    setSettlementNote('');
    setPaymentBank('');
    setAttachments([]);
    setStatus('');
  }

  function handleAddAttachments(files) {
    setAttachments((current) => [...current, ...files]);
    setStatus('');
  }

  return (
    <section className="accounts-payable-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Cadastro de Contas a Pagar</h1>
          <p className="page-kicker">Lançamentos de contas a pagar</p>
        </div>
      </header>

      <form className="finance-form" onSubmit={handleSubmit} onReset={handleReset}>
        {isSettledLaunch && (
          <div className="locked-record-notice">
            Lançamento baixado: os dados ficam bloqueados para edição, mas novos documentos podem ser anexados.
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <span>Unidade</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Código da empresa"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                readOnly={isSettledLaunch}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar unidade"
                title="Pesquisar unidade"
                tabIndex={-1}
                disabled={isSettledLaunch}
                onClick={() => openLookup('unit')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field">
            <span>Número do Lançamento</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Digite ou gere ao criar"
                value={launchNumber}
                onChange={(event) => handleLaunchNumberChange(event.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar lançamento"
                title="Pesquisar lançamento"
                tabIndex={-1}
                onClick={() => openLookup('launch')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field field--span-2">
            <span>Fornecedor</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Código ou nome"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                readOnly={isSettledLaunch}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar fornecedor"
                title="Pesquisar fornecedor"
                tabIndex={-1}
                disabled={isSettledLaunch}
                onClick={() => openLookup('supplier')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="field">
            <span>Tipo</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Classificação contábil"
                value={accountingType}
                onChange={(event) => setAccountingType(event.target.value)}
                readOnly={isSettledLaunch}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar tipo"
                title="Pesquisar tipo"
                tabIndex={-1}
                disabled={isSettledLaunch}
                onClick={() => openLookup('accountingType')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Tipo de cobranca</span>
            <select value={chargeType} onChange={(event) => setChargeType(event.target.value)} disabled={isSettledLaunch} required>
              <option value="">Selecione</option>
              {chargeTypes.map((type) => (
                <option value={type} key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Documento</span>
            <input
              type="text"
              placeholder="Número do documento"
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              readOnly={isSettledLaunch}
              required
            />
          </label>

          <label className="field">
            <span>Data de emissão</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} disabled={isSettledLaunch} required />
          </label>

          <label className="field">
            <span>Data de vencimento</span>
            <input type="date" value={dueDate} onChange={(event) => handleDueDateChange(event.target.value)} disabled={isSettledLaunch} required />
          </label>

          <label className="field">
            <span>Valor do lançamento</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={launchValue}
              onChange={(event) => handleLaunchValueChange(event.target.value)}
              readOnly={isSettledLaunch}
              required
            />
          </label>

          <label className="field">
            <span>Quantidade de parcelas</span>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => handleQuantityChange(event.target.value)}
              readOnly={isSettledLaunch}
              required
            />
          </label>

          <label className="field">
            <span>Intervalo entre parcelas</span>
            <input
              type="number"
              min="0"
              step="1"
              value={interval}
              onChange={(event) => handleIntervalChange(event.target.value)}
              readOnly={isSettledLaunch}
              required
            />
          </label>

          <label className="field">
            <span>Valor da parcela</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={installmentValue}
              onChange={(event) => handleInstallmentValueChange(event.target.value)}
              readOnly={isSettledLaunch}
            />
          </label>

          <label className="field field--span-4">
            <span>Observação</span>
            <textarea
              placeholder="Observação do lançamento"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              readOnly={isSettledLaunch}
            />
          </label>

          {isSettledLaunch && (
            <>
              <label className="field">
                <span>Banco do pagamento</span>
                <input type="text" value={paymentBank} placeholder="Sem banco informado" readOnly />
              </label>

              <label className="field field--span-4">
                <span>Observação de baixa</span>
                <textarea
                  placeholder="Sem observacao de baixa"
                  value={settlementNote}
                  readOnly
                />
              </label>
            </>
          )}
        </div>

        <AttachmentPanel attachments={attachments} onAddFiles={handleAddAttachments} />

        <div className="installments-panel">
          <h2 className="installments-title">Parcelas</h2>
          <table className="installments-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Vencimento</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((installment, index) => (
                <tr key={`${installment.number}-${index}`}>
                  <td>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={installment.number}
                      onChange={(event) => handleInstallmentRowChange(index, 'number', event.target.value)}
                      readOnly={isSettledLaunch}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={installment.dueDate}
                      onChange={(event) => handleInstallmentRowChange(index, 'dueDate', event.target.value)}
                      disabled={isSettledLaunch}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={installment.value}
                      onChange={(event) => handleInstallmentRowChange(index, 'value', event.target.value)}
                      readOnly={isSettledLaunch}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">{isSettledLaunch ? 'Salvar anexos' : loadedLaunchId ? 'Salvar alterações' : 'Criar lançamento'}</button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>

      {activeLookup && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="lookup-modal-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="lookup-modal-title">{activeLookup.title}</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              {lookupType === 'supplier' && (
                <div className="lookup-mode" aria-label="Pesquisar fornecedor por">
                  <button
                    type="button"
                    className={supplierSearchBy === 'name' ? 'lookup-mode-button active' : 'lookup-mode-button'}
                    onClick={() => setSupplierSearchBy('name')}
                  >
                    Nome
                  </button>
                  <button
                    type="button"
                    className={supplierSearchBy === 'cnpj' ? 'lookup-mode-button active' : 'lookup-mode-button'}
                    onClick={() => setSupplierSearchBy('cnpj')}
                  >
                    CNPJ
                  </button>
                </div>
              )}

              <input
                type="search"
                className="lookup-search"
                placeholder={lookupType === 'supplier' && supplierSearchBy === 'cnpj' ? 'Pesquisar por CNPJ' : 'Pesquisar'}
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    {activeLookup.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lookupItems.map((item) => (
                    <tr key={`${lookupType}-${item.code}`} onClick={() => selectLookupItem(item)}>
                      {getLookupCells(lookupType, item).map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {lookupItems.length === 0 && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
