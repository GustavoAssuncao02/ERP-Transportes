import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import TriStateCheckbox from '../components/TriStateCheckbox.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { currency, normalizeText, paymentBanks, todayValue, toNumber } from '../data/financeData.js';
import { readReceivables } from '../data/accountsReceivableRegistry.js';
import { maxQuickQueryNameLength, saveQuickQuery } from '../data/quickQueries.js';
import { createReportPdfContent } from '../utils/report.js';
import { sortTableRows } from '../utils/tableSort.js';

const searchTypes = [
  { value: 'createdDate', label: 'Data de Cadastro' },
  { value: 'paymentForecastDate', label: 'Data de Vencimento' },
  { value: 'issueDate', label: 'Data de Emissao' },
  { value: 'lastReceiptDate', label: 'Data de Recebimento' },
];

const valueTypes = [
  { value: 'originalValue', label: 'Valor original' },
  { value: 'openBalance', label: 'Saldo em aberto' },
  { value: 'paidValue', label: 'Valor recebido' },
];

const defaultReceiptMethods = ['Sem forma', 'Boleto', 'Pix', 'Transferencia', 'Cartao', 'Dinheiro', 'Deposito'];
const defaultStatusOptions = ['Aberto', 'Vencido', 'Parcial', 'Recebido', 'Rascunho'];
const bankOptions = ['Sem banco', ...paymentBanks];

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function lastSettlement(receivable) {
  const settlements = Array.isArray(receivable.settlements) ? receivable.settlements : [];
  return settlements[settlements.length - 1] || null;
}

function receivableStatus(receivable) {
  const originalValue = toNumber(receivable.originalValue);
  const paidValue = toNumber(receivable.paidValue);
  const openBalance = Math.max(0, toNumber(receivable.openBalance));

  if (originalValue <= 0) return 'Rascunho';
  if (openBalance <= 0 || paidValue >= originalValue) return 'Recebido';
  if (paidValue > 0) return 'Parcial';
  if (receivable.paymentForecastDate && receivable.paymentForecastDate < todayValue()) return 'Vencido';
  return receivable.status || 'Aberto';
}

function createdDate(receivable) {
  return receivable.createdDate || receivable.issueDate || '';
}

function receiptBankLabel(receivable) {
  return receivable.lastReceiptBank || lastSettlement(receivable)?.bank || 'Sem banco';
}

function receiptMethodLabel(receivable) {
  return receivable.lastReceiptMethod || lastSettlement(receivable)?.method || 'Sem forma';
}

function documentLabel(receivable) {
  return [
    receivable.cteId,
    receivable.nfeNumber,
    receivable.mdfeId,
    receivable.collectionOrderId,
  ].filter(Boolean).join(' / ') || 'Sem documento';
}

function getDateValue(receivable, searchType) {
  if (searchType === 'createdDate') return createdDate(receivable);
  if (searchType === 'lastReceiptDate') return receivable.lastReceiptDate || lastSettlement(receivable)?.date || '';
  return receivable[searchType] || '';
}

function getCustomerOptions(receivables) {
  return uniqueSorted(receivables.map((receivable) => receivable.customerName || 'Sem cliente'));
}

function getDocumentOptions(receivables) {
  return uniqueSorted(receivables.map(documentLabel));
}

function getStatusOptions(receivables) {
  return uniqueSorted([...defaultStatusOptions, ...receivables.map(receivableStatus)]);
}

function getReceiptMethodOptions(receivables) {
  return uniqueSorted([...defaultReceiptMethods, ...receivables.map(receiptMethodLabel)]);
}

