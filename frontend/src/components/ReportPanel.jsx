import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Save, Search, X } from 'lucide-react';
import TriStateCheckbox from './TriStateCheckbox.jsx';
import { maxQuickQueryNameLength, saveQuickQuery } from '../data/quickQueries.js';
import {
  createReportPdfContent,
  downloadBlob,
  htmlEscape,
  normalizeReportSelection,
  normalizeReportText,
  optionLabel,
  optionValue,
  reportOptionValue,
  reportSelectionLabel,
  todayValue,
} from '../utils/report.js';

function valueText(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function defaultGetRowKey(row, index) {
  return row.id || row.key || `${index}`;
}

function normalizeFilters(defaultFilters, filters) {
  const savedFilters = filters || {};

  return Object.entries({
    ...defaultFilters,
    ...savedFilters,
  }).reduce((normalizedFilters, [key, value]) => {
    if (Array.isArray(defaultFilters[key]) && value !== undefined && !Array.isArray(value)) {
      return {
        ...normalizedFilters,
        [key]: value ? [String(value)] : defaultFilters[key],
      };
    }

    return { ...normalizedFilters, [key]: value };
  }, {});
}

function reportFilename(prefix, extension) {
  return `${prefix}-${todayValue()}.${extension}`;
}

function normalizedFieldOptions(field) {
  return (field.options || []).map((option) => {
    const meta = option?.meta || {};

    return {
      value: reportOptionValue(option),
      label: optionLabel(option),
      meta,
      searchText: [
        optionLabel(option),
        option?.searchText,
        ...Object.values(meta),
      ].filter(Boolean).join(' '),
    };
  }).filter((option) => option.value);
}

function optionValues(field) {
  return normalizedFieldOptions(field).map((option) => option.value);
}

export default function ReportPanel({
  title,
  titleId,
  pageId,
  reportType,
  module = 'Operacao',
  icon = 'operation',
  defaultFilters,
  fields,
  columns,
  buildRows,
  filenamePrefix,
  initialSavedQuery = null,
  onSavedQueriesChange,
  getSummary,
  getMetadata,
  getRowKey = defaultGetRowKey,
  emptyMessage = 'Nenhum registro encontrado para os filtros aplicados',
  generateLabel = 'Gerar PDF',
}) {
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [quickQueryName, setQuickQueryName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lookupFieldKey, setLookupFieldKey] = useState(null);
  const [lookupSearch, setLookupSearch] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(
    () => (applied ? buildRows(filters) : []),
    [applied, buildRows, filters],
  );
  const summary = getSummary?.(rows) || `${rows.length} registro(s)`;
  const metadata = getMetadata?.(filters, rows) || [];
  const reportPanelTitleId = titleId || `${reportType}-title`;
  const reportBodyId = `${reportPanelTitleId}-body`;
  const reportResultsTitleId = `${reportPanelTitleId}-results`;

  useEffect(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);

  useEffect(() => {
    if (!initialSavedQuery?.filters || initialSavedQuery.reportType !== reportType) return;

    setFilters(normalizeFilters(defaultFilters, initialSavedQuery.filters));
    setQuickQueryName(initialSavedQuery.name || '');
    setOpen(true);
    setApplied(true);
    setMenuOpen(false);
    setMessage(`Consulta rapida "${initialSavedQuery.name}" carregada`);
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [
    defaultFilters,
    initialSavedQuery?.appliedAt,
    initialSavedQuery?.id,
    initialSavedQuery?.reportType,
    initialSavedQuery?.updatedAt,
    reportType,
  ]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setMessage('');
  }

  function selectedValues(field) {
    return normalizeReportSelection(filters[field.key]);
  }

  function setSelectedValues(field, values) {
    updateFilter(field.key, values);
  }

  function toggleSelectedValue(field, value) {
    const selected = selectedValues(field);
    const nextValue = String(value);

    setSelectedValues(
      field,
      selected.includes(nextValue)
        ? selected.filter((item) => item !== nextValue)
        : [...selected, nextValue],
    );
  }

  function selectAllValues(field) {
    setSelectedValues(field, optionValues(field));
  }

  function clearSelectedValues(field) {
    setSelectedValues(field, []);
  }

  function selectionSummary(field) {
    const label = reportSelectionLabel(selectedValues(field), field.options || []);
    return label === 'Todos' ? 'Todos selecionados' : label;
  }

  function openLookupField(field) {
    setLookupFieldKey(field.key);
    setLookupSearch('');
  }

  function closeLookupField() {
    setLookupFieldKey(null);
    setLookupSearch('');
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setApplied(false);
    setMenuOpen(false);
    closeLookupField();
    setMessage('');
  }

  function handleFilter(event) {
    event.preventDefault();
    setApplied(true);
    setMenuOpen(false);
    setMessage(`${buildRows(filters).length} registro(s) encontrado(s)`);
  }

  function handleSaveQuickQuery() {
    const result = saveQuickQuery({
      name: quickQueryName,
      reportType,
      pageId,
      module,
      icon,
      filters,
    });

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setQuickQueryName(result.quickQuery.name);
    onSavedQueriesChange?.(result.queries);
    setMessage(`Consulta rapida "${result.quickQuery.name}" salva`);
  }

  function renderField(field) {
    if (field.hidden?.(filters)) {
      return null;
    }

    if (field.type === 'lookupMulti') {
      return (
        <div className={`field report-lookup-multi-field${field.className ? ` ${field.className}` : ''}`} key={field.key}>
          <span>{field.label}</span>
          <div className="lookup-field">
            <input
              type="text"
              value={selectionSummary(field)}
              readOnly
              aria-label={field.label}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={`Pesquisar ${field.label.toLocaleLowerCase('pt-BR')}`}
              title={`Pesquisar ${field.label.toLocaleLowerCase('pt-BR')}`}
              onClick={() => openLookupField(field)}
            >
              <Search size={17} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      );
    }

    if (field.type === 'checkboxGroup') {
      const values = optionValues(field);
      const selected = selectedValues(field);
      const allSelected = values.length > 0 && selected.length === values.length;

      return (
        <div className={`warehouse-report-filter-box report-check-filter${field.className ? ` ${field.className}` : ''}`} key={field.key}>
          <span>{field.label}</span>
          <div className="report-check-filter-toolbar">
            <label>
              <TriStateCheckbox
                checked={allSelected}
                onChange={(event) => (event.target.checked ? selectAllValues(field) : clearSelectedValues(field))}
              />
              <span>Todos</span>
            </label>
          </div>
          <div className={(field.options || []).length > 8 ? 'warehouse-report-check-list warehouse-report-check-list--scroll' : 'warehouse-report-check-list'}>
            {normalizedFieldOptions(field).map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggleSelectedValue(field, option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'dateRange') {
      return (
        <div className="warehouse-report-filter-box report-date-filter" key={field.key}>
          <span>{field.label}</span>
          <label className="field">
            <span>Base do periodo</span>
            <select value={filters[field.fieldKey] || ''} onChange={(event) => updateFilter(field.fieldKey, event.target.value)}>
              {field.options.map((option) => (
                <option value={optionValue(option)} key={optionValue(option)}>{optionLabel(option)}</option>
              ))}
            </select>
          </label>
          <div className="warehouse-report-weight-range">
            <label>
              <span>De</span>
              <input type="date" value={filters[field.startKey] || ''} onChange={(event) => updateFilter(field.startKey, event.target.value)} />
            </label>
            <label>
              <span>Ate</span>
              <input type="date" value={filters[field.endKey] || ''} onChange={(event) => updateFilter(field.endKey, event.target.value)} />
            </label>
          </div>
        </div>
      );
    }

    if (field.type === 'numberRange') {
      return (
        <div className="warehouse-report-filter-box" key={field.key}>
          <span>{field.label}</span>
          <div className="warehouse-report-weight-range">
            <label>
              <span>De</span>
              <input type="number" min={field.min} step={field.step || '0.01'} value={filters[field.startKey] || ''} onChange={(event) => updateFilter(field.startKey, event.target.value)} />
            </label>
            <label>
              <span>Ate</span>
              <input type="number" min={field.min} step={field.step || '0.01'} value={filters[field.endKey] || ''} onChange={(event) => updateFilter(field.endKey, event.target.value)} />
            </label>
          </div>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <label className="field" key={field.key}>
          <span>{field.label}</span>
          <select value={filters[field.key] || ''} onChange={(event) => updateFilter(field.key, event.target.value)}>
            <option value="">{field.emptyLabel || 'Todos'}</option>
            {field.options.map((option) => (
              <option value={optionValue(option)} key={optionValue(option)}>{optionLabel(option)}</option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="field" key={field.key}>
        <span>{field.label}</span>
        <input
          type={field.inputType || 'search'}
          placeholder={field.placeholder || ''}
          value={filters[field.key] || ''}
          onChange={(event) => updateFilter(field.key, event.target.value)}
        />
      </label>
    );
  }

  function renderLookupModal() {
    const field = fields.find((item) => item.key === lookupFieldKey);

    if (!field) {
      return null;
    }

    const selected = selectedValues(field);
    const columns = field.columns || [];
    const query = normalizeReportText(lookupSearch);
    const visibleOptions = normalizedFieldOptions(field).filter((option) => (
      !query || normalizeReportText(option.searchText).includes(query)
    ));

    return (
      <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby={`${reportPanelTitleId}-${field.key}-lookup-title`}>
        <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookupField} />
        <div className="lookup-modal-panel">
          <header className="lookup-modal-header">
            <h2 id={`${reportPanelTitleId}-${field.key}-lookup-title`}>Selecionar {field.label}</h2>
            <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookupField}>
              <X size={18} strokeWidth={2.4} />
            </button>
          </header>

          <div className="lookup-modal-toolbar report-lookup-toolbar">
            <input
              type="search"
              className="lookup-search"
              placeholder={field.searchPlaceholder || `Pesquisar ${field.label.toLocaleLowerCase('pt-BR')}`}
              value={lookupSearch}
              onChange={(event) => setLookupSearch(event.target.value)}
              autoFocus
            />
            <button type="button" className="secondary-button" onClick={() => selectAllValues(field)}>
              Selecionar todos
            </button>
            <button type="button" className="secondary-button" onClick={() => clearSelectedValues(field)}>
              Limpar
            </button>
          </div>

          <div className="lookup-table-wrap">
            <table className="lookup-table report-lookup-table">
              <thead>
                <tr>
                  <th>{field.label}</th>
                  {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleOptions.map((option) => (
                  <tr key={option.value}>
                    <td>
                      <label className="report-lookup-check">
                        <input
                          type="checkbox"
                          checked={selected.includes(option.value)}
                          onChange={() => toggleSelectedValue(field, option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    </td>
                    {columns.map((column) => (
                      <td key={column.key}>{valueText(option.meta?.[column.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {!visibleOptions.length && <div className="lookup-empty">Nenhuma opcao encontrada</div>}
          </div>
        </div>
      </div>
    );
  }

  function columnValue(column, row) {
    const value = column.exportValue ? column.exportValue(row) : column.getValue?.(row);
    return valueText(value);
  }

  function generateExcel() {
    const metadataRows = metadata.map(([label, value]) => `
      <tr><th>${htmlEscape(label)}</th><td>${htmlEscape(value)}</td></tr>
    `).join('');
    const headerRows = columns.map((column) => `<th>${htmlEscape(column.label)}</th>`).join('');
    const dataRows = rows.map((row) => `
      <tr>${columns.map((column) => `<td>${htmlEscape(columnValue(column, row))}</td>`).join('')}</tr>
    `).join('');
    const content = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>${htmlEscape(title)}</h1>
          <table border="1">${metadataRows}</table>
          <br>
          <table border="1">
            <thead><tr>${headerRows}</tr></thead>
            <tbody>${dataRows}</tbody>
            <tfoot><tr><th colspan="${columns.length}">${htmlEscape(summary)}</th></tr></tfoot>
          </table>
        </body>
      </html>
    `;

    downloadBlob(content, reportFilename(filenamePrefix, 'xls'), 'application/vnd.ms-excel;charset=utf-8');
    setMenuOpen(false);
    setMessage('Relatorio em Excel gerado');
  }

  function generatePdf() {
    const pdfColumns = columns.map((column) => ({
      ...column,
      pdfValue: (row) => columnValue(column, row),
    }));

    downloadBlob(createReportPdfContent({
      title,
      generatedAt: todayValue(),
      metadata,
      columns: pdfColumns,
      rows,
      summary,
      emptyMessage,
    }), reportFilename(filenamePrefix, 'pdf'), 'application/pdf');
    setMenuOpen(false);
    setMessage('Relatorio em PDF gerado');
  }

  return (
    <section ref={panelRef} className="registered-launches-panel warehouse-filter-report-panel" aria-labelledby={reportPanelTitleId}>
      <button
        type="button"
        className="warehouse-filter-report-toggle"
        aria-expanded={open}
        aria-controls={reportBodyId}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span aria-hidden="true">
          {open ? <ChevronDown size={17} strokeWidth={2.3} /> : <ChevronRight size={17} strokeWidth={2.3} />}
        </span>
        <FileText size={18} strokeWidth={2.2} aria-hidden="true" />
        <strong id={reportPanelTitleId}>{title}</strong>
      </button>

      {open && (
        <div id={reportBodyId} className="warehouse-filter-report-body">
          <form className="warehouse-filter-report-form" onSubmit={handleFilter}>
            <div className="warehouse-filter-report-grid report-filter-grid">
              {fields.map(renderField)}
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

            <div className="warehouse-filter-report-actions">
              <button type="submit" className="primary-button">Filtrar</button>
              <button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
              {applied && (
                <div className="report-generate-actions">
                  <div className="report-split-button">
                    <button type="button" className="primary-button report-generate-main" onClick={generatePdf}>
                      {generateLabel}
                    </button>
                    <button
                      type="button"
                      className="primary-button report-generate-toggle"
                      aria-label={`Opcoes de geracao de ${title}`}
                      aria-expanded={menuOpen}
                      onClick={() => setMenuOpen((currentOpen) => !currentOpen)}
                    >
                      v
                    </button>
                    {menuOpen && (
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

          {renderLookupModal()}

          {applied && (
            <section className="warehouse-filter-report-results report-results-panel" aria-labelledby={reportResultsTitleId}>
              <div className="registered-launches-header">
                <h2 id={reportResultsTitleId}>Resultado</h2>
                <div><span>{summary}</span></div>
              </div>

              <div className="registered-launches-table-wrap">
                <table className="registered-launches-table registry-table report-results-table">
                  <thead>
                    <tr>
                      {columns.map((column) => <th key={column.key || column.label}>{column.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={getRowKey(row, index)}>
                        {columns.map((column) => (
                          <td key={column.key || column.label}>
                            {column.render ? column.render(row) : columnValue(column, row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!rows.length && <div className="empty-list">{emptyMessage}</div>}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
