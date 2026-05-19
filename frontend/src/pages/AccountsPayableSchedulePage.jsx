import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PieChart } from '../components/FinanceCharts.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  accountingTypes,
  businessUnits,
  currency,
  financeLaunches,
  normalizeText,
  suppliers,
} from '../data/financeData.js';

const storageKey = 'accountsPayableDailySchedule';
const oneOffStorageKey = 'accountsPayableDailyScheduleOneOffs';
const oneOffDefaultType = 'Sem tipo definido';

const searchTypes = [
  { label: 'Data Emissao', field: 'issueDate' },
  { label: 'Data de Vencimento', field: 'dueDate' },
  { label: 'Data de Cadastro', field: 'createdDate' },
  { label: 'Data de Apropriacao', field: 'appropriationDate' },
  { label: 'Data de Previsao de Pagamento', field: 'paymentForecastDate' },
];

const openLaunches = financeLaunches.filter((launch) => launch.status === 'Aberto');
const supplierOptions = [...new Set(openLaunches.map((launch) => launch.supplier))];
const typeOptions = [...new Set(openLaunches.map((launch) => launch.type))];

const oneOffLookupConfig = {
  supplier: {
    title: 'Pesquisar fornecedor',
    columns: ['Código', 'Nome', 'CNPJ'],
    items: suppliers,
    format: (item) => `${item.code} - ${item.name} - ${item.cnpj}`,
  },
  accountingType: {
    title: 'Pesquisar tipo',
    columns: ['Código', 'Tipo'],
    items: accountingTypes,
    format: (item) => `${item.code} - ${item.name}`,
  },
};

function numberValue(value) {
  return Number.parseFloat(String(value).replace(',', '.'));
}

function digitsOnly(value) {
  return String(value).replace(/\D/g, '');
}

function searchAmountValue(value) {
  const trimmed = String(value).trim();

  if (!/\d/.test(trimmed)) return Number.NaN;

  let sanitized = trimmed.replace(/[^\d,.-]/g, '');

  if (sanitized.includes(',')) {
    sanitized = sanitized.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = sanitized.split('.');

    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      sanitized = sanitized.replace(/\./g, '');
    }
  }

  return Number.parseFloat(sanitized);
}

function launchMatchesDirectSearch(launch, searchValue) {
  const query = normalizeText(searchValue.trim());

  if (!query) return true;

  const documentMatches = normalizeText(launch.document).includes(query);
  const supplierMatches = normalizeText(launch.supplier).includes(query);
  const searchAmount = searchAmountValue(searchValue);
  const amountMatches = Number.isFinite(searchAmount) && Math.abs(launch.amount - searchAmount) < 0.005;
  const searchDigits = digitsOnly(searchValue);
  const amountDigits = digitsOnly(launch.amount.toFixed(2));
  const formattedAmountDigits = digitsOnly(currency(launch.amount));
  const amountTextMatches = searchDigits.length >= 3
    && (amountDigits.includes(searchDigits) || formattedAmountDigits.includes(searchDigits));

  return documentMatches || supplierMatches || amountMatches || amountTextMatches;
}

function getOneOffLookupCells(type, item) {
  if (type === 'supplier') {
    return [item.code, item.name, item.cnpj];
  }

  return [item.code, item.name];
}

function totalAmount(launches) {
  return launches.reduce((sum, launch) => sum + launch.amount, 0);
}

function groupBy(launches, field) {
  const grouped = new Map();

  launches.forEach((launch) => {
    grouped.set(launch[field], (grouped.get(launch[field]) || 0) + launch.amount);
  });

  return [...grouped.entries()]
    .sort(([, leftValue], [, rightValue]) => rightValue - leftValue)
    .map(([label, value]) => ({ label, value }));
}

function readScheduleIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readOneOffLaunches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(oneOffStorageKey) || '[]');

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((launch, index) => ({
        id: String(launch.id || `AV-${index + 1}`),
        supplier: String(launch.supplier || '').trim(),
        type: String(launch.type || oneOffDefaultType).trim() || oneOffDefaultType,
        document: 'Avulso',
        amount: Number(launch.amount),
        isOneOff: true,
      }))
      .filter((launch) => launch.supplier && Number.isFinite(launch.amount) && launch.amount > 0);
  } catch {
    return [];
  }
}

