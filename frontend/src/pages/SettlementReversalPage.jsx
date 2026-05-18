import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  businessUnits,
  currency,
  financeLaunches,
  normalizeText,
  paymentBanks,
} from '../data/financeData.js';

const searchTypes = [
  { label: 'Data Emissao', field: 'issueDate' },
  { label: 'Data de Vencimento', field: 'dueDate' },
  { label: 'Data de Cadastro', field: 'createdDate' },
  { label: 'Data de Pagamento', field: 'paymentDate' },
  { label: 'Data de Apropriacao', field: 'appropriationDate' },
  { label: 'Data de Previsao de Pagamento', field: 'paymentForecastDate' },
];

const settledLaunches = financeLaunches.filter((launch) => launch.status === 'Baixado');
const settledSuppliers = [...new Set(settledLaunches.map((launch) => launch.supplier))];
const settledTypes = [...new Set(settledLaunches.map((launch) => launch.type))];
const settledDocuments = [...new Set(settledLaunches.map((launch) => launch.document))];
const settledChargeTypes = [...new Set(settledLaunches.map((launch) => launch.chargeType))];
const bankFilterOptions = ['Sem banco', ...paymentBanks];

function bankLabel(launch) {
  return launch.paymentBank || 'Sem banco';
}

function totalAmount(launches) {
  return launches.reduce((sum, launch) => sum + (launch.finalAmount || launch.amount), 0);
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
          {!visibleOptions.length && <div className="multi-check-empty">Nenhuma opção encontrada</div>}
        </div>
      </div>
    </div>
  );
}

