import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import { LineChart, PieChart } from '../components/FinanceCharts.jsx';
import { currency, normalizeText, paymentBanks, toNumber, todayValue } from '../data/financeData.js';
import {
  readReceivables,
  receivableSearchText,
} from '../data/accountsReceivableRegistry.js';
import { identifierNumberValue, sortTableRows } from '../utils/tableSort.js';

const searchTypes = [
  { value: 'paymentForecastDate', label: 'Previsao de pagamento' },
  { value: 'issueDate', label: 'Data de emissao' },
  { value: 'receiptDate', label: 'Data de baixa' },
];

const defaultStatuses = ['Aberto', 'Parcial', 'Recebido', 'Vencido', 'Rascunho', 'Cancelado'];

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function datePlusDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function lastSettlement(receivable) {
  return [...(receivable.settlements || [])].sort((left, right) => String(right.date).localeCompare(String(left.date))).at(0) || null;
}

function receiptDate(receivable) {
  return receivable.lastReceiptDate || lastSettlement(receivable)?.date || '';
}

function documentLabel(receivable) {
  const documents = [
    receivable.cteId,
    receivable.nfeNumber,
    receivable.mdfeId,
    receivable.collectionOrderId,
  ].filter(Boolean);

  return documents.length ? documents.join(' / ') : 'Sem documento';
}

function bankLabels(receivable) {
  const banks = [
    receivable.lastReceiptBank,
    ...(receivable.settlements || []).map((settlement) => settlement.bank),
  ].filter(Boolean);
  const uniqueBanks = uniqueOptions(banks);

  return uniqueBanks.length ? uniqueBanks : ['Sem banco'];
}

const receivableDashboardSortColumns = [
  { key: 'id', label: 'Titulo', type: 'number', getValue: (receivable) => identifierNumberValue(receivable.id) },
  { key: 'customerName', label: 'Cliente / tomador', type: 'text', getValue: (receivable) => receivable.customerName },
  { key: 'document', label: 'Documento', type: 'text', getValue: (receivable) => documentLabel(receivable) },
  { key: 'issueDate', label: 'Emissao', type: 'date', getValue: (receivable) => receivable.issueDate },
  { key: 'paymentForecastDate', label: 'Previsao', type: 'date', defaultDirection: 'asc', getValue: (receivable) => receivable.paymentForecastDate },
  { key: 'receiptDate', label: 'Ultima baixa', type: 'date', getValue: (receivable) => receiptDate(receivable) },
  { key: 'originalValue', label: 'Original', type: 'number', getValue: (receivable) => receivable.originalValue },
  { key: 'paidValue', label: 'Recebido', type: 'number', getValue: (receivable) => receivable.paidValue },
  { key: 'openBalance', label: 'Saldo', type: 'number', getValue: (receivable) => receivable.openBalance },
  { key: 'bank', label: 'Banco', type: 'text', getValue: (receivable) => bankLabels(receivable).join(' / ') },
  { key: 'status', label: 'Status', type: 'text', getValue: (receivable) => receivable.status },
];

function dateValue(receivable, field) {
  if (field === 'receiptDate') return receiptDate(receivable);
  return receivable[field] || '';
}

function paymentEvents(receivables) {
  return receivables.flatMap((receivable) => {
    const events = (receivable.settlements || []).map((settlement) => ({
      id: settlement.id,
      titleId: receivable.id,
      customerName: receivable.customerName,
      date: settlement.date,
      bank: settlement.bank || 'Sem banco',
      amount: toNumber(settlement.amount),
    }));

    if (!events.length && toNumber(receivable.paidValue) > 0) {
      events.push({
        id: `${receivable.id}-paid`,
        titleId: receivable.id,
        customerName: receivable.customerName,
        date: receiptDate(receivable) || receivable.issueDate,
        bank: receivable.lastReceiptBank || 'Sem banco',
        amount: toNumber(receivable.paidValue),
      });
    }

    return events;
  });
}

