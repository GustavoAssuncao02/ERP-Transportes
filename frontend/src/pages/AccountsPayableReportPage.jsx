import { useMemo, useState } from 'react';

const businessUnits = [
  { value: '001', label: '001 - JTD Transportes LTDA' },
  { value: '002', label: '002 - JTD Logística Nordeste' },
  { value: '003', label: '003 - JTD Armazéns Salvador' },
];

const searchTypes = [
  { code: 'A', label: 'Data Emissão' },
  { code: 'B', label: 'Data de Vencimento' },
  { code: 'C', label: 'Data de Cadastro' },
  { code: 'D', label: 'Data de Pagamento' },
  { code: 'E', label: 'Data de Apropriação' },
  { code: 'F', label: 'Data de Previsão de Pagamento' },
];

const chargeTypes = [
  'Carteira',
  'Banco',
  'Cheque Pré-Datado',
  'Avista',
  'Salário',
  'Empréstimo',
  'Financiamento',
  'Imposto',
  'Boleto',
  'Pix',
  'Transferência',
  'Cartão',
];

const accountingTypes = [
  'Serviços de transporte',
  'Combustível',
  'Manutenção',
  'Pedágio',
  'Administrativo',
  'Seguro',
];

const suppliers = [
  'Auto Posto Central LTDA',
  'Oficina São Jorge',
  'Seguradora Atlântica',
  'Transportes Parceiros SA',
  'JTD Logística Nordeste',
];

const documents = [
  'NF-8742',
  'OS-1180',
  'AP-4409',
  'FAT-3321',
  'DUP-0091',
  'REC-5530',
];

const reportLaunches = [
  { id: 'CAP-202605-00001', unit: '001', supplier: suppliers[0], type: accountingTypes[1], document: documents[0], dueDate: '2026-05-14', paymentMethod: chargeTypes[8], amount: 1350.25, status: 'Aberto' },
  { id: 'CAP-202605-00002', unit: '001', supplier: suppliers[1], type: accountingTypes[2], document: documents[1], dueDate: '2026-05-14', paymentMethod: chargeTypes[9], amount: 780, status: 'Aberto' },
  { id: 'CAP-202605-00003', unit: '002', supplier: suppliers[2], type: accountingTypes[5], document: documents[2], dueDate: '2026-06-02', paymentMethod: chargeTypes[8], amount: 2420.5, status: 'Baixado' },
  { id: 'CAP-202605-00004', unit: '003', supplier: suppliers[3], type: accountingTypes[0], document: documents[3], dueDate: '2026-06-10', paymentMethod: chargeTypes[10], amount: 990.9, status: 'Aberto' },
  { id: 'CAP-202605-00005', unit: '001', supplier: suppliers[4], type: accountingTypes[4], document: documents[4], dueDate: '2026-05-28', paymentMethod: chargeTypes[6], amount: 3180, status: 'Aberto' },
  { id: 'CAP-202605-00006', unit: '002', supplier: suppliers[0], type: accountingTypes[3], document: documents[5], dueDate: '2026-05-29', paymentMethod: chargeTypes[11], amount: 240, status: 'Baixado' },
];

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function currency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
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
    <section className="report-filter-box">
      <div className="report-filter-header">
        <h2>{title}</h2>
        <label>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          Todos
        </label>
      </div>

      {searchable && (
        <div className="report-filter-search">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

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
    </section>
  );
}

