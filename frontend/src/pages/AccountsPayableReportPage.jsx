import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  accountingTypeNames,
  businessUnits,
  chargeTypes,
  currency,
  documentNumbers,
  financeLaunches,
  normalizeText,
  paymentBanks,
  supplierNames,
  todayValue,
} from '../data/financeData.js';
import { maxQuickQueryNameLength, saveQuickQuery } from '../data/quickQueries.js';
import { sortTableRows } from '../utils/tableSort.js';

const searchTypes = [
  { value: 'issueDate', label: 'Data Emissao' },
  { value: 'dueDate', label: 'Data de Vencimento' },
  { value: 'createdDate', label: 'Data de Cadastro' },
  { value: 'paymentDate', label: 'Data de Pagamento' },
  { value: 'appropriationDate', label: 'Data de Apropriacao' },
  { value: 'paymentForecastDate', label: 'Data de Previsao de Pagamento' },
];

const reportLaunches = financeLaunches.map((launch) => ({
  ...launch,
  paymentMethod: launch.chargeType,
}));

const bankOptions = ['Sem banco', ...paymentBanks];

const reportResultsSortColumns = [
  { key: 'id', label: 'Lançamento', type: 'text', getValue: (launch) => launch.id },
  { key: 'unit', label: 'Unidade', type: 'text', getValue: (launch) => launch.unit },
  { key: 'supplier', label: 'Fornecedor', type: 'text', getValue: (launch) => launch.supplier },
  { key: 'document', label: 'Documento', type: 'text', getValue: (launch) => launch.document },
  { key: 'dueDate', label: 'Vencimento', type: 'date', getValue: (launch) => launch.dueDate },
  { key: 'status', label: 'Situação', type: 'text', getValue: (launch) => launch.status },
  { key: 'paymentMethod', label: 'Cobrança', type: 'text', getValue: (launch) => launch.paymentMethod },
  { key: 'bank', label: 'Banco', type: 'text', getValue: (launch) => bankLabel(launch) },
  { key: 'amount', label: 'Valor', type: 'number', getValue: (launch) => launch.amount },
  { key: 'interest', label: 'Juros', type: 'number', getValue: (launch) => launch.interestAmount || 0 },
  { key: 'discount', label: 'Desconto', type: 'number', getValue: (launch) => launch.discountAmount || 0 },
  { key: 'final', label: 'Valor final', type: 'number', getValue: (launch) => launch.finalAmount || 0 },
];

function bankLabel(launch) {
  return launch.paymentBank || 'Sem banco';
}

function compareReportLaunchFallback(left, right) {
  return String(left.dueDate || '').localeCompare(String(right.dueDate || ''), 'pt-BR')
    || String(left.id || '').localeCompare(String(right.id || ''), 'pt-BR');
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
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
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
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
            </label>
          ))}
          {searchable && visibleOptions.length === 0 && (
            <div className="report-filter-empty">Nenhuma opção encontrada</div>
          )}
        </div>
      )}
    </section>
  );
}

