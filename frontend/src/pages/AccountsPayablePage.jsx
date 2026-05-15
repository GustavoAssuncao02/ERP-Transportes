import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

const units = [
  { code: '001', name: 'JTD Transportes LTDA' },
  { code: '002', name: 'JTD Logística Nordeste' },
  { code: '003', name: 'JTD Armazéns Salvador' },
];

const defaultUnit = '1';

const suppliers = [
  { code: '1001', name: 'Auto Posto Central LTDA', cnpj: '12.345.678/0001-90' },
  { code: '2042', name: 'Oficina São Jorge', cnpj: '23.456.789/0001-10' },
  { code: '3110', name: 'Seguradora Atlântica', cnpj: '34.567.890/0001-22' },
  { code: '4208', name: 'Transportes Parceiros SA', cnpj: '45.678.901/0001-33' },
];

const accountingTypes = [
  { code: '01', name: 'Serviços de transporte' },
  { code: '02', name: 'Combustível' },
  { code: '03', name: 'Manutenção' },
  { code: '04', name: 'Pedágio' },
  { code: '05', name: 'Administrativo' },
];

const lookupConfig = {
  unit: {
    title: 'Pesquisar unidade',
    columns: ['Código', 'Unidade'],
    items: units,
    format: (item) => `${item.code} - ${item.name}`,
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

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

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

function toNumber(value) {
  return Number.parseFloat(String(value).replace(',', '.')) || 0;
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
  if (type === 'supplier') {
    return [item.code, item.name, item.cnpj];
  }

  return [item.code, item.name];
}

export default function AccountsPayablePage() {
  const [unit, setUnit] = useState(defaultUnit);
  const [launchNumber, setLaunchNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [accountingType, setAccountingType] = useState('');
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
  const [status, setStatus] = useState('');

  const activeLookup = lookupType ? lookupConfig[lookupType] : null;
  const lookupItems = useMemo(() => {
    if (!activeLookup) return [];

    const query = lookupSearch.trim().toLowerCase();
    if (!query) return activeLookup.items;

    return activeLookup.items.filter((item) => {
      if (lookupType === 'supplier' && supplierSearchBy === 'cnpj') {
        return item.cnpj.toLowerCase().includes(query);
      }

      return `${item.code} ${item.name}`.toLowerCase().includes(query);
    });
  }, [activeLookup, lookupSearch, lookupType, supplierSearchBy]);

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

    if (lookupType === 'unit') setUnit(value);
    if (lookupType === 'supplier') setSupplier(value);
    if (lookupType === 'accountingType') setAccountingType(value);

    closeLookup();
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

    setLaunchNumber(generatedLaunchNumber);
    setStatus(`Lançamento ${generatedLaunchNumber} criado`);
  }

  function handleReset() {
    setUnit(defaultUnit);
    setLaunchNumber('');
    setSupplier('');
    setAccountingType('');
    closeLookup();
    setIssueDate(todayValue());
    setDueDate('');
    setLaunchValue('');
    setQuantity('1');
    setInterval('30');
    setInstallmentValue('');
    setInstallments([{ number: 1, dueDate: '', value: '' }]);
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
        <div className="form-grid">
          <div className="field">
            <span>Unidade</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Código da empresa"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar unidade"
                title="Pesquisar unidade"
                tabIndex={-1}
                onClick={() => openLookup('unit')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Número do Lançamento</span>
            <input type="text" placeholder="Gerado ao criar" value={launchNumber} readOnly tabIndex={-1} />
          </label>

          <div className="field field--span-2">
            <span>Fornecedor</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Código ou nome"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar fornecedor"
                title="Pesquisar fornecedor"
                tabIndex={-1}
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
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar tipo"
                title="Pesquisar tipo"
                tabIndex={-1}
                onClick={() => openLookup('accountingType')}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Tipo de cobrança</span>
            <select required defaultValue="">
              <option value="">Selecione</option>
              <option>Boleto</option>
              <option>Pix</option>
              <option>Transferência</option>
              <option>Cartão</option>
              <option>Dinheiro</option>
            </select>
          </label>

          <label className="field">
            <span>Documento</span>
            <input type="text" placeholder="Número do documento" required />
          </label>

          <label className="field">
            <span>Data de emissão</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
          </label>

          <label className="field">
            <span>Data de vencimento</span>
            <input type="date" value={dueDate} onChange={(event) => handleDueDateChange(event.target.value)} required />
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
            />
          </label>

          <label className="field field--span-4">
            <span>Observação</span>
            <textarea placeholder="Observação do lançamento" />
          </label>
        </div>

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
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={installment.dueDate}
                      onChange={(event) => handleInstallmentRowChange(index, 'dueDate', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={installment.value}
                      onChange={(event) => handleInstallmentRowChange(index, 'value', event.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Criar lançamento</button>
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