function MultiCheckField({ label, options, selected, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const allSelected = selected.length === options.length;
  const visibleOptions = options.filter((option) => normalizeText(option).includes(normalizeText(query)));
  const selectedSummary = allSelected
    ? 'Todos selecionados'
    : `${selected.length} selecionado(s)`;

  function toggleAll() {
    onChange(allSelected ? [] : options);
  }

  function toggleOption(option) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }

    onChange([...selected, option]);
  }

  return (
    <div
      className={`field field--span-4 multi-check-field${expanded ? ' multi-check-field--expanded' : ' multi-check-field--collapsed'}`}
      onClick={() => setExpanded(true)}
      onFocusCapture={() => setExpanded(true)}
    >
      <span>{label}</span>
      <div className="multi-check-box" aria-expanded={expanded}>
        <div className="multi-check-toolbar">
          {expanded ? (
            <input
              type="search"
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          ) : (
            <button type="button" className="multi-check-summary-button">
              {selectedSummary}
            </button>
          )}
          <label>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Todos
          </label>
        </div>
        {expanded && (
          <div className="multi-check-list">
            {visibleOptions.map((option) => (
              <label className="multi-check-row" key={option}>
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                />
                <span>{option}</span>
              </label>
            ))}
            {!visibleOptions.length && <div className="multi-check-empty">Nenhuma opção encontrada</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountsPayableSchedulePage({ onOpenLaunchDetails }) {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('dueDate');
  const [selectedSuppliers, setSelectedSuppliers] = useState(supplierOptions);
  const [selectedTypes, setSelectedTypes] = useState(typeOptions);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [launchSearch, setLaunchSearch] = useState('');
  const [activeLaunchSearch, setActiveLaunchSearch] = useState('');
  const [scheduledIds, setScheduledIds] = useState(readScheduleIds);
  const [oneOffSupplier, setOneOffSupplier] = useState('');
  const [oneOffType, setOneOffType] = useState('');
  const [oneOffValue, setOneOffValue] = useState('');
  const [oneOffLaunches, setOneOffLaunches] = useState(readOneOffLaunches);
  const [oneOffLookupType, setOneOffLookupType] = useState(null);
  const [oneOffLookupSearch, setOneOffLookupSearch] = useState('');
  const [oneOffSupplierSearchBy, setOneOffSupplierSearchBy] = useState('name');
  const [status, setStatus] = useAutoClearMessage();

  useEffect(() => {
    const validIds = scheduledIds.filter((id) => openLaunches.some((launch) => launch.id === id));
    localStorage.setItem(storageKey, JSON.stringify(validIds));
  }, [scheduledIds]);

  useEffect(() => {
    localStorage.setItem(oneOffStorageKey, JSON.stringify(oneOffLaunches));
  }, [oneOffLaunches]);

  const filteredLaunches = useMemo(() => {
    const min = numberValue(minValue);
    const max = numberValue(maxValue);
    const selectedDateField = searchTypes.find((type) => type.field === searchType)?.field || 'dueDate';

    return openLaunches.filter((launch) => {
      const dateValue = launch[selectedDateField];
      const unitMatches = !businessUnit || launch.unit === businessUnit;
      const supplierMatches = selectedSuppliers.includes(launch.supplier);
      const typeMatches = selectedTypes.includes(launch.type);
      const startMatches = !dateStart || (dateValue && dateValue >= dateStart);
      const endMatches = !dateEnd || (dateValue && dateValue <= dateEnd);
      const minMatches = Number.isNaN(min) || launch.amount >= min;
      const maxMatches = Number.isNaN(max) || launch.amount <= max;
      const directSearchMatches = launchMatchesDirectSearch(launch, activeLaunchSearch);

      return unitMatches && supplierMatches && typeMatches && startMatches && endMatches && minMatches && maxMatches && directSearchMatches;
    });
  }, [activeLaunchSearch, businessUnit, dateEnd, dateStart, maxValue, minValue, searchType, selectedSuppliers, selectedTypes]);

  const scheduledLaunches = useMemo(
    () => openLaunches.filter((launch) => scheduledIds.includes(launch.id)),
    [scheduledIds],
  );

  const scheduledItems = useMemo(
    () => [
      ...scheduledLaunches.map((launch) => ({ ...launch, scheduleKind: 'system' })),
      ...oneOffLaunches.map((launch) => ({ ...launch, scheduleKind: 'one-off' })),
    ],
    [oneOffLaunches, scheduledLaunches],
  );

  const scheduledTotal = totalAmount(scheduledItems);
  const activeOneOffLookup = oneOffLookupType ? oneOffLookupConfig[oneOffLookupType] : null;
  const oneOffLookupItems = useMemo(() => {
    if (!activeOneOffLookup) return [];

    const query = normalizeText(oneOffLookupSearch.trim());
    if (!query) return activeOneOffLookup.items;

    return activeOneOffLookup.items.filter((item) => {
      if (oneOffLookupType === 'supplier' && oneOffSupplierSearchBy === 'cnpj') {
        return normalizeText(item.cnpj).includes(query);
      }

      return normalizeText(`${item.code} ${item.name}`).includes(query);
    });
  }, [activeOneOffLookup, oneOffLookupSearch, oneOffLookupType, oneOffSupplierSearchBy]);

  function addLaunch(launchId) {
    setScheduledIds((current) => (current.includes(launchId) ? current : [...current, launchId]));
    setStatus('Lançamento adicionado a programação');
  }

  function openOneOffLookup(type) {
    setOneOffLookupType(type);
    setOneOffLookupSearch('');
    setOneOffSupplierSearchBy('name');
  }

  function closeOneOffLookup() {
    setOneOffLookupType(null);
    setOneOffLookupSearch('');
  }

  function selectOneOffLookupItem(item) {
    const value = activeOneOffLookup.format(item);

    if (oneOffLookupType === 'supplier') setOneOffSupplier(value);
    if (oneOffLookupType === 'accountingType') setOneOffType(value);

    closeOneOffLookup();
  }

  function addOneOffLaunch() {
    const supplier = oneOffSupplier.trim();
    const type = oneOffType.trim() || oneOffDefaultType;
    const amount = numberValue(oneOffValue);

    if (!supplier) {
      setStatus('Informe o fornecedor do lançamento avulso');
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setStatus('Informe um valor válido para o lançamento avulso');
      return;
    }

    setOneOffLaunches((current) => [
      ...current,
      {
        id: `AV-${Date.now()}`,
        supplier,
        type,
        document: 'Avulso',
        amount,
        isOneOff: true,
      },
    ]);
    setOneOffSupplier('');
    setOneOffType('');
    setOneOffValue('');
    setStatus('Lançamento avulso adicionado a programação');
  }

  function applyLaunchSearch() {
    const query = launchSearch.trim();

    if (!query) {
      setActiveLaunchSearch('');
      setStatus('Busca limpa');
      return;
    }

    setActiveLaunchSearch(query);
    setStatus('Busca aplicada aos títulos em aberto');
  }

  function removeLaunch(launchId) {
    setScheduledIds((current) => current.filter((id) => id !== launchId));
    setStatus('Lançamento removido da programação');
  }

  function removeOneOffLaunch(launchId) {
    setOneOffLaunches((current) => current.filter((launch) => launch.id !== launchId));
    setStatus('Lançamento avulso removido da programação');
  }

  function clearSchedule() {
    setScheduledIds([]);
    setOneOffLaunches([]);
    setStatus('Programação limpa');
  }

  function clearFilters() {
    setBusinessUnit('');
    setSearchType('dueDate');
    setSelectedSuppliers(supplierOptions);
    setSelectedTypes(typeOptions);
    setDateStart('');
    setDateEnd('');
    setMinValue('');
    setMaxValue('');
    setLaunchSearch('');
    setActiveLaunchSearch('');
  }

  return (
    <section className="accounts-payable-schedule-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Programação de Contas a Pagar</h1>
          <p className="page-kicker">Organização diaria dos títulos em aberto para pagamento</p>
        </div>
      </header>

      <form className="finance-form registered-launches-form" onSubmit={(event) => event.preventDefault()}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade</span>
            <select value={businessUnit} onChange={(event) => setBusinessUnit(event.target.value)}>
              <option value="">Todas</option>
              {businessUnits.map((unit) => (
                <option value={unit.value} key={unit.value}>{unit.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Selecionar Tipo Pesquisa</span>
            <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
              {searchTypes.map((type) => (
                <option value={type.field} key={type.field}>{type.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Data inicial</span>
            <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
          </label>

          <label className="field">
            <span>Data final</span>
            <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
          </label>

          <MultiCheckField
            label="Fornecedor"
            options={supplierOptions}
            selected={selectedSuppliers}
            onChange={setSelectedSuppliers}
            placeholder="Pesquisar fornecedor"
          />

          <MultiCheckField
            label="Tipo"
            options={typeOptions}
            selected={selectedTypes}
            onChange={setSelectedTypes}
            placeholder="Pesquisar tipo"
          />

          <label className="field">
            <span>Valor minimo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={minValue}
              onChange={(event) => setMinValue(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Valor maximo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={maxValue}
              onChange={(event) => setMaxValue(event.target.value)}
            />
          </label>

          <div className="field registered-launches-actions">
            <span>&nbsp;</span>
            <button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
          </div>
        </div>

        <div className="schedule-layout">
          <div className="schedule-main-column">
            <section className="registered-launches-panel" aria-labelledby="schedule-available-title">
            <div className="registered-launches-header">
              <h2 id="schedule-available-title">Títulos em aberto</h2>
              <div>
                <span>{filteredLaunches.length} título(s)</span>
                <strong>{currency(totalAmount(filteredLaunches))}</strong>
              </div>
            </div>

            <div className="schedule-direct-search">
              <label htmlFor="schedule-launch-search">Pesquisar Lançamento</label>
              <div>
                <input
                  id="schedule-launch-search"
                  type="search"
                  placeholder="Documento, fornecedor ou valor"
                  value={launchSearch}
                  onChange={(event) => setLaunchSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyLaunchSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-button schedule-search-button"
                  onClick={applyLaunchSearch}
                >
                  <Search size={15} strokeWidth={2.2} />
                  Pesquisar
                </button>
              </div>
            </div>

            <div className="registered-launches-table-wrap">
              <table className="registered-launches-table schedule-table">
                <thead>
                  <tr>
                    <th>Lançamento</th>
                    <th>Fornecedor</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLaunches.map((launch) => {
                    const scheduled = scheduledIds.includes(launch.id);

                    return (
                      <tr
                        key={launch.id}
                        title="Clique duas vezes para abrir os detalhes"
                        onDoubleClick={() => onOpenLaunchDetails?.(launch)}
                      >
                        <td><strong>{launch.id}</strong></td>
                        <td>{launch.supplier}</td>
                        <td>{launch.document}</td>
                        <td>{launch.type}</td>
                        <td>{launch.dueDate}</td>
                        <td>{currency(launch.amount)}</td>
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Adicionar a programação"
                            title="Adicionar a programação"
                            disabled={scheduled}
                            onClick={(event) => {
                              event.stopPropagation();
                              addLaunch(launch.id);
                            }}
                          >
                            <Plus size={16} strokeWidth={2.2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!filteredLaunches.length && <div className="empty-list">Nenhum título em aberto encontrado</div>}
            </div>
          </section>

            <section className="registered-launches-panel schedule-one-off-panel" aria-labelledby="schedule-one-off-title">
              <div className="registered-launches-header">
                <h2 id="schedule-one-off-title">Lançamentos em avulso</h2>
                <div>
                  <span>{oneOffLaunches.length} lançamento(s)</span>
                  <strong>{currency(totalAmount(oneOffLaunches))}</strong>
                </div>
              </div>

              <div className="schedule-one-off-body">
                <div className="schedule-one-off-grid">
                  <label className="field">
                    <span>Fornecedor</span>
                    <div className="lookup-field">
                      <input
                        type="text"
                        placeholder="Código ou nome"
                        value={oneOffSupplier}
                        onChange={(event) => setOneOffSupplier(event.target.value)}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Pesquisar fornecedor"
                        title="Pesquisar fornecedor"
                        tabIndex={-1}
                        onClick={() => openOneOffLookup('supplier')}
                      >
                        <Search size={17} strokeWidth={2.2} />
                      </button>
                    </div>
                  </label>

                  <label className="field">
                    <span>Tipo</span>
                    <div className="lookup-field">
                      <input
                        type="text"
                        placeholder="Tipo"
                        value={oneOffType}
                        onChange={(event) => setOneOffType(event.target.value)}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Pesquisar tipo"
                        title="Pesquisar tipo"
                        tabIndex={-1}
                        onClick={() => openOneOffLookup('accountingType')}
                      >
                        <Search size={17} strokeWidth={2.2} />
                      </button>
                    </div>
                  </label>

                  <label className="field">
                    <span>Valor</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={oneOffValue}
                      onChange={(event) => setOneOffValue(event.target.value)}
                    />
                  </label>

                  <button type="button" className="secondary-button schedule-one-off-add" onClick={addOneOffLaunch}>
                    <Plus size={15} strokeWidth={2.2} />
                    Adicionar
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="selection-panel selected-panel" aria-labelledby="schedule-selected-title">
            <div className="selection-panel-header">
              <h2 id="schedule-selected-title">Programação do dia</h2>
              <strong>{currency(scheduledTotal)}</strong>
            </div>

            <div className="selected-list-box">
              {scheduledItems.map((launch) => {
                const isOneOff = launch.scheduleKind === 'one-off';

                return (
                  <div
                    className={`selected-launch-row${isOneOff ? ' selected-launch-row--one-off' : ''}`}
                    key={`${launch.scheduleKind}-${launch.id}`}
                  >
                    <div>
                      <strong>{isOneOff ? 'Avulso' : launch.id}</strong>
                      <span>{launch.supplier} - {isOneOff ? 'Planejamento avulso' : launch.document}</span>
                    </div>
                    <div className="settlement-value-stack">
                      <span>{launch.type}</span>
                      <strong>{currency(launch.amount)}</strong>
                    </div>
                    <button
                      type="button"
                      className="mini-remove-button"
                      aria-label={isOneOff ? 'Remover lançamento avulso' : 'Remover lançamento'}
                      onClick={() => (isOneOff ? removeOneOffLaunch(launch.id) : removeLaunch(launch.id))}
                    >
                      <X size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                );
              })}
              {!scheduledItems.length && <div className="empty-list">Nenhum lançamento programado</div>}
            </div>

            <div className="schedule-actions">
              <button type="button" className="secondary-button" onClick={clearSchedule}>Limpar</button>
              <span className="status-line" aria-live="polite">{status}</span>
            </div>
          </section>
        </div>

        <div className="schedule-chart-grid">
          <section className="chart-panel chart-panel--static">
            <span className="chart-title">Distribuição por tipo</span>
            <strong>{currency(scheduledTotal)}</strong>
            <PieChart data={groupBy(scheduledItems, 'type')} />
          </section>

          <section className="chart-panel chart-panel--static">
            <span className="chart-title">Distribuição por fornecedor</span>
            <strong>{currency(scheduledTotal)}</strong>
            <PieChart data={groupBy(scheduledItems, 'supplier')} />
          </section>
        </div>
      </form>

      {activeOneOffLookup && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-one-off-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeOneOffLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="schedule-one-off-lookup-title">{activeOneOffLookup.title}</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeOneOffLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              {oneOffLookupType === 'supplier' && (
                <div className="lookup-mode" aria-label="Pesquisar fornecedor por">
                  <button
                    type="button"
                    className={oneOffSupplierSearchBy === 'name' ? 'lookup-mode-button active' : 'lookup-mode-button'}
                    onClick={() => setOneOffSupplierSearchBy('name')}
                  >
                    Nome
                  </button>
                  <button
                    type="button"
                    className={oneOffSupplierSearchBy === 'cnpj' ? 'lookup-mode-button active' : 'lookup-mode-button'}
                    onClick={() => setOneOffSupplierSearchBy('cnpj')}
                  >
                    CNPJ
                  </button>
                </div>
              )}

              <input
                type="search"
                className="lookup-search"
                placeholder={oneOffLookupType === 'supplier' && oneOffSupplierSearchBy === 'cnpj' ? 'Pesquisar por CNPJ' : 'Pesquisar'}
                value={oneOffLookupSearch}
                onChange={(event) => setOneOffLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    {activeOneOffLookup.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {oneOffLookupItems.map((item) => (
                    <tr key={`${oneOffLookupType}-${item.code}`} onClick={() => selectOneOffLookupItem(item)}>
                      {getOneOffLookupCells(oneOffLookupType, item).map((cell, index) => (
                        <td key={`${item.code}-${index}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!oneOffLookupItems.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