function groupByDate(items, dateField, valueField) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = typeof dateField === 'function' ? dateField(item) : item[dateField];
    if (!key) return;
    const value = typeof valueField === 'function' ? valueField(item) : toNumber(item[valueField]);
    grouped.set(key, (grouped.get(key) || 0) + value);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function groupByValue(items, labelField, valueField) {
  const grouped = new Map();

  items.forEach((item) => {
    const label = typeof labelField === 'function' ? labelField(item) : item[labelField];
    const value = typeof valueField === 'function' ? valueField(item) : toNumber(item[valueField]);
    grouped.set(label || 'Nao informado', (grouped.get(label || 'Nao informado') || 0) + value);
  });

  return [...grouped.entries()]
    .sort(([, leftValue], [, rightValue]) => rightValue - leftValue)
    .map(([label, value]) => ({ label, value }));
}

function total(receivables, field) {
  return receivables.reduce((sum, receivable) => sum + toNumber(receivable[field]), 0);
}

function MetricCard({ label, value, detail, active, onClick }) {
  return (
    <button type="button" className={`bi-metric receivable-dashboard-metric ${active ? 'receivable-dashboard-metric--active' : ''}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </button>
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

function LookupFilterField({ className = 'field', label, value, onOpen }) {
  return (
    <div className={className}>
      <span>{label}</span>
      <div className="lookup-field">
        <input type="text" value={value} readOnly />
        <button
          type="button"
          className="icon-button"
          aria-label={`Pesquisar ${label.toLocaleLowerCase('pt-BR')}`}
          title={`Pesquisar ${label.toLocaleLowerCase('pt-BR')}`}
          onClick={onOpen}
        >
          <Search size={17} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

export default function AccountsReceivableDashboardPage() {
  const today = todayValue();
  const [receivables] = useState(readReceivables);
  const [searchType, setSearchType] = useState('paymentForecastDate');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [customerFilter, setCustomerFilter] = useState('todos');
  const [bankFilter, setBankFilter] = useState('todos');
  const [documentFilter, setDocumentFilter] = useState('todos');
  const [freeSearch, setFreeSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [reportKey, setReportKey] = useState('open');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeLookup, setActiveLookup] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [dashboardSort, setDashboardSort] = useState({ key: 'paymentForecastDate', direction: 'asc' });

  const filterOptions = useMemo(() => {
    const statusOptions = uniqueOptions([...defaultStatuses, ...receivables.map((receivable) => receivable.status)]);
    const customerOptions = uniqueOptions(receivables.map((receivable) => receivable.customerName || 'Sem cliente'));
    const banks = uniqueOptions([
      'Sem banco',
      ...paymentBanks,
      ...receivables.flatMap(bankLabels),
    ]);
    const documentOptions = uniqueOptions(receivables.map(documentLabel));

    return { statusOptions, customerOptions, banks, documentOptions };
  }, [receivables]);

  const filteredReceivables = useMemo(() => {
    const search = normalizeText(freeSearch);
    const minValue = toNumber(minAmount);
    const maxValue = toNumber(maxAmount);

    return receivables.filter((receivable) => {
      const selectedDate = dateValue(receivable, searchType);
      const startMatches = !periodStart || (selectedDate && selectedDate >= periodStart);
      const endMatches = !periodEnd || (selectedDate && selectedDate <= periodEnd);
      const statusMatches = statusFilter === 'todos' || receivable.status === statusFilter;
      const customerMatches = customerFilter === 'todos' || (receivable.customerName || 'Sem cliente') === customerFilter;
      const bankMatches = bankFilter === 'todos' || bankLabels(receivable).includes(bankFilter);
      const documentMatches = documentFilter === 'todos' || documentLabel(receivable) === documentFilter;
      const searchMatches = !search || normalizeText(`${receivableSearchText(receivable)} ${receivable.address} ${documentLabel(receivable)} ${bankLabels(receivable).join(' ')}`).includes(search);
      const amount = toNumber(receivable.openBalance);
      const minMatches = !minAmount || amount >= minValue;
      const maxMatches = !maxAmount || amount <= maxValue;

      return startMatches
        && endMatches
        && statusMatches
        && customerMatches
        && bankMatches
        && documentMatches
        && searchMatches
        && minMatches
        && maxMatches;
    });
  }, [
    bankFilter,
    customerFilter,
    documentFilter,
    freeSearch,
    maxAmount,
    minAmount,
    periodEnd,
    periodStart,
    receivables,
    searchType,
    statusFilter,
  ]);

  const dashboard = useMemo(() => {
    const pending = filteredReceivables.filter((receivable) => toNumber(receivable.openBalance) > 0 && receivable.status !== 'Cancelado');
    const future = pending.filter((receivable) => receivable.paymentForecastDate > today);
    const dueToday = pending.filter((receivable) => receivable.paymentForecastDate === today);
    const overdue = pending.filter((receivable) => receivable.paymentForecastDate && receivable.paymentForecastDate < today);
    const nextSevenDays = pending.filter((receivable) => receivable.paymentForecastDate >= today && receivable.paymentForecastDate <= datePlusDays(today, 7));
    const received = filteredReceivables.filter((receivable) => toNumber(receivable.paidValue) > 0);
    const pastSettled = filteredReceivables.filter((receivable) => receivable.status === 'Recebido' && receiptDate(receivable) && receiptDate(receivable) < today);
    const events = paymentEvents(filteredReceivables);
    const pastEvents = events.filter((event) => event.date && event.date < today);

    return {
      all: filteredReceivables,
      pending,
      future,
      dueToday,
      overdue,
      nextSevenDays,
      received,
      pastSettled,
      events,
      pastEvents,
      futureLine: groupByDate(future, 'paymentForecastDate', 'openBalance'),
      receivedLine: groupByDate(events, 'date', 'amount'),
      statusPie: groupByValue(filteredReceivables, 'status', 'originalValue'),
      bankPie: groupByValue(events, 'bank', 'amount'),
    };
  }, [filteredReceivables, today]);

  const reportMap = {
    all: { title: 'Todos os titulos filtrados', receivables: dashboard.all },
    open: { title: 'Titulos em aberto', receivables: dashboard.pending },
    future: { title: 'Contas a receber no futuro', receivables: dashboard.future },
    received: { title: 'Titulos com recebimento', receivables: dashboard.received },
    pastSettled: { title: 'Titulos baixados no passado', receivables: dashboard.pastSettled },
    dueToday: { title: 'Titulos vencendo hoje', receivables: dashboard.dueToday },
    overdue: { title: 'Titulos vencidos', receivables: dashboard.overdue },
    nextSevenDays: { title: 'Proximos 7 dias', receivables: dashboard.nextSevenDays },
  };
  const selectedReport = reportMap[reportKey] || reportMap.open;
  const sortedSelectedReceivables = useMemo(
    () => sortTableRows(
      selectedReport.receivables,
      receivableDashboardSortColumns,
      dashboardSort,
      (left, right) => identifierNumberValue(right.id) - identifierNumberValue(left.id),
    ),
    [dashboardSort, selectedReport.receivables],
  );
  const averageTicket = filteredReceivables.length ? total(filteredReceivables, 'originalValue') / filteredReceivables.length : 0;
  const lookupConfigs = {
    customer: {
      title: 'Pesquisar cliente / tomador',
      column: 'Cliente / tomador',
      placeholder: 'Pesquisar cliente / tomador',
      options: [{ value: 'todos', label: 'Todos' }, ...filterOptions.customerOptions.map((option) => ({ value: option, label: option }))],
    },
    bank: {
      title: 'Pesquisar banco da baixa',
      column: 'Banco da baixa',
      placeholder: 'Pesquisar banco',
      options: [{ value: 'todos', label: 'Todos' }, ...filterOptions.banks.map((option) => ({ value: option, label: option }))],
    },
    document: {
      title: 'Pesquisar documento vinculado',
      column: 'Documento vinculado',
      placeholder: 'Pesquisar documento',
      options: [{ value: 'todos', label: 'Todos' }, ...filterOptions.documentOptions.map((option) => ({ value: option, label: option }))],
    },
  };
  const activeLookupConfig = activeLookup ? lookupConfigs[activeLookup] : null;
  const visibleLookupOptions = activeLookupConfig
    ? activeLookupConfig.options.filter((option) => normalizeText(option.label).includes(normalizeText(lookupSearch)))
    : [];

  function selectedFilterLabel(options, value) {
    return options.find((option) => option.value === value)?.label || 'Todos';
  }

  function clearFilters() {
    setSearchType('paymentForecastDate');
    setPeriodStart('');
    setPeriodEnd('');
    setStatusFilter('todos');
    setCustomerFilter('todos');
    setBankFilter('todos');
    setDocumentFilter('todos');
    setFreeSearch('');
    setMinAmount('');
    setMaxAmount('');
  }

  function openLookup(type) {
    setActiveLookup(type);
    setLookupSearch('');
  }

  function closeLookup() {
    setActiveLookup(null);
    setLookupSearch('');
  }

  function selectLookupOption(value) {
    if (activeLookup === 'customer') {
      setCustomerFilter(value);
    }

    if (activeLookup === 'bank') {
      setBankFilter(value);
    }

    if (activeLookup === 'document') {
      setDocumentFilter(value);
    }

    closeLookup();
  }

  return (
    <section className="accounts-receivable-dashboard-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard de Contas a Receber</h1>
          <p className="page-kicker">Indicadores de titulos futuros, baixados, recebidos e saldos em aberto</p>
        </div>
      </header>

      <section className={`bi-filter-panel ${filtersOpen ? 'bi-filter-panel--open' : ''}`}>
        <button
          type="button"
          className="bi-filter-header receivable-dashboard-filter-title"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <span>Filtros</span>
          <strong>{filteredReceivables.length} titulo(s) considerados</strong>
        </button>

        {filtersOpen && (
          <div className="bi-filter-body">
            <div className="form-grid">
              <label className="field">
                <span>Data considerada</span>
                <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
                  {searchTypes.map((type) => (
                    <option value={type.value} key={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Periodo inicial</span>
                <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </label>

              <label className="field">
                <span>Periodo final</span>
                <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </label>

              <label className="field">
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="todos">Todos</option>
                  {filterOptions.statusOptions.map((status) => (
                    <option value={status} key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <LookupFilterField
                label="Cliente / tomador"
                value={selectedFilterLabel(lookupConfigs.customer.options, customerFilter)}
                onOpen={() => openLookup('customer')}
              />

              <LookupFilterField
                label="Banco da baixa"
                value={selectedFilterLabel(lookupConfigs.bank.options, bankFilter)}
                onOpen={() => openLookup('bank')}
              />

              <label className="field">
                <span>Saldo minimo</span>
                <input type="number" min="0" step="0.01" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="0,00" />
              </label>

              <label className="field">
                <span>Saldo maximo</span>
                <input type="number" min="0" step="0.01" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="0,00" />
              </label>

              <LookupFilterField
                className="field field--span-2"
                label="Documento vinculado"
                value={selectedFilterLabel(lookupConfigs.document.options, documentFilter)}
                onOpen={() => openLookup('document')}
              />

              <label className="field field--span-2">
                <span>Busca livre</span>
                <input type="search" value={freeSearch} onChange={(event) => setFreeSearch(event.target.value)} placeholder="Titulo, cliente, documento ou status" />
              </label>

              <div className="field registered-launches-actions">
                <span>&nbsp;</span>
                <button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="bi-metrics-grid receivable-dashboard-metrics">
        <MetricCard label="Tenho a receber" value={currency(total(dashboard.pending, 'openBalance'))} detail={`${dashboard.pending.length} titulo(s) em aberto`} active={reportKey === 'open'} onClick={() => setReportKey('open')} />
        <MetricCard label="Ja recebi" value={currency(total(dashboard.received, 'paidValue'))} detail={`${dashboard.received.length} titulo(s) com baixa`} active={reportKey === 'received'} onClick={() => setReportKey('received')} />
        <MetricCard label="A receber no futuro" value={currency(total(dashboard.future, 'openBalance'))} detail={`${dashboard.future.length} titulo(s) futuros`} active={reportKey === 'future'} onClick={() => setReportKey('future')} />
        <MetricCard label="Baixados no passado" value={currency(total(dashboard.pastSettled, 'paidValue'))} detail={`${dashboard.pastSettled.length} titulo(s) quitados`} active={reportKey === 'pastSettled'} onClick={() => setReportKey('pastSettled')} />
        <MetricCard label="Vencidos" value={currency(total(dashboard.overdue, 'openBalance'))} detail={`${dashboard.overdue.length} titulo(s) atrasados`} active={reportKey === 'overdue'} onClick={() => setReportKey('overdue')} />
        <MetricCard label="Ticket medio" value={currency(averageTicket)} detail={`${filteredReceivables.length} titulo(s) filtrados`} active={reportKey === 'all'} onClick={() => setReportKey('all')} />
      </div>

      <div className="bi-chart-grid">
        <ChartButton title="Recebiveis futuros por previsao" subtitle={currency(total(dashboard.future, 'openBalance'))} onClick={() => setReportKey('future')}>
          <LineChart data={dashboard.futureLine} />
        </ChartButton>

        <ChartButton title="Recebimentos realizados" subtitle={currency(dashboard.events.reduce((sum, event) => sum + event.amount, 0))} onClick={() => setReportKey('received')}>
          <LineChart data={dashboard.receivedLine} />
        </ChartButton>

        <ChartButton title="Carteira por status" subtitle={`${dashboard.all.length} titulo(s)`} onClick={() => setReportKey('all')}>
          <PieChart data={dashboard.statusPie} />
        </ChartButton>

        <ChartButton title="Recebimentos por banco" subtitle={currency(dashboard.events.reduce((sum, event) => sum + event.amount, 0))} onClick={() => setReportKey('received')}>
          <PieChart data={dashboard.bankPie} />
        </ChartButton>
      </div>

      <section className="bi-report-panel" aria-labelledby="receivable-dashboard-report-title">
        <div className="registered-launches-header">
          <h2 id="receivable-dashboard-report-title">{selectedReport.title}</h2>
          <div>
            <span>{selectedReport.receivables.length} titulo(s)</span>
            <strong>{currency(total(selectedReport.receivables, 'openBalance'))}</strong>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table receivable-dashboard-table">
            <thead>
              <tr>
                <SortableTableHeader
                  columns={receivableDashboardSortColumns}
                  sort={dashboardSort}
                  onSortChange={setDashboardSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedSelectedReceivables.map((receivable) => (
                <tr key={receivable.id}>
                  <td><strong>{receivable.id}</strong></td>
                  <td>{receivable.customerName || '-'}</td>
                  <td>{documentLabel(receivable)}</td>
                  <td>{receivable.issueDate || '-'}</td>
                  <td>{receivable.paymentForecastDate || '-'}</td>
                  <td>{receiptDate(receivable) || '-'}</td>
                  <td>{currency(receivable.originalValue)}</td>
                  <td>{currency(receivable.paidValue)}</td>
                  <td>{currency(receivable.openBalance)}</td>
                  <td>{bankLabels(receivable).join(' / ')}</td>
                  <td><span className="launch-status-pill">{receivable.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {!selectedReport.receivables.length && <div className="empty-list">Nenhum titulo encontrado para os filtros aplicados</div>}
        </div>
      </section>

      {activeLookupConfig && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="receivable-dashboard-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="receivable-dashboard-lookup-title">{activeLookupConfig.title}</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder={activeLookupConfig.placeholder}
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>{activeLookupConfig.column}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLookupOptions.map((option) => (
                    <tr key={option.value} onClick={() => selectLookupOption(option.value)}>
                      <td>{option.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!visibleLookupOptions.length && <div className="lookup-empty">Nenhuma opcao encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