const reportResultsSortColumns = [
  { key: 'id', label: 'Titulo', type: 'text', getValue: (receivable) => receivable.id },
  { key: 'customerName', label: 'Cliente', type: 'text', getValue: (receivable) => receivable.customerName },
  { key: 'customerDocument', label: 'CPF/CNPJ', type: 'text', getValue: (receivable) => receivable.customerDocument },
  { key: 'issueDate', label: 'Emissao', type: 'date', getValue: (receivable) => receivable.issueDate },
  { key: 'paymentForecastDate', label: 'Vencimento', type: 'date', getValue: (receivable) => receivable.paymentForecastDate },
  { key: 'createdDate', label: 'Cadastro', type: 'date', getValue: (receivable) => createdDate(receivable) },
  { key: 'document', label: 'Documento', type: 'text', getValue: (receivable) => documentLabel(receivable) },
  { key: 'status', label: 'Situacao', type: 'text', getValue: (receivable) => receivableStatus(receivable) },
  { key: 'bank', label: 'Banco', type: 'text', getValue: (receivable) => receiptBankLabel(receivable) },
  { key: 'originalValue', label: 'Original', type: 'number', getValue: (receivable) => toNumber(receivable.originalValue) },
  { key: 'paidValue', label: 'Recebido', type: 'number', getValue: (receivable) => toNumber(receivable.paidValue) },
  { key: 'openBalance', label: 'Saldo', type: 'number', getValue: (receivable) => toNumber(receivable.openBalance) },
];

function compareReportReceivableFallback(left, right) {
  return String(right.paymentForecastDate || '').localeCompare(String(left.paymentForecastDate || ''), 'pt-BR')
    || String(right.id || '').localeCompare(String(left.id || ''), 'pt-BR');
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function pdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[\\()]/g, '\\$&');
}

function fitPdfText(value, length) {
  const text = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');

  if (text.length <= length) return text.padEnd(length, ' ');
  return `${text.slice(0, Math.max(0, length - 1))}~`;
}

