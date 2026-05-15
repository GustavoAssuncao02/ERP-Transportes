import { useMemo, useState } from 'react';
import {
  accountingTypeNames,
  businessUnits,
  currency,
  documentNumbers,
  financeLaunches,
  normalizeText,
  paymentBanks,
  supplierNames,
} from '../data/financeData.js';

const searchTypes = [
  { label: 'Data Emissao', field: 'issueDate' },
  { label: 'Data de Vencimento', field: 'dueDate' },
  { label: 'Data de Cadastro', field: 'createdDate' },
  { label: 'Data de Pagamento', field: 'paymentDate' },
  { label: 'Data de Apropriacao', field: 'appropriationDate' },
  { label: 'Data de Previsao de Pagamento', field: 'paymentForecastDate' },
];

const bankOptions = ['Sem banco', ...paymentBanks];

function bankLabel(launch) {
  return launch.paymentBank || 'Sem banco';
}

function numberValue(value) {
  return Number.parseFloat(String(value).replace(',', '.'));
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

export default function RegisteredLaunchesPage({ onEditLaunch }) {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('issueDate');
  const [statusFilter, setStatusFilter] = useState('Ambos');
  const [selectedSuppliers, setSelectedSuppliers] = useState(supplierNames);
  const [selectedTypes, setSelectedTypes] = useState(accountingTypeNames);
  const [selectedDocuments, setSelectedDocuments] = useState(documentNumbers);
  const [selectedBanks, setSelectedBanks] = useState(bankOptions);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  const filteredLaunches = useMemo(() => {
    const min = numberValue(minValue);
    const max = numberValue(maxValue);
    const selectedDateField = searchTypes.find((type) => type.field === searchType)?.field || 'issueDate';

    return financeLaunches.filter((launch) => {
      const dateValue = launch[selectedDateField];
      const unitMatches = !businessUnit || launch.unit === businessUnit;
      const statusMatches = statusFilter === 'Ambos' || launch.status === statusFilter;
      const bankMatches = selectedBanks.includes(bankLabel(launch));
      const supplierMatches = selectedSuppliers.includes(launch.supplier);
      const typeMatches = selectedTypes.includes(launch.type);
      const documentMatches = selectedDocuments.includes(launch.document);
      const startMatches = !dateStart || (dateValue && dateValue >= dateStart);
      const endMatches = !dateEnd || (dateValue && dateValue <= dateEnd);
      const minMatches = Number.isNaN(min) || launch.amount >= min;
      const maxMatches = Number.isNaN(max) || launch.amount <= max;

      return unitMatches && statusMatches && bankMatches && supplierMatches && typeMatches && documentMatches && startMatches && endMatches && minMatches && maxMatches;
    });
  }, [businessUnit, dateEnd, dateStart, maxValue, minValue, searchType, selectedBanks, selectedDocuments, selectedSuppliers, selectedTypes, statusFilter]);

  const filteredTotal = filteredLaunches.reduce((total, launch) => total + launch.amount, 0);

  function clearFilters() {
    setBusinessUnit('');
    setSearchType('issueDate');
    setStatusFilter('Ambos');
    setSelectedSuppliers(supplierNames);
    setSelectedTypes(accountingTypeNames);
    setSelectedDocuments(documentNumbers);
    setSelectedBanks(bankOptions);
    setDateStart('');
    setDateEnd('');
    setMinValue('');
    setMaxValue('');
  }

  return (
    <section className="registered-launches-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Consultar Lancamentos</h1>
          <p className="page-kicker">Consulta dos lancamentos cadastrados no sistema</p>
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
            <span>Situacao do Lancamento</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>Ambos</option>
              <option>Aberto</option>
              <option>Baixado</option>
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
            options={supplierNames}
            selected={selectedSuppliers}
            onChange={setSelectedSuppliers}
            placeholder="Pesquisar fornecedor"
          />

          <MultiCheckField
            label="Tipo"
            options={accountingTypeNames}
            selected={selectedTypes}
            onChange={setSelectedTypes}
            placeholder="Pesquisar tipo contabil"
          />

          <MultiCheckField
            label="Banco do Pagamento"
            options={bankOptions}
            selected={selectedBanks}
            onChange={setSelectedBanks}
            placeholder="Pesquisar banco"
          />

          <MultiCheckField
            label="Selecionar Documento"
            options={documentNumbers}
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

        <section className="registered-launches-panel" aria-labelledby="registered-launches-title">
          <div className="registered-launches-header">
            <h2 id="registered-launches-title">Lancamentos cadastrados</h2>
            <div>
              <span>{filteredLaunches.length} lancamento(s)</span>
              <strong>{currency(filteredTotal)}</strong>
            </div>
          </div>

          <div className="registered-launches-table-wrap">
            <table className="registered-launches-table">
              <thead>
                <tr>
                  <th>Lancamento</th>
                  <th>Unidade</th>
                  <th>Fornecedor</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Banco</th>
                  <th>Emissao</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Situacao</th>
                </tr>
              </thead>
              <tbody>
                {filteredLaunches.map((launch) => (
                  <tr key={launch.id} onDoubleClick={() => onEditLaunch?.(launch)}>
                    <td><strong>{launch.id}</strong></td>
                    <td>{launch.unit}</td>
                    <td>{launch.supplier}</td>
                    <td>{launch.document}</td>
                    <td>{launch.type}</td>
                    <td>{bankLabel(launch)}</td>
                    <td>{launch.issueDate}</td>
                    <td>{launch.dueDate}</td>
                    <td>{currency(launch.amount)}</td>
                    <td><span className="launch-status-pill">{launch.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredLaunches.length && (
              <div className="empty-list">Nenhum lancamento encontrado para os filtros informados</div>
            )}
          </div>
        </section>
      </form>
    </section>
  );
}