export default function AccountsPayableReportPage() {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('A');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [status, setStatus] = useState('Ambos');
  const [selectedChargeTypes, setSelectedChargeTypes] = useState(chargeTypes);
  const [selectedTypes, setSelectedTypes] = useState(accountingTypes);
  const [selectedSuppliers, setSelectedSuppliers] = useState(suppliers);
  const [selectedDocuments, setSelectedDocuments] = useState(documents);
  const [message, setMessage] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);

  const summary = useMemo(() => ({
    chargeTypes: selectedChargeTypes.length,
    types: selectedTypes.length,
    suppliers: selectedSuppliers.length,
    documents: selectedDocuments.length,
  }), [selectedChargeTypes, selectedTypes, selectedSuppliers, selectedDocuments]);

  const filteredLaunches = useMemo(() => reportLaunches.filter((launch) => {
    const unitMatches = !businessUnit || launch.unit === businessUnit;
    const startMatches = !periodStart || launch.dueDate >= periodStart;
    const endMatches = !periodEnd || launch.dueDate <= periodEnd;
    const statusMatches = status === 'Ambos' || launch.status === status;
    const chargeMatches = selectedChargeTypes.includes(launch.paymentMethod);
    const typeMatches = selectedTypes.includes(launch.type);
    const supplierMatches = selectedSuppliers.includes(launch.supplier);
    const documentMatches = selectedDocuments.includes(launch.document);

    return unitMatches && startMatches && endMatches && statusMatches && chargeMatches && typeMatches && supplierMatches && documentMatches;
  }), [
    businessUnit,
    periodStart,
    periodEnd,
    status,
    selectedChargeTypes,
    selectedTypes,
    selectedSuppliers,
    selectedDocuments,
  ]);

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
    const selectedType = searchTypes.find((type) => type.code === searchType);
    return selectedType ? `${selectedType.code} - ${selectedType.label}` : searchType;
  }

  function reportMetadata() {
    return [
      ['Unidade', businessUnit || 'Todas'],
      ['Periodo inicial', periodStart || 'Todos'],
      ['Periodo final', periodEnd || 'Todos'],
      ['Situacao', status],
      ['Tipo pesquisa', selectedSearchTypeLabel()],
    ];
  }

  function generateExcel() {
    const total = filteredLaunches.reduce((sum, launch) => sum + launch.amount, 0);
    const metadataRows = reportMetadata().map(([label, value]) => `
      <tr><th>${htmlEscape(label)}</th><td>${htmlEscape(value)}</td></tr>
    `).join('');
    const dataRows = filteredLaunches.map((launch) => `
      <tr>
        <td>${htmlEscape(launch.id)}</td>
        <td>${htmlEscape(launch.unit)}</td>
        <td>${htmlEscape(launch.supplier)}</td>
        <td>${htmlEscape(launch.type)}</td>
        <td>${htmlEscape(launch.document)}</td>
        <td>${htmlEscape(launch.dueDate)}</td>
        <td>${htmlEscape(launch.status)}</td>
        <td>${htmlEscape(launch.paymentMethod)}</td>
        <td>${launch.amount.toFixed(2)}</td>
      </tr>
    `).join('');
    const content = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <h1>Relatorio de Contas a Pagar</h1>
          <table border="1">${metadataRows}</table>
          <br>
          <table border="1">
            <thead>
              <tr>
                <th>Lancamento</th>
                <th>Unidade</th>
                <th>Fornecedor</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Vencimento</th>
                <th>Situacao</th>
                <th>Cobranca</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>${dataRows}</tbody>
            <tfoot><tr><th colspan="8">Total</th><th>${total.toFixed(2)}</th></tr></tfoot>
          </table>
        </body>
      </html>
    `;

    downloadBlob(content, reportFilename('xls'), 'application/vnd.ms-excel;charset=utf-8');
    setGenerateMenuOpen(false);
    setMessage('Relatório em Excel gerado');
  }

  function reportPdfLines() {
    const total = filteredLaunches.reduce((sum, launch) => sum + launch.amount, 0);
    const lines = [
      'Relatorio de Contas a Pagar',
      `Gerado em ${todayValue()}`,
      '',
    ];

    reportMetadata().forEach(([label, value]) => {
      lines.push(`${label}: ${value}`);
    });

    lines.push('');
    lines.push('Lancamento          Unid Fornecedor                 Documento Tipo              Vencimento Situacao Pagamento       Valor');
    lines.push('------------------------------------------------------------------------------------------------------------------------');

    if (!filteredLaunches.length) {
      lines.push('Nenhum lancamento encontrado para os filtros aplicados.');
    }

    filteredLaunches.forEach((launch) => {
      lines.push([
        fitPdfText(launch.id, 18),
        fitPdfText(launch.unit, 4),
        fitPdfText(launch.supplier, 26),
        fitPdfText(launch.document, 9),
        fitPdfText(launch.type, 17),
        fitPdfText(launch.dueDate, 10),
        fitPdfText(launch.status, 7),
        fitPdfText(launch.paymentMethod, 13),
        fitPdfText(currency(launch.amount), 14),
      ].join(' '));
    });

    lines.push('------------------------------------------------------------------------------------------------------------------------');
    lines.push(`Total: ${currency(total)}`);
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
    setMessage('Filtros aplicados para o relatório de contas a pagar');
  }

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
            <span>Período inicial</span>
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
            <span>Período final</span>
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
        </div>

        <section className="report-search-type" aria-labelledby="search-type-title">
          <h2 id="search-type-title">Selecionar Tipo Pesquisa</h2>
          <div className="search-type-table" role="radiogroup" aria-label="Tipo de pesquisa">
            {searchTypes.map((type) => (
              <label className={searchType === type.code ? 'search-type-row active' : 'search-type-row'} key={type.code}>
                <input
                  type="radio"
                  name="searchType"
                  value={type.code}
                  checked={searchType === type.code}
                  onChange={() => {
                    setSearchType(type.code);
                    markFiltersDirty();
                  }}
                />
                <span>{type.code}</span>
                <strong>{type.label}</strong>
              </label>
            ))}
          </div>
        </section>

        <div className="report-grid">
          <section className="report-filter-box charge-filter">
            <div className="report-filter-header">
              <h2>Tipo de Cobrança</h2>
              <label>
                <input
                  type="checkbox"
                  checked={selectedChargeTypes.length === chargeTypes.length}
                  onChange={() => updateSelection(setSelectedChargeTypes, selectedChargeTypes.length === chargeTypes.length ? [] : chargeTypes)}
                />
                Todos
              </label>
            </div>
            <div className="report-check-list report-check-list--scroll">
              {chargeTypes.map((type) => (
                <label className="report-check-row" key={type}>
                  <input
                    type="checkbox"
                    checked={selectedChargeTypes.includes(type)}
                    onChange={() => updateSelection(
                      setSelectedChargeTypes,
                      selectedChargeTypes.includes(type)
                        ? selectedChargeTypes.filter((item) => item !== type)
                        : [...selectedChargeTypes, type],
                    )}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </section>

          <MultiCheckFilter title="Selecionar Tipo" options={accountingTypes} selected={selectedTypes} onChange={(next) => updateSelection(setSelectedTypes, next)} />
          <MultiCheckFilter title="Selecionar Fornecedor" options={suppliers} selected={selectedSuppliers} onChange={(next) => updateSelection(setSelectedSuppliers, next)} searchable searchPlaceholder="Pesquisar fornecedor" />
          <MultiCheckFilter title="Selecionar Documento" options={documents} selected={selectedDocuments} onChange={(next) => updateSelection(setSelectedDocuments, next)} searchable searchPlaceholder="Pesquisar documento" />
        </div>

        <div className="report-summary">
          <span>{summary.chargeTypes} cobrança(s)</span>
          <span>{summary.types} tipo(s)</span>
          <span>{summary.suppliers} fornecedor(es)</span>
          <span>{summary.documents} documento(s)</span>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Aplicar filtros</button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSelectedChargeTypes(chargeTypes);
              setSelectedTypes(accountingTypes);
              setSelectedSuppliers(suppliers);
              setSelectedDocuments(documents);
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
                  ▾
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
    </section>
  );
}