function createPdfContent(lines) {
  const pageWidth = 842;
  const pageHeight = 595;
  const linesPerPage = 41;
  const objects = [];
  const pageRefs = [];
  let objectNumber = 3;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  for (let index = 0; index < lines.length; index += linesPerPage) {
    const pageLines = lines.slice(index, index + linesPerPage);
    const stream = [
      'BT',
      '/F1 10 Tf',
      '18 562 Td',
      ...pageLines.map((line, lineIndex) => `${lineIndex ? '0 -13 Td ' : ''}(${pdfText(line)}) Tj`),
      'ET',
    ].join('\n');
    const contentObject = objectNumber;
    const pageObject = objectNumber + 1;

    objectNumber += 2;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> /Contents ${contentObject} 0 R >>`;
    pageRefs.push(`${pageObject} 0 R`);
  }

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function MultiCheckFilter({ title, options, selected, onChange, searchable = false, searchPlaceholder = 'Pesquisar' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const allSelected = selected.length === options.length;
  const visibleOptions = searchable
    ? options.filter((option) => normalizeText(option).includes(normalizeText(query)))
    : options;

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
    <section className={`report-filter-box ${isOpen ? 'report-filter-box--open' : 'report-filter-box--closed'}`}>
      <div className="report-filter-header">
        <button
          type="button"
          className="report-filter-title-button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {title}
        </button>
        <button
          type="button"
          className="report-filter-header-hitarea"
          aria-label={`${isOpen ? 'Fechar' : 'Abrir'} ${title}`}
          onClick={() => setIsOpen((current) => !current)}
        />
        <label onClick={(event) => event.stopPropagation()}>
          <TriStateCheckbox checked={allSelected} onChange={toggleAll} />
          Todos
        </label>
      </div>

      {isOpen && searchable && (
        <div className="report-filter-search">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      {isOpen && (
        <div className={searchable ? 'report-check-list report-check-list--scroll' : 'report-check-list'}>
          {visibleOptions.map((option) => (
            <label className="report-check-row" key={option}>
              <TriStateCheckbox
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
            </label>
          ))}
          {searchable && visibleOptions.length === 0 && (
            <div className="report-filter-empty">Nenhuma opcao encontrada</div>
          )}
        </div>
      )}
    </section>
  );
}

export default function AccountsReceivableReportPage({ initialSavedQuery = null, onSavedQueriesChange }) {
  const [receivables] = useState(readReceivables);
  const customerOptions = useMemo(() => getCustomerOptions(receivables), [receivables]);
  const documentOptions = useMemo(() => getDocumentOptions(receivables), [receivables]);
  const statusOptions = useMemo(() => getStatusOptions(receivables), [receivables]);
  const receiptMethodOptions = useMemo(() => getReceiptMethodOptions(receivables), [receivables]);

  const [searchType, setSearchType] = useState('createdDate');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [valueType, setValueType] = useState('originalValue');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(() => getStatusOptions(readReceivables()));
  const [selectedCustomers, setSelectedCustomers] = useState(() => getCustomerOptions(readReceivables()));
  const [selectedDocuments, setSelectedDocuments] = useState(() => getDocumentOptions(readReceivables()));
  const [selectedBanks, setSelectedBanks] = useState(bankOptions);
  const [selectedReceiptMethods, setSelectedReceiptMethods] = useState(() => getReceiptMethodOptions(readReceivables()));
  const [message, setMessage] = useAutoClearMessage();
  const [quickQueryName, setQuickQueryName] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [reportResultsSort, setReportResultsSort] = useState({ key: 'paymentForecastDate', direction: 'desc' });

  function normalizeSelection(value, options) {
    if (!Array.isArray(value)) return options;

    const allowedOptions = new Set(options);
    return value.filter((item) => allowedOptions.has(item));
  }

  function currentFilters() {
    return {
      searchType,
      periodStart,
      periodEnd,
      valueType,
      minValue,
      maxValue,
      selectedStatuses,
      selectedCustomers,
      selectedDocuments,
      selectedBanks,
      selectedReceiptMethods,
      reportResultsSort,
    };
  }

  function applySavedFilters(filters) {
    if (!filters || typeof filters !== 'object') return;

    setSearchType(searchTypes.some((type) => type.value === filters.searchType) ? filters.searchType : 'createdDate');
    setPeriodStart(filters.periodStart || '');
    setPeriodEnd(filters.periodEnd || '');
    setValueType(valueTypes.some((type) => type.value === filters.valueType) ? filters.valueType : 'originalValue');
    setMinValue(filters.minValue || '');
    setMaxValue(filters.maxValue || '');
    setSelectedStatuses(normalizeSelection(filters.selectedStatuses, statusOptions));
    setSelectedCustomers(normalizeSelection(filters.selectedCustomers, customerOptions));
    setSelectedDocuments(normalizeSelection(filters.selectedDocuments, documentOptions));
    setSelectedBanks(normalizeSelection(filters.selectedBanks, bankOptions));
    setSelectedReceiptMethods(normalizeSelection(filters.selectedReceiptMethods, receiptMethodOptions));
    setReportResultsSort(filters.reportResultsSort || { key: 'paymentForecastDate', direction: 'desc' });
    setFiltersApplied(true);
    setGenerateMenuOpen(false);
  }

  useEffect(() => {
    if (!initialSavedQuery?.filters) return;

    applySavedFilters(initialSavedQuery.filters);
    setQuickQueryName(initialSavedQuery.name || '');
    setMessage(`Consulta rapida "${initialSavedQuery.name}" carregada`);
  }, [initialSavedQuery?.id, initialSavedQuery?.updatedAt, initialSavedQuery?.appliedAt]);

  const summary = useMemo(() => ({
    statuses: selectedStatuses.length,
    customers: selectedCustomers.length,
    documents: selectedDocuments.length,
    banks: selectedBanks.length,
    methods: selectedReceiptMethods.length,
  }), [selectedBanks, selectedCustomers, selectedDocuments, selectedReceiptMethods, selectedStatuses]);

  const filteredReceivables = useMemo(() => {
    return receivables.filter((receivable) => {
      const dateValue = getDateValue(receivable, searchType);
      const value = toNumber(receivable[valueType]);
      const minimumValue = String(minValue).trim() ? toNumber(minValue) : null;
      const maximumValue = String(maxValue).trim() ? toNumber(maxValue) : null;
      const startMatches = !periodStart || (dateValue && dateValue >= periodStart);
      const endMatches = !periodEnd || (dateValue && dateValue <= periodEnd);
      const minMatches = minimumValue === null || value >= minimumValue;
      const maxMatches = maximumValue === null || value <= maximumValue;
      const statusMatches = selectedStatuses.includes(receivableStatus(receivable));
      const customerMatches = selectedCustomers.includes(receivable.customerName || 'Sem cliente');
      const documentMatches = selectedDocuments.includes(documentLabel(receivable));
      const bankMatches = selectedBanks.includes(receiptBankLabel(receivable));
      const methodMatches = selectedReceiptMethods.includes(receiptMethodLabel(receivable));

      return startMatches
        && endMatches
        && minMatches
        && maxMatches
        && statusMatches
        && customerMatches
        && documentMatches
        && bankMatches
        && methodMatches;
    });
  }, [
    maxValue,
    minValue,
    periodEnd,
    periodStart,
    receivables,
    searchType,
    selectedBanks,
    selectedCustomers,
    selectedDocuments,
    selectedReceiptMethods,
    selectedStatuses,
    valueType,
  ]);

  const sortedFilteredReceivables = useMemo(
    () => sortTableRows(
      filteredReceivables,
      reportResultsSortColumns,
      reportResultsSort,
      compareReportReceivableFallback,
    ),
    [filteredReceivables, reportResultsSort],
  );

  function markFiltersDirty() {
    setFiltersApplied(false);
    setGenerateMenuOpen(false);
    setMessage('');
  }

  function updateSelection(setter, value) {
    setter(value);
    markFiltersDirty();
  }

  function reportFilename(extension) {
    return `relatorio-contas-a-receber-${todayValue()}.${extension}`;
  }

  function selectedSearchTypeLabel() {
    const selectedType = searchTypes.find((type) => type.value === searchType);
    return selectedType ? selectedType.label : searchType;
  }

  function selectedValueTypeLabel() {
    const selectedType = valueTypes.find((type) => type.value === valueType);
    return selectedType ? selectedType.label : valueType;
  }

  function reportMetadata() {
    return [
      ['Periodo inicial', periodStart || 'Todos'],
      ['Periodo final', periodEnd || 'Todos'],
      ['Tipo pesquisa', selectedSearchTypeLabel()],
      ['Filtro de valor', selectedValueTypeLabel()],
      ['Valor minimo', minValue || 'Todos'],
      ['Valor maximo', maxValue || 'Todos'],
      ['Status selecionados', `${selectedStatuses.length} de ${statusOptions.length}`],
      ['Clientes selecionados', `${selectedCustomers.length} de ${customerOptions.length}`],
      ['Documentos selecionados', `${selectedDocuments.length} de ${documentOptions.length}`],
    ];
  }

  function totalsForReport() {
    return filteredReceivables.reduce((acc, receivable) => ({
      original: acc.original + toNumber(receivable.originalValue),
      paid: acc.paid + toNumber(receivable.paidValue),
      open: acc.open + toNumber(receivable.openBalance),
    }), { original: 0, paid: 0, open: 0 });
  }

  function generateExcel() {
    const totals = totalsForReport();
    const metadataRows = reportMetadata().map(([label, value]) => `
      <tr><th>${htmlEscape(label)}</th><td>${htmlEscape(value)}</td></tr>
    `).join('');
    const dataRows = sortedFilteredReceivables.map((receivable) => `
      <tr>
        <td>${htmlEscape(receivable.id)}</td>
        <td>${htmlEscape(receivable.customerName)}</td>
        <td>${htmlEscape(receivable.customerDocument)}</td>
        <td>${htmlEscape(receivable.issueDate || '')}</td>
        <td>${htmlEscape(receivable.paymentForecastDate || '')}</td>
        <td>${htmlEscape(createdDate(receivable))}</td>
        <td>${htmlEscape(documentLabel(receivable))}</td>
        <td>${htmlEscape(receivableStatus(receivable))}</td>
        <td>${htmlEscape(receiptBankLabel(receivable))}</td>
        <td>${htmlEscape(receiptMethodLabel(receivable))}</td>
        <td>${toNumber(receivable.originalValue).toFixed(2)}</td>
        <td>${toNumber(receivable.paidValue).toFixed(2)}</td>
        <td>${toNumber(receivable.openBalance).toFixed(2)}</td>
      </tr>
    `).join('');
    const content = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Relatorio de Contas a Receber</h1>
          <table border="1">${metadataRows}</table>
          <br>
          <table border="1">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Cliente</th>
                <th>CPF/CNPJ</th>
                <th>Emissao</th>
                <th>Vencimento</th>
                <th>Cadastro</th>
                <th>Documento</th>
                <th>Situacao</th>
                <th>Banco</th>
                <th>Forma</th>
                <th>Original</th>
                <th>Recebido</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>${dataRows}</tbody>
            <tfoot>
              <tr>
                <th colspan="10">Total</th>
                <th>${totals.original.toFixed(2)}</th>
                <th>${totals.paid.toFixed(2)}</th>
                <th>${totals.open.toFixed(2)}</th>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    downloadBlob(content, reportFilename('xls'), 'application/vnd.ms-excel;charset=utf-8');
    setGenerateMenuOpen(false);
    setMessage('Relatorio em Excel gerado');
  }

  function reportPdfLines() {
    const totals = totalsForReport();
    const lines = [
      'Relatorio de Contas a Receber',
      `Gerado em ${todayValue()}`,
      '',
    ];

    reportMetadata().forEach(([label, value]) => {
      lines.push(`${label}: ${value}`);
    });

    lines.push('');
    lines.push('Titulo           Cliente          Documento     Vencimento Sit      Banco       Original     Recebido    Saldo');
    lines.push('----------------------------------------------------------------------------------------------------------------');

    if (!sortedFilteredReceivables.length) {
      lines.push('Nenhum titulo encontrado para os filtros aplicados.');
    }

    sortedFilteredReceivables.forEach((receivable) => {
      lines.push([
        fitPdfText(receivable.id, 16),
        fitPdfText(receivable.customerName, 16),
        fitPdfText(documentLabel(receivable), 12),
        fitPdfText(receivable.paymentForecastDate || '', 10),
        fitPdfText(receivableStatus(receivable), 8),
        fitPdfText(receiptBankLabel(receivable), 11),
        fitPdfText(currency(receivable.originalValue), 12),
        fitPdfText(currency(receivable.paidValue), 11),
        fitPdfText(currency(receivable.openBalance), 11),
      ].join(' '));
    });

    lines.push('----------------------------------------------------------------------------------------------------------------');
    lines.push(`Total original: ${currency(totals.original)} | Recebido: ${currency(totals.paid)} | Saldo: ${currency(totals.open)}`);
    return lines;
  }

  function generatePdf() {
    const totals = totalsForReport();
    const pdfColumns = [
      { key: 'id', label: 'Titulo', pdfWidth: 16, getValue: (receivable) => receivable.id },
      { key: 'customerName', label: 'Cliente', pdfWidth: 18, getValue: (receivable) => receivable.customerName },
      { key: 'document', label: 'Documento', pdfWidth: 16, getValue: (receivable) => documentLabel(receivable) },
      { key: 'paymentForecastDate', label: 'Vencimento', pdfWidth: 11, getValue: (receivable) => receivable.paymentForecastDate || '' },
      { key: 'status', label: 'Sit', pdfWidth: 9, getValue: (receivable) => receivableStatus(receivable) },
      { key: 'bank', label: 'Banco', pdfWidth: 12, getValue: (receivable) => receiptBankLabel(receivable) },
      { key: 'originalValue', label: 'Original', pdfWidth: 12, type: 'number', getValue: (receivable) => currency(receivable.originalValue) },
      { key: 'paidValue', label: 'Recebido', pdfWidth: 12, type: 'number', getValue: (receivable) => currency(receivable.paidValue) },
      { key: 'openBalance', label: 'Saldo', pdfWidth: 12, type: 'number', getValue: (receivable) => currency(receivable.openBalance) },
    ];

    downloadBlob(createReportPdfContent({
      title: 'Relatorio de Contas a Receber',
      generatedAt: todayValue(),
      metadata: reportMetadata(),
      columns: pdfColumns,
      rows: sortedFilteredReceivables,
      summary: `Total original: ${currency(totals.original)} | Recebido: ${currency(totals.paid)} | Saldo: ${currency(totals.open)}`,
      emptyMessage: 'Nenhum titulo encontrado para os filtros aplicados.',
    }), reportFilename('pdf'), 'application/pdf');
    setGenerateMenuOpen(false);
    setMessage('Relatorio em PDF gerado');
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFiltersApplied(true);
    setGenerateMenuOpen(false);
    setMessage('Filtros aplicados para o relatorio de contas a receber');
  }

  function handleSaveQuickQuery() {
    const result = saveQuickQuery({
      name: quickQueryName,
      reportType: 'accounts-receivable',
      pageId: 'accounts-receivable-report',
      filters: currentFilters(),
    });

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setQuickQueryName(result.quickQuery.name);
    onSavedQueriesChange?.(result.queries);
    setMessage(`Consulta rapida "${result.quickQuery.name}" salva`);
  }

  function handleSelectAll() {
    setSelectedStatuses(statusOptions);
    setSelectedCustomers(customerOptions);
    setSelectedDocuments(documentOptions);
    setSelectedBanks(bankOptions);
    setSelectedReceiptMethods(receiptMethodOptions);
    setFiltersApplied(false);
    setGenerateMenuOpen(false);
    setMessage('');
  }

  const tableTotals = totalsForReport();

  return (
    <section className="accounts-receivable-report-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Relatorio de Contas a Receber</h1>
          <p className="page-kicker">Filtros para consulta de titulos a receber</p>
        </div>
      </header>

      <form className="finance-form report-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Periodo inicial</span>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => {
                setPeriodStart(event.target.value);
                markFiltersDirty();
              }}
            />
          </label>

          <label className="field">
            <span>Periodo final</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => {
                setPeriodEnd(event.target.value);
                markFiltersDirty();
              }}
            />
          </label>

          <label className="field">
            <span>Tipo de data</span>
            <select
              value={searchType}
              onChange={(event) => {
                setSearchType(event.target.value);
                markFiltersDirty();
              }}
            >
              {searchTypes.map((type) => (
                <option value={type.value} key={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo de valor</span>
            <select
              value={valueType}
              onChange={(event) => {
                setValueType(event.target.value);
                markFiltersDirty();
              }}
            >
              {valueTypes.map((type) => (
                <option value={type.value} key={type.value}>{type.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Valor minimo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minValue}
              onChange={(event) => {
                setMinValue(event.target.value);
                markFiltersDirty();
              }}
            />
          </label>

          <label className="field">
            <span>Valor maximo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxValue}
              onChange={(event) => {
                setMaxValue(event.target.value);
                markFiltersDirty();
              }}
            />
          </label>
        </div>

        <div className="report-grid">
          <MultiCheckFilter title="Status do Titulo" options={statusOptions} selected={selectedStatuses} onChange={(next) => updateSelection(setSelectedStatuses, next)} />
          <MultiCheckFilter title="Selecionar Cliente / Tomador" options={customerOptions} selected={selectedCustomers} onChange={(next) => updateSelection(setSelectedCustomers, next)} searchable searchPlaceholder="Pesquisar cliente" />
          <MultiCheckFilter title="Selecionar Documento" options={documentOptions} selected={selectedDocuments} onChange={(next) => updateSelection(setSelectedDocuments, next)} searchable searchPlaceholder="Pesquisar documento" />
          <MultiCheckFilter title="Banco do Recebimento" options={bankOptions} selected={selectedBanks} onChange={(next) => updateSelection(setSelectedBanks, next)} searchable searchPlaceholder="Pesquisar banco" />
          <MultiCheckFilter title="Forma de Recebimento" options={receiptMethodOptions} selected={selectedReceiptMethods} onChange={(next) => updateSelection(setSelectedReceiptMethods, next)} />
        </div>

        <div className="report-summary">
          <span>{summary.statuses} status</span>
          <span>{summary.customers} cliente(s)</span>
          <span>{summary.documents} documento(s)</span>
          <span>{summary.banks} banco(s)</span>
          <span>{summary.methods} forma(s)</span>
        </div>

        <div className="report-save-query">
          <label className="field">
            <span>Nome da consulta rapida</span>
            <input
              type="text"
              maxLength={maxQuickQueryNameLength}
              placeholder="Ate 25 caracteres"
              value={quickQueryName}
              onChange={(event) => setQuickQueryName(event.target.value.slice(0, maxQuickQueryNameLength))}
            />
          </label>
          <button type="button" className="secondary-button" onClick={handleSaveQuickQuery}>
            <Save size={15} strokeWidth={2.2} />
            Salvar consulta
          </button>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Aplicar filtros</button>
          <button type="button" className="secondary-button" onClick={handleSelectAll}>Selecionar todos</button>
          {filtersApplied && (
            <div className="report-generate-actions">
              <div className="report-split-button">
                <button type="button" className="primary-button report-generate-main" onClick={generatePdf}>
                  Gerar Relatorio
                </button>
                <button
                  type="button"
                  className="primary-button report-generate-toggle"
                  aria-label="Opcoes de geracao"
                  aria-expanded={generateMenuOpen}
                  onClick={() => setGenerateMenuOpen((current) => !current)}
                >
                  v
                </button>
                {generateMenuOpen && (
                  <div className="report-generate-menu">
                    <button type="button" onClick={generateExcel}>Gerar em Excel</button>
                  </div>
                )}
              </div>
            </div>
          )}
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      {filtersApplied && (
        <section className="registered-launches-panel report-results-panel" aria-labelledby="accounts-receivable-report-results-title">
          <div className="registered-launches-header">
            <h2 id="accounts-receivable-report-results-title">Dados consultados</h2>
            <div>
              <span>{sortedFilteredReceivables.length} titulo(s)</span>
              <strong>{currency(tableTotals.open)}</strong>
            </div>
          </div>

          <div className="registered-launches-table-wrap">
            <table className="registered-launches-table report-results-table">
              <thead>
                <tr>
                  <SortableTableHeader
                    columns={reportResultsSortColumns}
                    sort={reportResultsSort}
                    onSortChange={setReportResultsSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedFilteredReceivables.map((receivable) => (
                  <tr key={receivable.id}>
                    <td><strong>{receivable.id}</strong></td>
                    <td>{receivable.customerName}</td>
                    <td>{receivable.customerDocument}</td>
                    <td>{receivable.issueDate || '-'}</td>
                    <td>{receivable.paymentForecastDate || '-'}</td>
                    <td>{createdDate(receivable) || '-'}</td>
                    <td>{documentLabel(receivable)}</td>
                    <td>{receivableStatus(receivable)}</td>
                    <td>{receiptBankLabel(receivable)}</td>
                    <td>{currency(receivable.originalValue)}</td>
                    <td>{currency(receivable.paidValue)}</td>
                    <td>{currency(receivable.openBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="9">Total</th>
                  <th>{currency(tableTotals.original)}</th>
                  <th>{currency(tableTotals.paid)}</th>
                  <th>{currency(tableTotals.open)}</th>
                </tr>
              </tfoot>
            </table>

            {!sortedFilteredReceivables.length && (
              <div className="empty-list">Nenhum titulo encontrado para os filtros aplicados</div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
