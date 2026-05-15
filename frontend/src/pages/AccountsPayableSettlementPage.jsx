import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { paymentBanks } from '../data/financeData.js';

const businessUnits = [
  { code: '001', name: 'JTD Transportes LTDA' },
  { code: '002', name: 'JTD Logística Nordeste' },
  { code: '003', name: 'JTD Armazéns Salvador' },
];

const paymentMethods = ['Boleto', 'Pix', 'Transferência', 'Cartão', 'Dinheiro'];

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayValue() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dateInputValue(date);
}

const defaultSettlementDate = yesterdayValue();

const pendingLaunches = [
  {
    id: 'CAP-202605-00001',
    unit: '001',
    supplier: 'Auto Posto Central LTDA',
    type: 'Combustível',
    document: 'NF-8742',
    dueDate: defaultSettlementDate,
    amount: 1350.25,
    paymentMethod: 'Boleto',
  },
  {
    id: 'CAP-202605-00002',
    unit: '001',
    supplier: 'Oficina São Jorge',
    type: 'Manutenção',
    document: 'OS-1180',
    dueDate: defaultSettlementDate,
    amount: 780.0,
    paymentMethod: 'Pix',
  },
  {
    id: 'CAP-202605-00003',
    unit: '002',
    supplier: 'Seguradora Atlântica',
    type: 'Seguro',
    document: 'AP-4409',
    dueDate: '2026-05-20',
    amount: 2420.5,
    paymentMethod: 'Boleto',
  },
  {
    id: 'CAP-202605-00004',
    unit: '003',
    supplier: 'Transportes Parceiros SA',
    type: 'Serviços de transporte',
    document: 'FAT-3321',
    dueDate: '2026-05-25',
    amount: 990.9,
    paymentMethod: 'Transferência',
  },
  {
    id: 'CAP-202605-00005',
    unit: '001',
    supplier: 'Auto Posto Central LTDA',
    type: 'Pedágio',
    document: 'DUP-0091',
    dueDate: '2026-05-15',
    amount: 310.4,
    paymentMethod: 'Boleto',
  },
];

const supplierOptions = [...new Set(pendingLaunches.map((launch) => launch.supplier))];
const typeOptions = [...new Set(pendingLaunches.map((launch) => launch.type))];

