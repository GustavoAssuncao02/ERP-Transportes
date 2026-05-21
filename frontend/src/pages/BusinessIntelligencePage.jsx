import { useMemo, useState } from 'react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import { LineChart, PieChart } from '../components/FinanceCharts.jsx';
import {
  accountingTypeNames,
  chargeTypes,
  currency,
  documentNumbers,
  financeLaunches,
  normalizeText,
  paymentBanks,
  supplierNames,
  todayValue,
} from '../data/financeData.js';
import { identifierNumberValue, sortTableRows } from '../utils/tableSort.js';

const searchTypes = [
  { label: 'Data Emissao', field: 'issueDate' },
  { label: 'Data de Vencimento', field: 'dueDate' },
  { label: 'Data de Cadastro', field: 'createdDate' },
  { label: 'Data de Pagamento', field: 'paymentDate' },
  { label: 'Data de Apropriacao', field: 'appropriationDate' },
  { label: 'Data de Previsao de Pagamento', field: 'paymentForecastDate' },
];

const statusOptions = ['Aberto', 'Baixado'];
const bankOptions = ['Sem banco', ...paymentBanks];

function bankLabel(launch) {
  return launch.paymentBank || 'Sem banco';
}

const biLaunchSortColumns = [
  { key: 'id', label: 'Lançamento', type: 'number', getValue: (launch) => identifierNumberValue(launch.id) },
  { key: 'unit', label: 'Unidade', type: 'text', getValue: (launch) => launch.unit },
  { key: 'supplier', label: 'Fornecedor', type: 'text', getValue: (launch) => launch.supplier },
  { key: 'document', label: 'Documento', type: 'text', getValue: (launch) => launch.document },
  { key: 'type', label: 'Tipo', type: 'text', getValue: (launch) => launch.type },
  { key: 'chargeType', label: 'Cobrança', type: 'text', getValue: (launch) => launch.chargeType },
  { key: 'bank', label: 'Banco', type: 'text', getValue: (launch) => bankLabel(launch) },
  { key: 'dueDate', label: 'Vencimento', type: 'date', getValue: (launch) => launch.dueDate },
  { key: 'paymentDate', label: 'Pagamento', type: 'date', getValue: (launch) => launch.paymentDate },
  { key: 'amount', label: 'Valor', type: 'number', getValue: (launch) => launch.amount },
  { key: 'status', label: 'Situação', type: 'text', getValue: (launch) => launch.status },
];