export default function SettlementReversalPage({ onOpenLaunchDetails }) {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('paymentDate');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedBanks, setSelectedBanks] = useState(bankFilterOptions);
  const [selectedChargeTypes, setSelectedChargeTypes] = useState(settledChargeTypes);
  const [selectedTypes, setSelectedTypes] = useState(settledTypes);
  const [selectedSuppliers, setSelectedSuppliers] = useState(settledSuppliers);
  const [selectedDocuments, setSelectedDocuments] = useState(settledDocuments);
  const [launchSearch, setLaunchSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [status, setStatus] = useAutoClearMessage();

  const filteredLaunches = useMemo(() => settledLaunches.filter((launch) => {
    const dateValue = launch[searchType];
    const unitMatches = !businessUnit || launch.unit === businessUnit;
    const startMatches = !dateStart || (dateValue && dateValue >= dateStart);
    const endMatches = !dateEnd || (dateValue && dateValue <= dateEnd);
    const bankMatches = selectedBanks.includes(bankLabel(launch));
    const chargeMatches = selectedChargeTypes.includes(launch.chargeType);
    const typeMatches = selectedTypes.includes(launch.type);
    const supplierMatches = selectedSuppliers.includes(launch.supplier);
    const documentMatches = selectedDocuments.includes(launch.document);

    return unitMatches && startMatches && endMatches && bankMatches && chargeMatches && typeMatches && supplierMatches && documentMatches;
  }), [
    businessUnit,
    dateEnd,
    dateStart,
    searchType,
    selectedBanks,
    selectedChargeTypes,
    selectedDocuments,
    selectedSuppliers,
    selectedTypes,
  ]);

  const selectedLaunches = useMemo(
    () => settledLaunches.filter((launch) => selectedIds.includes(launch.id)),
    [selectedIds],
  );

  function addLaunch(launchId) {
    setSelectedIds((current) => (current.includes(launchId) ? current : [...current, launchId]));
    setStatus('Lançamento adicionado ao estorno');
  }

  function removeLaunch(launchId) {
    setSelectedIds((current) => current.filter((id) => id !== launchId));
    setStatus('Lançamento removido do estorno');
  }

  function searchAndAddLaunch() {
    const query = launchSearch.trim();
    const anyLaunch = financeLaunches.find((launch) => normalizeText(launch.id) === normalizeText(query));
    const settledLaunch = settledLaunches.find((launch) => normalizeText(launch.id) === normalizeText(query));

    if (!query) {
      setStatus('Informe o número do lançamento');
      return;
    }

    if (!anyLaunch) {
      setStatus('Lançamento não encontrado');
      return;
    }

    if (!settledLaunch) {
      setStatus('Somente títulos baixados podem ser adicionados ao estorno');
      return;
    }

    if (selectedIds.includes(settledLaunch.id)) {
      setStatus('Lançamento já esta selecionado para estorno');
      return;
    }

    addLaunch(settledLaunch.id);
    setLaunchSearch('');
  }

  function clearFilters() {
    setBusinessUnit('');
    setSearchType('paymentDate');
    setDateStart('');
    setDateEnd('');
    setSelectedBanks(bankFilterOptions);
    setSelectedChargeTypes(settledChargeTypes);
    setSelectedTypes(settledTypes);
    setSelectedSuppliers(settledSuppliers);
    setSelectedDocuments(settledDocuments);
    setStatus('');
  }

  function reverseSettlement() {
    if (!selectedLaunches.length) {
      setStatus('Selecione pelo menos um título baixado para estornar');
      return;
    }

    setStatus(`${selectedLaunches.length} baixa(s) marcada(s) para estorno`);
  }

  return (
    <section className="settlement-reversal-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Estorno de Baixa</h1>
          <p className="page-kicker">Seleção de títulos baixados para desfazer a baixa</p>
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
            label="Banco do pagamento"
            options={bankFilterOptions}
            selected={selectedBanks}
            onChange={setSelectedBanks}
            placeholder="Pesquisar banco"
          />

          <MultiCheckField
            label="Tipo de Cobrança"
            options={settledChargeTypes}
            selected={selectedChargeTypes}
            onChange={setSelectedChargeTypes}
            placeholder="Pesquisar tipo de cobranca"
          />

          <MultiCheckField
            label="Selecionar Tipo"
            options={settledTypes}
            selected={selectedTypes}
            onChange={setSelectedTypes}
            placeholder="Pesquisar tipo contábil"
          />

          <MultiCheckField
            label="Selecionar Fornecedor"
            options={settledSuppliers}
            selected={selectedSuppliers}
            onChange={setSelectedSuppliers}
            placeholder="Pesquisar fornecedor"
          />

          <MultiCheckField
            label="Selecionar Documento"
            options={settledDocuments}
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
          <section className="registered-launches-panel" aria-labelledby="settled-launches-title">
            <div className="registered-launches-header">
              <h2 id="settled-launches-title">Títulos baixados</h2>
              <div>
                <span>{filteredLaunches.length} título(s)</span>
                <strong>{currency(totalAmount(filteredLaunches))}</strong>
              </div>
            </div>

            <div className="schedule-direct-search">
              <label htmlFor="reversal-launch-search">Pesquisar Lançamento</label>
              <div>
                <input
                  id="reversal-launch-search"
                  type="search"
                  placeholder="Número do lançamento"
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
              <table className="registered-launches-table reversal-table">
                <thead>
                  <tr>
                    <th>Lançamento</th>
                    <th>Fornecedor</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Banco</th>
                    <th>Pagamento</th>
                    <th>Valor final</th>
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
                        <td>{bankLabel(launch)}</td>
                        <td>{launch.paymentDate}</td>
                        <td>{currency(launch.finalAmount || launch.amount)}</td>
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Adicionar ao estorno"
                            title="Adicionar ao estorno"
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

              {!filteredLaunches.length && <div className="empty-list">Nenhum título baixado encontrado</div>}
            </div>
          </section>

          <section className="selection-panel selected-panel" aria-labelledby="reversal-selected-title">
            <div className="selection-panel-header">
              <h2 id="reversal-selected-title">Selecionados para estorno</h2>
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
                    <span>{bankLabel(launch)}</span>
                    <strong>{currency(launch.finalAmount || launch.amount)}</strong>
                  </div>
                  <button
                    type="button"
                    className="mini-remove-button"
                    aria-label="Remover lançamento"
                    onClick={() => removeLaunch(launch.id)}
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              {!selectedLaunches.length && <div className="empty-list">Nenhum título selecionado</div>}
            </div>

            <div className="schedule-actions">
              <button type="button" className="primary-button" onClick={reverseSettlement}>Estornar baixa</button>
              <button type="button" className="secondary-button" onClick={() => setSelectedIds([])}>Limpar</button>
              <span className="status-line" aria-live="polite">{status}</span>
            </div>
          </section>
        </div>
      </form>
    </section>
  );
}
