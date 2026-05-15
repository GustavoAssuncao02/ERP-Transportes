import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PieChart } from '../components/FinanceCharts.jsx';
import {
  businessUnits,
  currency,
  financeLaunches,
  normalizeText,
} from '../data/financeData.js';

const storageKey = 'accountsPayableDailySchedule';

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
const documentOptions = [...new Set(openLaunches.map((launch) => launch.document))];

function numberValue(value) {
  return Number.parseFloat(String(value).replace(',', '.'));
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

function MultiCheckField({ label, options, selected, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const allSelected = selected.length === options.length;
  const visibleOptions = options.filter((option) => normalizeText(option).includes(normalizeText(query)));

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
    <div className="field field--span-4 multi-check-field">
      <span>{label}</span>
      <div className="multi-check-box">
        <div className="multi-check-toolbar">
          <input
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Todos
          </label>
        </div>
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
          {!visibleOptions.length && <div className="multi-check-empty">Nenhuma opcao encontrada</div>}
        </div>
      </div>
    </div>
  );
}

export default function AccountsPayableSchedulePage({ onOpenLaunchDetails }) {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('dueDate');
  const [selectedSuppliers, setSelectedSuppliers] = useState(supplierOptions);
  const [selectedTypes, setSelectedTypes] = useState(typeOptions);
  const [selectedDocuments, setSelectedDocuments] = useState(documentOptions);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [launchSearch, setLaunchSearch] = useState('');
  const [scheduledIds, setScheduledIds] = useState(readScheduleIds);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const validIds = scheduledIds.filter((id) => openLaunches.some((launch) => launch.id === id));
    localStorage.setItem(storageKey, JSON.stringify(validIds));
  }, [scheduledIds]);

  const filteredLaunches = useMemo(() => {
    const min = numberValue(minValue);
    const max = numberValue(maxValue);
    const selectedDateField = searchTypes.find((type) => type.field === searchType)?.field || 'dueDate';

    return openLaunches.filter((launch) => {
      const dateValue = launch[selectedDateField];
      const unitMatches = !businessUnit || launch.unit === businessUnit;
      const supplierMatches = selectedSuppliers.includes(launch.supplier);
      const typeMatches = selectedTypes.includes(launch.type);
      const documentMatches = selectedDocuments.includes(launch.document);
      const startMatches = !dateStart || (dateValue && dateValue >= dateStart);
      const endMatches = !dateEnd || (dateValue && dateValue <= dateEnd);
      const minMatches = Number.isNaN(min) || launch.amount >= min;
      const maxMatches = Number.isNaN(max) || launch.amount <= max;

      return unitMatches && supplierMatches && typeMatches && documentMatches && startMatches && endMatches && minMatches && maxMatches;
    });
  }, [businessUnit, dateEnd, dateStart, maxValue, minValue, searchType, selectedDocuments, selectedSuppliers, selectedTypes]);

  const scheduledLaunches = useMemo(
    () => openLaunches.filter((launch) => scheduledIds.includes(launch.id)),
    [scheduledIds],
  );

  const scheduledTotal = totalAmount(scheduledLaunches);

  function addLaunch(launchId) {
    setScheduledIds((current) => (current.includes(launchId) ? current : [...current, launchId]));
    setStatus('Lancamento adicionado a programacao');
  }

  function searchAndAddLaunch() {
    const query = launchSearch.trim();
    const launch = openLaunches.find((item) => normalizeText(item.id) === normalizeText(query));
    const anyLaunch = financeLaunches.find((item) => normalizeText(item.id) === normalizeText(query));

    if (!query) {
      setStatus('Informe o numero do lancamento');
      return;
    }

    if (!anyLaunch) {
      setStatus('Lancamento nao encontrado');
      return;
    }

    if (!launch) {
      setStatus('Somente titulos em aberto podem entrar na programacao');
      return;
    }

    if (scheduledIds.includes(launch.id)) {
      setStatus('Lancamento ja esta na programacao');
      return;
    }

    addLaunch(launch.id);
    setLaunchSearch('');
  }

  function removeLaunch(launchId) {
    setScheduledIds((current) => current.filter((id) => id !== launchId));
    setStatus('Lancamento removido da programacao');
  }

  function clearSchedule() {
    setScheduledIds([]);
    setStatus('Programacao limpa');
  }

  function clearFilters() {
    setBusinessUnit('');
    setSearchType('dueDate');
    setSelectedSuppliers(supplierOptions);
    setSelectedTypes(typeOptions);
    setSelectedDocuments(documentOptions);
    setDateStart('');
    setDateEnd('');
    setMinValue('');
    setMaxValue('');
  }

  return (
    <section className="accounts-payable-schedule-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Programacao de Conta a Pagar</h1>
          <p className="page-kicker">Organizacao diaria dos titulos em aberto para pagamento</p>
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
            placeholder="Pesquisar tipo contabil"
          />

          <MultiCheckField
            label="Selecionar Documento"
            options={documentOptions}
            selected={selectedDocuments}
            onChange={setSelectedDocuments}
            placeholder="Pesquisar documento"
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
          <section className="registered-launches-panel" aria-labelledby="schedule-available-title">
            <div className="registered-launches-header">
              <h2 id="schedule-available-title">Titulos em aberto</h2>
              <div>
                <span>{filteredLaunches.length} titulo(s)</span>
                <strong>{currency(totalAmount(filteredLaunches))}</strong>
              </div>
            </div>

            <div className="schedule-direct-search">
              <label htmlFor="schedule-launch-search">Pesquisar Lancamento</label>
              <div>
                <input
                  id="schedule-launch-search"
                  type="search"
                  placeholder="Numero do lancamento"
                  value={launchSearch}
                  onChange={(event) => setLaunchSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      searchAndAddLaunch();
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-button schedule-search-button"
                  onClick={searchAndAddLaunch}
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
                    <th>Lancamento</th>
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
                            aria-label="Adicionar a programacao"
                            title="Adicionar a programacao"
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

              {!filteredLaunches.length && <div className="empty-list">Nenhum titulo em aberto encontrado</div>}
            </div>
          </section>

          <section className="selection-panel selected-panel" aria-labelledby="schedule-selected-title">
            <div className="selection-panel-header">
              <h2 id="schedule-selected-title">Programacao do dia</h2>
              <strong>{currency(scheduledTotal)}</strong>
            </div>

            <div className="selected-list-box">
              {scheduledLaunches.map((launch) => (
                <div className="selected-launch-row" key={launch.id}>
                  <div>
                    <strong>{launch.id}</strong>
                    <span>{launch.supplier} - {launch.document}</span>
                  </div>
                  <div className="settlement-value-stack">
                    <span>{launch.type}</span>
                    <strong>{currency(launch.amount)}</strong>
                  </div>
                  <button
                    type="button"
                    className="mini-remove-button"
                    aria-label="Remover lancamento"
                    onClick={() => removeLaunch(launch.id)}
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              {!scheduledLaunches.length && <div className="empty-list">Nenhum lancamento programado</div>}
            </div>

            <div className="schedule-actions">
              <button type="button" className="secondary-button" onClick={clearSchedule}>Limpar</button>
              <span className="status-line" aria-live="polite">{status}</span>
            </div>
          </section>
        </div>

        <div className="schedule-chart-grid">
          <section className="chart-panel chart-panel--static">
            <span className="chart-title">Distribuicao por tipo contabil</span>
            <strong>{currency(scheduledTotal)}</strong>
            <PieChart data={groupBy(scheduledLaunches, 'type')} />
          </section>

          <section className="chart-panel chart-panel--static">
            <span className="chart-title">Distribuicao por fornecedor</span>
            <strong>{currency(scheduledTotal)}</strong>
            <PieChart data={groupBy(scheduledLaunches, 'supplier')} />
          </section>
        </div>
      </form>
    </section>
  );
}