function groupByDate(launches, field) {
  const grouped = new Map();

  launches.forEach((launch) => {
    const key = launch[field];
    if (!key) return;
    grouped.set(key, (grouped.get(key) || 0) + launch.amount);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function groupByType(launches) {
  const grouped = new Map();

  launches.forEach((launch) => {
    grouped.set(launch.type, (grouped.get(launch.type) || 0) + launch.amount);
  });

  return [...grouped.entries()]
    .sort(([, leftValue], [, rightValue]) => rightValue - leftValue)
    .map(([label, value]) => ({ label, value }));
}

function totalAmount(launches) {
  return launches.reduce((sum, launch) => sum + launch.amount, 0);
}

function MetricCard({ label, value, detail }) {
  return (
    <section className="bi-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </section>
  );
}

function ChartButton({ title, subtitle, children, onClick }) {
  return (
    <button type="button" className="chart-panel" onClick={onClick}>
      <span className="chart-title">{title}</span>
      <strong>{subtitle}</strong>
      {children}
    </button>
  );
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
    <div className="field field--span-2 multi-check-field bi-filter-check-field">
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
          {!visibleOptions.length && <div className="multi-check-empty">Nenhuma opção encontrada</div>}
        </div>
      </div>
    </div>
  );
}

function LaunchReport({ title, launches }) {
  const [reportSort, setReportSort] = useState({ key: 'dueDate', direction: 'desc' });
  const sortedLaunches = useMemo(
    () => sortTableRows(
      launches,
      biLaunchSortColumns,
      reportSort,
      (left, right) => identifierNumberValue(right.id) - identifierNumberValue(left.id),
    ),
    [launches, reportSort],
  );
  const total = totalAmount(launches);

  return (
    <section className="bi-report-panel" aria-labelledby="bi-report-title">
      <div className="registered-launches-header">
        <h2 id="bi-report-title">{title}</h2>
        <div>
          <span>{launches.length} título(s)</span>
          <strong>{currency(total)}</strong>
        </div>
      </div>

      <div className="registered-launches-table-wrap">
        <table className="registered-launches-table">
          <thead>
            <tr>
              <SortableTableHeader
                columns={biLaunchSortColumns}
                sort={reportSort}
                onSortChange={setReportSort}
              />
            </tr>
          </thead>
          <tbody>
            {sortedLaunches.map((launch) => (
              <tr key={launch.id}>
                <td><strong>{launch.id}</strong></td>
                <td>{launch.unit}</td>
                <td>{launch.supplier}</td>
                <td>{launch.document}</td>
                <td>{launch.type}</td>
                <td>{launch.chargeType}</td>
                <td>{bankLabel(launch)}</td>
                <td>{launch.dueDate}</td>
                <td>{launch.paymentDate || '-'}</td>
                <td>{currency(launch.amount)}</td>
                <td><span className="launch-status-pill">{launch.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {!launches.length && <div className="empty-list">Nenhum título encontrado</div>}
      </div>
    </section>
  );
}

export default function BusinessIntelligencePage() {
  const today = todayValue();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchType, setSearchType] = useState('dueDate');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState(supplierNames);
  const [selectedStatuses, setSelectedStatuses] = useState(statusOptions);
  const [selectedChargeTypes, setSelectedChargeTypes] = useState(chargeTypes);
  const [selectedDocuments, setSelectedDocuments] = useState(documentNumbers);
  const [selectedTypes, setSelectedTypes] = useState(accountingTypeNames);
  const [selectedBanks, setSelectedBanks] = useState(bankOptions);
  const [reportKey, setReportKey] = useState('open');

  const filteredLaunches = useMemo(() => financeLaunches.filter((launch) => {
    const dateValue = launch[searchType];
    const startMatches = !periodStart || (dateValue && dateValue >= periodStart);
    const endMatches = !periodEnd || (dateValue && dateValue <= periodEnd);
    const supplierMatches = selectedSuppliers.includes(launch.supplier);
    const statusMatches = selectedStatuses.includes(launch.status);
    const chargeMatches = selectedChargeTypes.includes(launch.chargeType);
    const documentMatches = selectedDocuments.includes(launch.document);
    const typeMatches = selectedTypes.includes(launch.type);
    const bankMatches = selectedBanks.includes(bankLabel(launch));

    return startMatches && endMatches && supplierMatches && statusMatches && chargeMatches && documentMatches && typeMatches && bankMatches;
  }), [
    periodEnd,
    periodStart,
    searchType,
    selectedBanks,
    selectedChargeTypes,
    selectedDocuments,
    selectedStatuses,
    selectedSuppliers,
    selectedTypes,
  ]);

  const data = useMemo(() => {
    const open = filteredLaunches.filter((launch) => launch.status === 'Aberto');
    const paid = filteredLaunches.filter((launch) => launch.status === 'Baixado');
    const future = open.filter((launch) => launch.dueDate > today);
    const dueToday = open.filter((launch) => launch.dueDate === today);
    const overdue = open.filter((launch) => launch.dueDate < today);

    return {
      all: filteredLaunches,
      open,
      paid,
      future,
      dueToday,
      overdue,
      futureLine: groupByDate(future, 'dueDate'),
      paidLine: groupByDate(paid, 'paymentDate'),
      dueTodayPie: groupByType(dueToday),
      futurePie: groupByType(future),
      paidPie: groupByType(paid),
      overduePie: groupByType(overdue),
    };
  }, [filteredLaunches, today]);

  const reportMap = {
    open: { title: 'Lançamentos em aberto', launches: data.open },
    future: { title: 'Contas a pagar no futuro', launches: data.future },
    paid: { title: 'Contas pagas', launches: data.paid },
    dueToday: { title: 'Lançamentos a pagar hoje', launches: data.dueToday },
    overdue: { title: 'Lançamentos vencidos', launches: data.overdue },
  };
  const selectedReport = reportMap[reportKey] || reportMap.open;

  function clearFilters() {
    setSearchType('dueDate');
    setPeriodStart('');
    setPeriodEnd('');
    setSelectedSuppliers(supplierNames);
    setSelectedStatuses(statusOptions);
    setSelectedChargeTypes(chargeTypes);
    setSelectedDocuments(documentNumbers);
    setSelectedTypes(accountingTypeNames);
    setSelectedBanks(bankOptions);
  }

  return (
    <section className="business-intelligence-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Business Intelligence</h1>
          <p className="page-kicker">Indicadores financeiros de contas a pagar</p>
        </div>
      </header>

      <section className={`bi-filter-panel ${filtersOpen ? 'bi-filter-panel--open' : ''}`}>
        <button
          type="button"
          className="bi-filter-header"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <span>Filtros</span>
          <strong>{filteredLaunches.length} título(s) considerados</strong>
        </button>

        {filtersOpen && (
          <div className="bi-filter-body">
            <div className="form-grid">
              <label className="field">
                <span>Tipo de data considerada</span>
                <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
                  {searchTypes.map((type) => (
                    <option value={type.field} key={type.field}>{type.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Periodo de</span>
                <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </label>

              <label className="field">
                <span>Ate</span>
                <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </label>

              <div className="field registered-launches-actions">
                <span>&nbsp;</span>
                <button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
              </div>

              <MultiCheckField
                label="Fornecedor"
                options={supplierNames}
                selected={selectedSuppliers}
                onChange={setSelectedSuppliers}
                placeholder="Pesquisar fornecedor"
              />

              <MultiCheckField
                label="Situação de Lançamento"
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
                placeholder="Pesquisar situacao"
              />

              <MultiCheckField
                label="Tipo de Cobrança"
                options={chargeTypes}
                selected={selectedChargeTypes}
                onChange={setSelectedChargeTypes}
                placeholder="Pesquisar tipo de cobranca"
              />

              <MultiCheckField
                label="Selecionar Documento"
                options={documentNumbers}
                selected={selectedDocuments}
                onChange={setSelectedDocuments}
                placeholder="Pesquisar documento"
              />

              <MultiCheckField
                label="Selecionar Tipo"
                options={accountingTypeNames}
                selected={selectedTypes}
                onChange={setSelectedTypes}
                placeholder="Pesquisar tipo contábil"
              />

              <MultiCheckField
                label="Banco do Pagamento"
                options={bankOptions}
                selected={selectedBanks}
                onChange={setSelectedBanks}
                placeholder="Pesquisar banco"
              />
            </div>
          </div>
        )}
      </section>

      <div className="bi-metrics-grid">
        <MetricCard label="Lançamentos considerados" value={data.all.length} detail={currency(totalAmount(data.all))} />
        <MetricCard label="Lançamentos em aberto" value={data.open.length} detail={currency(totalAmount(data.open))} />
        <MetricCard label="Lançamentos baixados" value={data.paid.length} detail={currency(totalAmount(data.paid))} />
        <MetricCard label="Vencidos em aberto" value={data.overdue.length} detail={currency(totalAmount(data.overdue))} />
        <MetricCard label="Vencendo hoje" value={data.dueToday.length} detail={currency(totalAmount(data.dueToday))} />
      </div>

      <div className="bi-chart-grid">
        <ChartButton
          title="Contas a pagar no futuro"
          subtitle={currency(totalAmount(data.future))}
          onClick={() => setReportKey('future')}
        >
          <LineChart data={data.futureLine} />
        </ChartButton>

        <ChartButton
          title="Contas pagas"
          subtitle={currency(totalAmount(data.paid))}
          onClick={() => setReportKey('paid')}
        >
          <LineChart data={data.paidLine} />
        </ChartButton>

        <ChartButton
          title="A pagar hoje por tipo"
          subtitle={currency(totalAmount(data.dueToday))}
          onClick={() => setReportKey('dueToday')}
        >
          <PieChart data={data.dueTodayPie} />
        </ChartButton>

        <ChartButton
          title="Futuros por tipo"
          subtitle={currency(totalAmount(data.future))}
          onClick={() => setReportKey('future')}
        >
          <PieChart data={data.futurePie} />
        </ChartButton>

        <ChartButton
          title="Baixados por tipo"
          subtitle={currency(totalAmount(data.paid))}
          onClick={() => setReportKey('paid')}
        >
          <PieChart data={data.paidPie} />
        </ChartButton>

        <ChartButton
          title="Vencidos por tipo"
          subtitle={currency(totalAmount(data.overdue))}
          onClick={() => setReportKey('overdue')}
        >
          <PieChart data={data.overduePie} />
        </ChartButton>
      </div>

      <LaunchReport title={selectedReport.title} launches={selectedReport.launches} />
    </section>
  );
}