export default function AccountsPayableReportPage({ initialSavedQuery = null, onSavedQueriesChange }) {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('issueDate');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [status, setStatus] = useState('Ambos');
  const [selectedChargeTypes, setSelectedChargeTypes] = useState(chargeTypes);
  const [selectedBanks, setSelectedBanks] = useState(bankOptions);
  const [selectedTypes, setSelectedTypes] = useState(accountingTypeNames);
  const [selectedSuppliers, setSelectedSuppliers] = useState(supplierNames);
  const [selectedDocuments, setSelectedDocuments] = useState(documentNumbers);
  const [message, setMessage] = useAutoClearMessage();
  const [quickQueryName, setQuickQueryName] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [reportResultsSort, setReportResultsSort] = useState({ key: 'dueDate', direction: 'desc' });

  function normalizeSelection(value, options) {
    if (!Array.isArray(value)) return options;

    const allowedOptions = new Set(options);
    return value.filter((item) => allowedOptions.has(item));
  }

  function currentFilters() {
    return {
      businessUnit,
      searchType,
      periodStart,
      periodEnd,
      status,
      selectedChargeTypes,
      selectedBanks,
      selectedTypes,
      selectedSuppliers,
      selectedDocuments,
      reportResultsSort,
    };
  }

  function applySavedFilters(filters) {
    if (!filters || typeof filters !== 'object') return;

    setBusinessUnit(filters.businessUnit || '');
    setSearchType(searchTypes.some((type) => type.value === filters.searchType) ? filters.searchType : 'issueDate');
    setPeriodStart(filters.periodStart || '');
    setPeriodEnd(filters.periodEnd || '');
    setStatus(['Aberto', 'Baixado', 'Ambos'].includes(filters.status) ? filters.status : 'Ambos');
    setSelectedChargeTypes(normalizeSelection(filters.selectedChargeTypes, chargeTypes));
    setSelectedBanks(normalizeSelection(filters.selectedBanks, bankOptions));
    setSelectedTypes(normalizeSelection(filters.selectedTypes, accountingTypeNames));
    setSelectedSuppliers(normalizeSelection(filters.selectedSuppliers, supplierNames));
    setSelectedDocuments(normalizeSelection(filters.selectedDocuments, documentNumbers));
    setReportResultsSort(filters.reportResultsSort || { key: 'dueDate', direction: 'desc' });
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
    chargeTypes: selectedChargeTypes.length,
    banks: selectedBanks.length,
    types: selectedTypes.length,
    suppliers: selectedSuppliers.length,
    documents: selectedDocuments.length,
  }), [selectedBanks, selectedChargeTypes, selectedTypes, selectedSuppliers, selectedDocuments]);

  const filteredLaunches = useMemo(() => reportLaunches.filter((launch) => {
    const dateValue = launch[searchType];
    const unitMatches = !businessUnit || launch.unit === businessUnit;
    const startMatches = !periodStart || (dateValue && dateValue >= periodStart);
    const endMatches = !periodEnd || (dateValue && dateValue <= periodEnd);
    const statusMatches = status === 'Ambos' || launch.status === status;
    const chargeMatches = selectedChargeTypes.includes(launch.paymentMethod);
    const bankMatches = selectedBanks.includes(bankLabel(launch));
    const typeMatches = selectedTypes.includes(launch.type);
    const supplierMatches = selectedSuppliers.includes(launch.supplier);
    const documentMatches = selectedDocuments.includes(launch.document);

    return unitMatches && startMatches && endMatches && statusMatches && chargeMatches && bankMatches && typeMatches && supplierMatches && documentMatches;
  }), [
    businessUnit,
    periodStart,
    periodEnd,
    searchType,
    status,
    selectedChargeTypes,
    selectedBanks,
    selectedTypes,
    selectedSuppliers,
    selectedDocuments,
  ]);

  const sortedFilteredLaunches = useMemo(
    () => sortTableRows(
      filteredLaunches,
      reportResultsSortColumns,
      reportResultsSort,
      compareReportLaunchFallback,
    ),
    [filteredLaunches, reportResultsSort],
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
    return `relatorio-contas-a-pagar-${todayValue()}.${extension}`;
  }

  function selectedSearchTypeLabel() {
    const selectedType = searchTypes.find((type) => type.value === searchType);
    return selectedType ? selectedType.label : searchType;
  }

  function reportMetadata() {
    return [
      ['Unidade', businessUnit || 'Todas'],
      ['Periodo inicial', periodStart || 'Todos'],
      ['Periodo final', periodEnd || 'Todos'],
      ['Situação', status],
      ['Tipo pesquisa', selectedSearchTypeLabel()],
      ['Bancos selecionados', `${selectedBanks.length} de ${bankOptions.length}`],
    ];
  }

  function generateExcel() {
    const totals = filteredLaunches.reduce((acc, launch) => ({
      amount: acc.amount + launch.amount,
      interest: acc.interest + (launch.interestAmount || 0),
      discount: acc.discount + (launch.discountAmount || 0),
      final: acc.final + (launch.finalAmount || 0),
    }), { amount: 0, interest: 0, discount: 0, final: 0 });
    const metadataRows = reportMetadata().map(([label, value]) => `
      <tr><th>${htmlEscape(label)}</th><td>${htmlEscape(value)}</td></tr>
    `).join('');
    const dataRows = sortedFilteredLaunches.map((launch) => `
      <tr>
        <td>${htmlEscape(launch.id)}</td>
        <td>${htmlEscape(launch.unit)}</td>
        <td>${htmlEscape(launch.supplier)}</td>
        <td>${htmlEscape(launch.type)}</td>
        <td>${htmlEscape(launch.document)}</td>
        <td>${htmlEscape(launch.dueDate)}</td>
        <td>${htmlEscape(launch.status)}</td>
        <td>${htmlEscape(launch.paymentMethod)}</td>
        <td>${htmlEscape(bankLabel(launch))}</td>
        <td>${launch.amount.toFixed(2)}</td>
        <td>${(launch.interestAmount || 0).toFixed(2)}</td>
        <td>${(launch.discountAmount || 0).toFixed(2)}</td>
        <td>${(launch.finalAmount || 0).toFixed(2)}</td>
      </tr>
    `).join('');
    const content = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Relatório de Contas a Pagar</h1>
          <table border="1">${metadataRows}</table>
          <br>
          <table border="1">
            <thead>
              <tr>
                <th>Lançamento</th>
                <th>Unidade</th>
                <th>Fornecedor</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Vencimento</th>
                <th>Situação</th>
                <th>Cobrança</th>
                <th>Banco</th>
                <th>Valor</th>
                <th>Juros</th>
                <th>Desconto</th>
                <th>Valor final</th>
              </tr>
            </thead>
            <tbody>${dataRows}</tbody>
            <tfoot>
              <tr>
                <th colspan="9">Total</th>
                <th>${totals.amount.toFixed(2)}</th>
                <th>${totals.interest.toFixed(2)}</th>
                <th>${totals.discount.toFixed(2)}</th>
                <th>${totals.final.toFixed(2)}</th>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    downloadBlob(content, reportFilename('xls'), 'application/vnd.ms-excel;charset=utf-8');
    setGenerateMenuOpen(false);
    setMessage('Relatório em Excel gerado');
  }

  function reportPdfLines() {
    const totals = filteredLaunches.reduce((acc, launch) => ({
      amount: acc.amount + launch.amount,
      interest: acc.interest + (launch.interestAmount || 0),
      discount: acc.discount + (launch.discountAmount || 0),
      final: acc.final + (launch.finalAmount || 0),
    }), { amount: 0, interest: 0, discount: 0, final: 0 });
    const lines = [
      'Relatório de Contas a Pagar',
      `Gerado em ${todayValue()}`,
      '',
    ];

    reportMetadata().forEach(([label, value]) => {
      lines.push(`${label}: ${value}`);
    });

    lines.push('');
    lines.push('Lançamento       Unid Fornecedor      Documento Banco        Vencimento Sit    Valor        Juros    Desconto Valor final');
    lines.push('------------------------------------------------------------------------------------------------------------------------------');

    if (!sortedFilteredLaunches.length) {
      lines.push('Nenhum lançamento encontrado para os filtros aplicados.');
    }

    sortedFilteredLaunches.forEach((launch) => {
      lines.push([
        fitPdfText(launch.id, 16),
        fitPdfText(launch.unit, 4),
        fitPdfText(launch.supplier, 15),
        fitPdfText(launch.document, 8),
        fitPdfText(bankLabel(launch), 11),
        fitPdfText(launch.dueDate, 10),
        fitPdfText(launch.status, 6),
        fitPdfText(currency(launch.amount), 12),
        fitPdfText(currency(launch.interestAmount || 0), 9),
        fitPdfText(currency(launch.discountAmount || 0), 9),
        fitPdfText(currency(launch.finalAmount || 0), 11),
      ].join(' '));
    });

    lines.push('------------------------------------------------------------------------------------------------------------------------------');
    lines.push(`Total títulos: ${currency(totals.amount)} | Juros: ${currency(totals.interest)} | Desconto: ${currency(totals.discount)} | Valor final: ${currency(totals.final)}`);
    return lines;
  }

  function generatePdf() {
    downloadBlob(createPdfContent(reportPdfLines()), reportFilename('pdf'), 'application/pdf');
    setGenerateMenuOpen(false);
    setMessage('Relatório em PDF gerado');
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFiltersApplied(true);
    setGenerateMenuOpen(false);
    setMessage('Filtros aplicados para o relatorio de contas a pagar');
  }

  function handleSaveQuickQuery() {
    const result = saveQuickQuery({
      name: quickQueryName,
      reportType: 'accounts-payable',
      pageId: 'accounts-payable-report',
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

  const tableTotals = filteredLaunches.reduce((acc, launch) => ({
    amount: acc.amount + launch.amount,
    interest: acc.interest + (launch.interestAmount || 0),
    discount: acc.discount + (launch.discountAmount || 0),
    final: acc.final + (launch.finalAmount || 0),
  }), { amount: 0, interest: 0, discount: 0, final: 0 });

  return (
    <section className="accounts-payable-report-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Relatório de Contas a Pagar</h1>
          <p className="page-kicker">Filtros para consulta de lançamentos a pagar</p>
        </div>
      </header>

      <form className="finance-form report-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade</span>
            <select
              value={businessUnit}
              onChange={(event) => {
                setBusinessUnit(event.target.value);
                markFiltersDirty();
              }}
            >
              <option value="">Todas</option>
              {businessUnits.map((unit) => (
                <option value={unit.value} key={unit.value}>{unit.label}</option>
              ))}
            </select>
          </label>

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
            <span>Situação do Lançamento</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                markFiltersDirty();
              }}
            >
              <option>Aberto</option>
              <option>Baixado</option>
              <option>Ambos</option>
            </select>
          </label>

          <label className="field field--span-2">
            <span>Selecionar Tipo Pesquisa</span>
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
        </div>

        <div className="report-grid">
          <MultiCheckFilter title="Tipo de Cobrança" options={chargeTypes} selected={selectedChargeTypes} onChange={(next) => updateSelection(setSelectedChargeTypes, next)} />
          <MultiCheckFilter title="Selecionar Tipo" options={accountingTypeNames} selected={selectedTypes} onChange={(next) => updateSelection(setSelectedTypes, next)} />
          <MultiCheckFilter title="Banco do Pagamento" options={bankOptions} selected={selectedBanks} onChange={(next) => updateSelection(setSelectedBanks, next)} searchable searchPlaceholder="Pesquisar banco" />
          <MultiCheckFilter title="Selecionar Fornecedor" options={supplierNames} selected={selectedSuppliers} onChange={(next) => updateSelection(setSelectedSuppliers, next)} searchable searchPlaceholder="Pesquisar fornecedor" />
          <MultiCheckFilter title="Selecionar Documento" options={documentNumbers} selected={selectedDocuments} onChange={(next) => updateSelection(setSelectedDocuments, next)} searchable searchPlaceholder="Pesquisar documento" />
        </div>

        <div className="report-summary">
          <span>{summary.chargeTypes} cobranca(s)</span>
          <span>{summary.banks} banco(s)</span>
          <span>{summary.types} tipo(s)</span>
          <span>{summary.suppliers} fornecedor(es)</span>
          <span>{summary.documents} documento(s)</span>
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
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSelectedChargeTypes(chargeTypes);
              setSelectedBanks(bankOptions);
              setSelectedTypes(accountingTypeNames);
              setSelectedSuppliers(supplierNames);
              setSelectedDocuments(documentNumbers);
              setFiltersApplied(false);
              setGenerateMenuOpen(false);
              setMessage('');
            }}
          >
            Selecionar todos
          </button>
          {filtersApplied && (
            <div className="report-generate-actions">
              <div className="report-split-button">
                <button type="button" className="primary-button report-generate-main" onClick={generatePdf}>
                  Gerar Relatório
                </button>
                <button
                  type="button"
                  className="primary-button report-generate-toggle"
                  aria-label="Opções de geração"
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
        <section className="registered-launches-panel report-results-panel" aria-labelledby="accounts-payable-report-results-title">
          <div className="registered-launches-header">
            <h2 id="accounts-payable-report-results-title">Dados consultados</h2>
            <div>
              <span>{sortedFilteredLaunches.length} lançamento(s)</span>
              <strong>{currency(tableTotals.amount)}</strong>
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
                {sortedFilteredLaunches.map((launch) => (
                  <tr key={launch.id}>
                    <td><strong>{launch.id}</strong></td>
                    <td>{launch.unit}</td>
                    <td>{launch.supplier}</td>
                    <td>{launch.document}</td>
                    <td>{launch.dueDate}</td>
                    <td>{launch.status}</td>
                    <td>{launch.paymentMethod}</td>
                    <td>{bankLabel(launch)}</td>
                    <td>{currency(launch.amount)}</td>
                    <td>{currency(launch.interestAmount || 0)}</td>
                    <td>{currency(launch.discountAmount || 0)}</td>
                    <td>{currency(launch.finalAmount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="8">Total</th>
                  <th>{currency(tableTotals.amount)}</th>
                  <th>{currency(tableTotals.interest)}</th>
                  <th>{currency(tableTotals.discount)}</th>
                  <th>{currency(tableTotals.final)}</th>
                </tr>
              </tfoot>
            </table>

            {!sortedFilteredLaunches.length && (
              <div className="empty-list">Nenhum lançamento encontrado para os filtros aplicados</div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
