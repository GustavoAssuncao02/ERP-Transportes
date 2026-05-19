import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { chargeTypes, currency, financeLaunches, paymentBanks } from '../data/financeData.js';

const units = [
  { code: '001', name: 'JTD Transportes LTDA' },
  { code: '002', name: 'JTD Logística Nordeste' },
  { code: '003', name: 'JTD Armazéns Salvador' },
];

const defaultUnit = '001';

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

const settlementTypeOptions = ['Baixa avulsa', 'Baixa manual', 'Reembolso', 'Complemento de pagamento'];
const paymentTypeOptions = ['Total', 'Desconto', 'Juros'];
const paymentMethodOptions = chargeTypes;

const lookupConfig = {
  payment: {
    title: 'Pesquisar pagamento',
    columns: ['Pagamento', 'Data', 'Fornecedor', 'Documento', 'Situação', 'Valor'],
    items: financeLaunches
      .filter((launch) => launch.id.startsWith('PAV-'))
      .sort((left, right) => dateDistance(left.paymentDate || left.issueDate) - dateDistance(right.paymentDate || right.issueDate)),
    format: (item) => item.id,
  },
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

function dateDistance(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.abs(date.getTime() - Date.now());
}

function numberValue(value) {
  return Number.parseFloat(String(value).replace(',', '.')) || 0;
}

function nextPaymentNumber() {
  const now = new Date();
  const key = 'oneOffPaymentSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `PAV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

function getLookupCells(type, item) {
  if (type === 'payment') {
    return [
      item.id,
      item.paymentDate || item.issueDate || '',
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

export default function OneOffPaymentPage() {
  const [unit, setUnit] = useState(defaultUnit);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [accountingType, setAccountingType] = useState('');
  const [settlementType, setSettlementType] = useState(settlementTypeOptions[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentType, setPaymentType] = useState('Total');
  const [paymentBank, setPaymentBank] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayValue());
  const [paymentValue, setPaymentValue] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [supplierSearchBy, setSupplierSearchBy] = useState('name');
  const [status, setStatus] = useAutoClearMessage();

  const activeLookup = lookupType ? lookupConfig[lookupType] : null;
  const paymentAmount = numberValue(paymentValue);
  const adjustmentValue = numberValue(adjustmentAmount);
  const finalPaymentValue = paymentType === 'Desconto'
    ? Math.max(0, paymentAmount - adjustmentValue)
    : paymentType === 'Juros'
      ? paymentAmount + adjustmentValue
      : paymentAmount;
  const lookupItems = useMemo(() => {
    if (!activeLookup) return [];

    const query = lookupSearch.trim().toLowerCase();
    if (!query) return activeLookup.items;

    return activeLookup.items.filter((item) => {
      if (lookupType === 'payment') {
        return `${item.id} ${item.supplier} ${item.document} ${item.status}`.toLowerCase().includes(query);
      }

      if (lookupType === 'supplier' && supplierSearchBy === 'cnpj') {
        return item.cnpj.toLowerCase().includes(query);
      }

      return `${item.code} ${item.name}`.toLowerCase().includes(query);
    });
  }, [activeLookup, lookupSearch, lookupType, supplierSearchBy]);

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

    if (lookupType === 'payment') {
      populateFromPayment(item);
      closeLookup();
      return;
    }

    if (lookupType === 'unit') setUnit(value);
    if (lookupType === 'supplier') setSupplier(value);
    if (lookupType === 'accountingType') setAccountingType(value);

    closeLookup();
  }

  function formatUnitLabel(unitCode) {
    const selectedUnit = units.find((item) => item.code === unitCode);
    return selectedUnit ? `${selectedUnit.code} - ${selectedUnit.name}` : unitCode;
  }

  function formatSupplierLabel(launch) {
    const selectedSupplier = suppliers.find((item) => item.code === launch.supplierCode || item.name === launch.supplier);
    return selectedSupplier ? `${selectedSupplier.code} - ${selectedSupplier.name} - ${selectedSupplier.cnpj}` : launch.supplier;
  }

  function formatAccountingTypeLabel(launch) {
    const selectedType = accountingTypes.find((item) => item.code === launch.accountingTypeCode || item.name === launch.type);
    return selectedType ? `${selectedType.code} - ${selectedType.name}` : launch.type;
  }

  function populateFromPayment(payment) {
    setUnit(formatUnitLabel(payment.unit));
    setPaymentNumber(payment.id);
    setSupplier(formatSupplierLabel(payment));
    setAccountingType(formatAccountingTypeLabel(payment));
    setSettlementType(settlementTypeOptions[0]);
    setPaymentMethod(payment.chargeType || '');
    setPaymentBank(payment.paymentBank || '');
    if (payment.discountAmount) {
      setPaymentType('Desconto');
      setAdjustmentAmount(String(payment.discountAmount));
    } else if (payment.interestAmount) {
      setPaymentType('Juros');
      setAdjustmentAmount(String(payment.interestAmount));
    } else {
      setPaymentType('Total');
      setAdjustmentAmount('');
    }
    setDocumentNumber(payment.document || '');
    setPaymentDate(payment.paymentDate || payment.issueDate || todayValue());
    setPaymentValue(payment.amount ? payment.amount.toFixed(2) : '');
    setNotes(payment.notes || '');
    setAttachments(payment.attachments || []);
    setStatus(`Pagamento ${payment.id} carregado para consulta`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (paymentType !== 'Total' && !adjustmentAmount) {
      setStatus(`Informe o ${paymentType === 'Desconto' ? 'valor do desconto' : 'valor dos juros'}`);
      return;
    }

    const generatedPaymentNumber = paymentNumber || nextPaymentNumber();

    setPaymentNumber(generatedPaymentNumber);
    setStatus(`Pagamento avulso ${generatedPaymentNumber} baixado em ${paymentDate} no valor final de ${currency(finalPaymentValue)} com ${attachments.length} anexo(s)`);
  }

  function handleReset() {
    setUnit(defaultUnit);
    setPaymentNumber('');
    setSupplier('');
    setAccountingType('');
    setSettlementType(settlementTypeOptions[0]);
    setPaymentMethod('');
    setPaymentType('Total');
    setPaymentBank('');
    setAdjustmentAmount('');
    setDocumentNumber('');
    setPaymentDate(todayValue());
    setPaymentValue('');
    setNotes('');
    setAttachments([]);
    closeLookup();
    setStatus('');
  }

  function handleAddAttachments(files) {
    setAttachments((current) => [...current, ...files]);
    setStatus('');
  }

  return (
    <section className="one-off-payment-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Pagamento Avulso</h1>
          <p className="page-kicker">Lançamento e baixa de pagamento em um único fluxo</p>
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

          <div className="field">
            <span>Número do pagamento</span>
            <div className="lookup-field">
              <input type="text" placeholder="Gerado ao baixar" value={paymentNumber} readOnly tabIndex={-1} />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar pagamento"
                title="Pesquisar pagamento"
                tabIndex={-1}
                onClick={() => openLookup('payment')}
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
            <span>Tipo de baixa</span>
            <select value={settlementType} onChange={(event) => setSettlementType(event.target.value)} required>
              {settlementTypeOptions.map((type) => (
                <option value={type} key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Banco</span>
            <select value={paymentBank} onChange={(event) => setPaymentBank(event.target.value)} required>
              <option value="">Selecione</option>
              {paymentBanks.map((bank) => (
                <option value={bank} key={bank}>{bank}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Forma de pagamento</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required>
              <option value="">Selecione</option>
              {paymentMethodOptions.map((method) => (
                <option value={method} key={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo de pagamento</span>
            <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)} required>
              {paymentTypeOptions.map((type) => (
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
              required
            />
          </label>

          <label className="field">
            <span>Data do Pagamento</span>
            <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
          </label>

          <label className="field">
            <span>Valor do pagamento</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={paymentValue}
              onChange={(event) => setPaymentValue(event.target.value)}
              required
            />
          </label>

          {paymentType !== 'Total' && (
            <label className="field">
              <span>{paymentType === 'Desconto' ? 'Valor do desconto' : 'Valor dos juros'}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                required
              />
            </label>
          )}

          <label className="field">
            <span>Valor final baixado</span>
            <input type="text" value={currency(finalPaymentValue)} readOnly />
          </label>

          <label className="field field--span-4">
            <span>Observação</span>
            <textarea
              placeholder="Observação do pagamento avulso"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        <AttachmentPanel attachments={attachments} onAddFiles={handleAddAttachments} />

        <div className="form-actions">
          <button type="submit" className="primary-button">Lançar Baixado</button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>

      {activeLookup && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="one-off-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="one-off-lookup-title">{activeLookup.title}</h2>
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
                    <tr key={`${lookupType}-${item.id || item.code}`} onClick={() => selectLookupItem(item)}>
                      {getLookupCells(lookupType, item).map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
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
