import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import {
  businessUnits,
  currency,
  financeLaunches,
  normalizeText,
} from '../data/financeData.js';

const searchTypes = [
  { label: 'Data Emissao', field: 'issueDate' },
  { label: 'Data de Vencimento', field: 'dueDate' },
  { label: 'Data de Cadastro', field: 'createdDate' },
  { label: 'Data de Apropriacao', field: 'appropriationDate' },
  { label: 'Data de Previsao de Pagamento', field: 'paymentForecastDate' },
];

const deletableLaunches = financeLaunches.filter((launch) => launch.status === 'Aberto');
const supplierOptions = [...new Set(deletableLaunches.map((launch) => launch.supplier))];
const typeOptions = [...new Set(deletableLaunches.map((launch) => launch.type))];
const documentOptions = [...new Set(deletableLaunches.map((launch) => launch.document))];
const chargeTypeOptions = [...new Set(deletableLaunches.map((launch) => launch.chargeType))];

function totalAmount(launches) {
  return launches.reduce((sum, launch) => sum + launch.amount, 0);
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

export default function AccountsPayableDeletionPage({ onOpenLaunchDetails }) {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('dueDate');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedChargeTypes, setSelectedChargeTypes] = useState(chargeTypeOptions);
  const [selectedTypes, setSelectedTypes] = useState(typeOptions);
  const [selectedSuppliers, setSelectedSuppliers] = useState(supplierOptions);
  const [selectedDocuments, setSelectedDocuments] = useState(documentOptions);
  const [launchSearch, setLaunchSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [status, setStatus] = useState('');

  const filteredLaunches = useMemo(() => deletableLaunches.filter((launch) => {
    const dateValue = launch[searchType];
    const unitMatches = !businessUnit || launch.unit === businessUnit;
    const startMatches = !dateStart || (dateValue && dateValue >= dateStart);
    const endMatches = !dateEnd || (dateValue && dateValue <= dateEnd);
    const chargeMatches = selectedChargeTypes.includes(launch.chargeType);
    const typeMatches = selectedTypes.includes(launch.type);
    const supplierMatches = selectedSuppliers.includes(launch.supplier);
    const documentMatches = selectedDocuments.includes(launch.document);

    return unitMatches && startMatches && endMatches && chargeMatches && typeMatches && supplierMatches && documentMatches;
  }), [
    businessUnit,
    dateEnd,
    dateStart,
    searchType,
    selectedChargeTypes,
    selectedDocuments,
    selectedSuppliers,
    selectedTypes,
  ]);

  const selectedLaunches = useMemo(
    () => deletableLaunches.filter((launch) => selectedIds.includes(launch.id)),
    [selectedIds],
  );

  function addLaunch(launchId) {
    setSelectedIds((current) => (current.includes(launchId) ? current : [...current, launchId]));
    setStatus('Lancamento adicionado a exclusao');
  }

  function removeLaunch(launchId) {
    setSelectedIds((current) => current.filter((id) => id !== launchId));
    setStatus('Lancamento removido da exclusao');
  }

  function searchAndAddLaunch() {
    const query = launchSearch.trim();
    const anyLaunch = financeLaunches.find((launch) => normalizeText(launch.id) === normalizeText(query));
    const deletableLaunch = deletableLaunches.find((launch) => normalizeText(launch.id) === normalizeText(query));

    if (!query) {
      setStatus('Informe o numero do lancamento');
      return;
    }

    if (!anyLaunch) {
      setStatus('Lancamento nao encontrado');
      return;
    }

    if (!deletableLaunch) {
      setStatus('Somente titulos em aberto podem ser adicionados a exclusao');
      return;
    }

    if (selectedIds.includes(deletableLaunch.id)) {
      setStatus('Lancamento ja esta selecionado para exclusao');
      return;
    }

    addLaunch(deletableLaunch.id);
    setLaunchSearch('');
  }

  function clearFilters() {
    setBusinessUnit('');
    setSearchType('dueDate');
    setDateStart('');
    setDateEnd('');
    setSelectedChargeTypes(chargeTypeOptions);
    setSelectedTypes(typeOptions);
    setSelectedSuppliers(supplierOptions);
    setSelectedDocuments(documentOptions);
    setStatus('');
  }

  function deleteLaunches() {
    if (!selectedLaunches.length) {
      setStatus('Selecione pelo menos um titulo em aberto para excluir');
      return;
    }

    setStatus(`${selectedLaunches.length} titulo(s) marcado(s) para exclusao`);
  }

  return (
    <section className="accounts-payable-deletion-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Exclusao de Titulos a Pagar</h1>
          <p className="page-kicker">Selecao de titulos em aberto para exclusao</p>
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
            label="Tipo de Cobranca"
            options={chargeTypeOptions}
            selected={selectedChargeTypes}
            onChange={setSelectedChargeTypes}
            placeholder="Pesquisar tipo de cobranca"
          />

          <MultiCheckField
            label="Selecionar Tipo"
            options={typeOptions}
            selected={selectedTypes}
            onChange={setSelectedTypes}
            placeholder="Pesquisar tipo contabil"
          />

          <MultiCheckField
            label="Selecionar Fornecedor"
            options={supplierOptions}
            selected={selectedSuppliers}
            onChange={setSelectedSuppliers}
            placeholder="Pesquisar fornecedor"
          />

          <MultiCheckField
            label="Selecionar Documento"
            options={documentOptions}
            selected={selectedDocuments}
            onChange={setSelectedDocuments}
            placeholder="Pesquisar documento"
          />

          <div className="field registered-launches-actions">
            <span>&nbsp;</span>
            <button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
          </div>
        </div>

        <div className="schedule-layout">
          <section className="registered-launches-panel" aria-labelledby="deletion-launches-title">
            <div className="registered-launches-header">
              <h2 id="deletion-launches-title">Titulos em aberto</h2>
              <div>
                <span>{filteredLaunches.length} titulo(s)</span>
                <strong>{currency(totalAmount(filteredLaunches))}</strong>
              </div>
            </div>

            <div className="schedule-direct-search">
              <label htmlFor="deletion-launch-search">Pesquisar Lancamento</label>
              <div>
                <input
                  id="deletion-launch-search"
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
                <button type="button" className="secondary-button schedule-search-button" onClick={searchAndAddLaunch}>
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
                    const selected = selectedIds.includes(launch.id);

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
                            aria-label="Adicionar a exclusao"
                            title="Adicionar a exclusao"
                            disabled={selected}
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

          <section className="selection-panel selected-panel" aria-labelledby="deletion-selected-title">
            <div className="selection-panel-header">
              <h2 id="deletion-selected-title">Selecionados para exclusao</h2>
              <strong>{currency(totalAmount(selectedLaunches))}</strong>
            </div>

            <div className="selected-list-box">
              {selectedLaunches.map((launch) => (
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
              {!selectedLaunches.length && <div className="empty-list">Nenhum titulo selecionado</div>}
            </div>

            <div className="schedule-actions">
              <button type="button" className="primary-button" onClick={deleteLaunches}>Excluir titulos</button>
              <button type="button" className="secondary-button" onClick={() => setSelectedIds([])}>Limpar</button>
              <span className="status-line" aria-live="polite">{status}</span>
            </div>
          </section>
        </div>
      </form>
    </section>
  );
}