function currency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function numberValue(value) {
  return Number.parseFloat(String(value).replace(',', '.')) || 0;
}

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function MultiSelectorBox({ title, enabled, onEnabledChange, options, selected, onSelectedChange, columns }) {
  const [query, setQuery] = useState('');
  const visibleOptions = enabled
    ? options.filter((option, index) => normalizeText(`${index + 1} ${option}`).includes(normalizeText(query)))
    : options;

  function handleModeChange(nextEnabled) {
    onEnabledChange(nextEnabled);
    onSelectedChange([]);
    setQuery('');
  }

  function toggleOption(option) {
    if (selected.includes(option)) {
      onSelectedChange(selected.filter((item) => item !== option));
      return;
    }

    onSelectedChange([...selected, option]);
  }

  return (
    <section className="batch-filter-box">
      <div className="batch-filter-line">
        <label>
          {title}
          <select value={enabled ? 'sim' : 'todos'} onChange={(event) => handleModeChange(event.target.value === 'sim')}>
            <option value="todos">Todos</option>
            <option value="sim">Selecionar</option>
          </select>
        </label>
      </div>

      {enabled && (
        <div className="batch-filter-search">
          <input
            type="search"
            placeholder={title === 'Selecionar Fornecedor' ? 'Pesquisar fornecedor' : 'Pesquisar tipo de lançamento'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      <div className="batch-table-box">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleOptions.map((option) => (
              <tr key={option} className={!enabled || selected.includes(option) ? 'active' : ''}>
                <td>
                  <input
                    type="checkbox"
                    disabled={!enabled}
                    checked={!enabled || selected.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                </td>
                <td>{option}</td>
              </tr>
            ))}
            {enabled && visibleOptions.length === 0 && (
              <tr>
                <td className="batch-empty-cell" colSpan={columns.length}>Nenhuma opção encontrada</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AccountsPayableSettlementPage() {
  const [businessUnit, setBusinessUnit] = useState('');
  const [settlementMode, setSettlementMode] = useState('individual');
  const [settlementDate, setSettlementDate] = useState(defaultSettlementDate);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchPeriodStart, setBatchPeriodStart] = useState(defaultSettlementDate);
  const [batchPeriodEnd, setBatchPeriodEnd] = useState(defaultSettlementDate);
  const [filterSuppliers, setFilterSuppliers] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [filterTypes, setFilterTypes] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentBank, setPaymentBank] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [paymentType, setPaymentType] = useState('Total');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [status, setStatus] = useState('');

  const individualLaunches = useMemo(() => (
    pendingLaunches.filter((launch) => {
      const unitMatches = !businessUnit || launch.unit === businessUnit;
      const dueDateMatches = launch.dueDate === settlementDate;
      const searchMatches = `${launch.id} ${launch.supplier} ${launch.document}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      return unitMatches && dueDateMatches && searchMatches;
    })
  ), [businessUnit, settlementDate, searchTerm]);

  const batchLaunches = useMemo(() => (
    pendingLaunches.filter((launch) => {
      const unitMatches = !businessUnit || launch.unit === businessUnit;
      const startMatches = !batchPeriodStart || launch.dueDate >= batchPeriodStart;
      const endMatches = !batchPeriodEnd || launch.dueDate <= batchPeriodEnd;
      const supplierMatches = !filterSuppliers || selectedSuppliers.includes(launch.supplier);
      const typeMatches = !filterTypes || selectedTypes.includes(launch.type);
      const minMatches = !minAmount || launch.amount >= Number(minAmount);
      const maxMatches = !maxAmount || launch.amount <= Number(maxAmount);

      return unitMatches && startMatches && endMatches && supplierMatches && typeMatches && minMatches && maxMatches;
    })
  ), [businessUnit, batchPeriodStart, batchPeriodEnd, filterSuppliers, filterTypes, maxAmount, minAmount, selectedSuppliers, selectedTypes]);

  const selectedLaunches = useMemo(() => {
    if (settlementMode === 'lote') return batchLaunches;
    return pendingLaunches.filter((launch) => selectedIds.includes(launch.id));
  }, [batchLaunches, selectedIds, settlementMode]);

  const selectedPaymentMethods = useMemo(
    () => [...new Set(selectedLaunches.map((launch) => launch.paymentMethod))],
    [selectedLaunches],
  );

  const selectedTotal = selectedLaunches.reduce((total, launch) => total + launch.amount, 0);
  const adjustmentValue = paymentType === 'Total' ? 0 : numberValue(adjustmentAmount);
  const netSettlementTotal = paymentType === 'Desconto'
    ? Math.max(selectedTotal - adjustmentValue, 0)
    : selectedTotal + adjustmentValue;

  useEffect(() => {
    setPaymentMethod(selectedPaymentMethods.length === 1 ? selectedPaymentMethods[0] : '');
  }, [selectedPaymentMethods]);

  useEffect(() => {
    setSelectedIds((currentIds) => currentIds.filter((id) => individualLaunches.some((launch) => launch.id === id)));
  }, [individualLaunches]);

  useEffect(() => {
    if (paymentType === 'Total') {
      setAdjustmentAmount('');
    }
  }, [paymentType]);

  function addLaunch(launchId) {
    setSelectedIds((currentIds) => (
      currentIds.includes(launchId) ? currentIds : [...currentIds, launchId]
    ));
    setStatus('');
  }

  function removeLaunch(launchId) {
    setSelectedIds((currentIds) => currentIds.filter((id) => id !== launchId));
    setStatus('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedLaunches.length) {
      setStatus('Nenhum lançamento encontrado para baixar');
      return;
    }

    if (!paymentMethod) {
      setStatus('Selecione a forma de pagamento da baixa');
      return;
    }

    if (!paymentBank) {
      setStatus('Selecione o banco do pagamento');
      return;
    }

    if (paymentType !== 'Total' && !adjustmentAmount) {
      setStatus(`Informe o ${paymentType === 'Desconto' ? 'valor do desconto' : 'valor dos juros'}`);
      return;
    }

    setStatus(`${selectedLaunches.length} lançamento(s) baixado(s) em ${settlementDate}`);
  }

  return (
    <section className="accounts-payable-settlement-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Baixa de Contas a Pagar</h1>
          <p className="page-kicker">Seleção e baixa de lançamentos a pagar</p>
        </div>
      </header>

      <form className="finance-form settlement-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade de Negócio</span>
            <select value={businessUnit} onChange={(event) => setBusinessUnit(event.target.value)}>
              <option value="">Todas</option>
              {businessUnits.map((unit) => (
                <option value={unit.code} key={unit.code}>{unit.code} - {unit.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo de baixa</span>
            <select value={settlementMode} onChange={(event) => setSettlementMode(event.target.value)}>
              <option value="individual">Individual</option>
              <option value="lote">Lote</option>
            </select>
          </label>

          <label className="field">
            <span>Data de baixa</span>
            <input type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} required />
          </label>
        </div>

        {settlementMode === 'individual' ? (
          <div className="settlement-layout">
            <section className="selection-panel" aria-labelledby="available-launches-title">
              <div className="selection-panel-header">
                <h2 id="available-launches-title">Lançamentos programados para vencer na data de baixa</h2>
              </div>

              <div className="settlement-search">
                <Search size={16} strokeWidth={2.2} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Pesquisar lançamento, fornecedor ou documento"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="launch-list">
                {individualLaunches.map((launch) => {
                  const isSelected = selectedIds.includes(launch.id);

                  return (
                    <div className={`launch-row ${isSelected ? 'launch-row--selected' : ''}`} key={launch.id}>
                      <div>
                        <strong>{launch.id}</strong>
                        <span>{launch.supplier} · {launch.document}</span>
                      </div>
                      <div>
                        <span>{launch.dueDate}</span>
                        <span>{currency(launch.amount)}</span>
                        <span>{launch.paymentMethod}</span>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Selecionar lançamento"
                        title="Selecionar lançamento"
                        disabled={isSelected}
                        onClick={() => addLaunch(launch.id)}
                      >
                        <Plus size={17} strokeWidth={2.2} />
                      </button>
                    </div>
                  );
                })}
                {!individualLaunches.length && <div className="empty-list">Nenhum lançamento programado para vencer nessa data</div>}
              </div>
            </section>

            <SelectedLaunchesPanel
              selectedLaunches={selectedLaunches}
              selectedTotal={selectedTotal}
              paymentType={paymentType}
              adjustmentValue={adjustmentValue}
              netSettlementTotal={netSettlementTotal}
              onRemove={removeLaunch}
              removable
            />
          </div>
        ) : (
          <div className="batch-settlement-panel">
            <div className="batch-top-grid">
              <label className="field">
                <span>Período inicial</span>
                <input type="date" value={batchPeriodStart} onChange={(event) => setBatchPeriodStart(event.target.value)} />
              </label>

              <label className="field">
                <span>Período final</span>
                <input type="date" value={batchPeriodEnd} onChange={(event) => setBatchPeriodEnd(event.target.value)} />
              </label>

              <label className="field">
                <span>Valor mínimo</span>
                <input type="number" min="0" step="0.01" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="0,00" />
              </label>

              <label className="field">
                <span>Valor máximo</span>
                <input type="number" min="0" step="0.01" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="0,00" />
              </label>
            </div>

            <div className="batch-filter-grid">
              <MultiSelectorBox
                title="Selecionar Fornecedor"
                enabled={filterSuppliers}
                onEnabledChange={setFilterSuppliers}
                options={supplierOptions}
                selected={selectedSuppliers}
                onSelectedChange={setSelectedSuppliers}
                columns={['Fornecedor', 'Razão Social']}
              />

              <MultiSelectorBox
                title="Selecionar Tipo de Lançamento"
                enabled={filterTypes}
                onEnabledChange={setFilterTypes}
                options={typeOptions}
                selected={selectedTypes}
                onSelectedChange={setSelectedTypes}
                columns={['Tipo', 'Nome']}
              />
            </div>

            <SelectedLaunchesPanel
              selectedLaunches={selectedLaunches}
              selectedTotal={selectedTotal}
              paymentType={paymentType}
              adjustmentValue={adjustmentValue}
              netSettlementTotal={netSettlementTotal}
            />
          </div>
        )}

        <div className="form-grid settlement-details-grid">
          <label className="field">
            <span>Forma de pagamento</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required>
              <option value="">
                {selectedPaymentMethods.length > 1 ? 'Pendente de seleção' : 'Selecione'}
              </option>
              {paymentMethods.map((method) => (
                <option value={method} key={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo de pagamento</span>
            <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)}>
              <option>Total</option>
              <option>Desconto</option>
              <option>Juros</option>
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

          <label className="field field--span-4">
            <span>Observação de baixa</span>
            <textarea
              placeholder="Observação da baixa"
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Baixar lançamentos</button>
          {settlementMode === 'individual' && (
            <button type="button" className="secondary-button" onClick={() => setSelectedIds([])}>Limpar seleção</button>
          )}
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>
    </section>
  );
}

function settlementNetAmount(launch, selectedTotal, paymentType, adjustmentValue) {
  if (paymentType === 'Total' || !adjustmentValue || !selectedTotal) return launch.amount;

  const proportionalAdjustment = adjustmentValue * (launch.amount / selectedTotal);
  const netAmount = paymentType === 'Desconto'
    ? launch.amount - proportionalAdjustment
    : launch.amount + proportionalAdjustment;

  return Math.max(netAmount, 0);
}

function SelectedLaunchesPanel({
  selectedLaunches,
  selectedTotal,
  paymentType,
  adjustmentValue,
  netSettlementTotal,
  onRemove,
  removable = false,
}) {
  const shouldShowNetAmount = paymentType !== 'Total' && adjustmentValue > 0;

  return (
    <section className="selection-panel selected-panel" aria-labelledby="selected-launches-title">
      <div className="selection-panel-header">
        <h2 id="selected-launches-title">Selecionados para baixa</h2>
        <strong>{currency(shouldShowNetAmount ? netSettlementTotal : selectedTotal)}</strong>
      </div>

      <div className="selected-list-box">
        {selectedLaunches.map((launch) => {
          const netAmount = settlementNetAmount(launch, selectedTotal, paymentType, adjustmentValue);
          const proportionalAdjustment = Math.abs(launch.amount - netAmount);

          return (
            <div className="selected-launch-row" key={launch.id}>
              <div>
                <strong>{launch.id}</strong>
                <span>{launch.supplier} · {launch.type}</span>
              </div>
              <div className="settlement-value-stack">
                <span>Título: {currency(launch.amount)}</span>
                {shouldShowNetAmount && (
                  <>
                    <span>{paymentType}: {currency(proportionalAdjustment)}</span>
                    <strong>Valor da baixa: {currency(netAmount)}</strong>
                  </>
                )}
              </div>
              {removable && (
                <button
                  type="button"
                  className="mini-remove-button"
                  aria-label="Remover lançamento"
                  onClick={() => onRemove(launch.id)}
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              )}
            </div>
          );
        })}
        {!selectedLaunches.length && <div className="empty-list">Nenhum lançamento selecionado</div>}
      </div>
    </section>
  );
}
