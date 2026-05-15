import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel.jsx';

const units = [
  { code: '001', name: 'JTD Transportes LTDA' },
  { code: '002', name: 'JTD Logistica Nordeste' },
  { code: '003', name: 'JTD Armazens Salvador' },
];

const defaultUnit = '1';

const suppliers = [
  { code: '1001', name: 'Auto Posto Central LTDA', cnpj: '12.345.678/0001-90' },
  { code: '2042', name: 'Oficina Sao Jorge', cnpj: '23.456.789/0001-10' },
  { code: '3110', name: 'Seguradora Atlantica', cnpj: '34.567.890/0001-22' },
  { code: '4208', name: 'Transportes Parceiros SA', cnpj: '45.678.901/0001-33' },
];

const accountingTypes = [
  { code: '01', name: 'Servicos de transporte' },
  { code: '02', name: 'Combustivel' },
  { code: '03', name: 'Manutencao' },
  { code: '04', name: 'Pedagio' },
  { code: '05', name: 'Administrativo' },
];

const lookupConfig = {
  unit: {
    title: 'Pesquisar unidade',
    columns: ['Codigo', 'Unidade'],
    items: units,
    format: (item) => `${item.code} - ${item.name}`,
  },
  supplier: {
    title: 'Pesquisar fornecedor',
    columns: ['Codigo', 'Nome', 'CNPJ'],
    items: suppliers,
    format: (item) => `${item.code} - ${item.name} - ${item.cnpj}`,
  },
  accountingType: {
    title: 'Pesquisar tipo',
    columns: ['Codigo', 'Classificacao contabil'],
    items: accountingTypes,
    format: (item) => `${item.code} - ${item.name}`,
  },
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
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
  const [chargeType, setChargeType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayValue());
  const [paymentValue, setPaymentValue] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [lookupType, setLookupType] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [supplierSearchBy, setSupplierSearchBy] = useState('name');
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

  function handleSubmit(event) {
    event.preventDefault();
    const generatedPaymentNumber = paymentNumber || nextPaymentNumber();

    setPaymentNumber(generatedPaymentNumber);
    setStatus(`Pagamento avulso ${generatedPaymentNumber} lancado e baixado em ${paymentDate} com ${attachments.length} anexo(s)`);
  }

  function handleReset() {
    setUnit(defaultUnit);
    setPaymentNumber('');
    setSupplier('');
    setAccountingType('');
    setChargeType('');
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
          <p className="page-kicker">Lancamento e baixa de pagamento em um unico fluxo</p>
        </div>
      </header>

      <form className="finance-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <div className="field">
            <span>Unidade</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Codigo da empresa"
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
            <span>Numero do pagamento</span>
            <input type="text" placeholder="Gerado ao baixar" value={paymentNumber} readOnly tabIndex={-1} />
          </label>

          <div className="field field--span-2">
            <span>Fornecedor</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Codigo ou nome"
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
                placeholder="Classificacao contabil"
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
            <span>Tipo de cobranca</span>
            <select value={chargeType} onChange={(event) => setChargeType(event.target.value)} required>
              <option value="">Selecione</option>
              <option>Boleto</option>
              <option>Pix</option>
              <option>Transferencia</option>
              <option>Cartao</option>
              <option>Dinheiro</option>
            </select>
          </label>

          <label className="field">
            <span>Documento</span>
            <input
              type="text"
              placeholder="Numero do documento"
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

          <label className="field field--span-4">
            <span>Observacao</span>
            <textarea
              placeholder="Observacao do pagamento avulso"
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
                    <tr key={`${lookupType}-${item.code}`} onClick={() => selectLookupItem(item)}>
                      {getLookupCells(lookupType, item).map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
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
