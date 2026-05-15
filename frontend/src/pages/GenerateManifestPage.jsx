import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { businessUnits, currency, normalizeText } from '../data/financeData.js';

const openCtes = [
  {
    id: 'CTE-202605-00001',
    number: '351605000001',
    issuer: 'JTD Transportes LTDA',
    origin: 'Salvador - BA',
    destination: 'Feira de Santana - BA',
    cargoWeight: 12800,
    cargoValue: 184500,
    status: 'Aberto',
  },
  {
    id: 'CTE-202605-00002',
    number: '351605000002',
    issuer: 'JTD Logistica Nordeste',
    origin: 'Camacari - BA',
    destination: 'Aracaju - SE',
    cargoWeight: 9200,
    cargoValue: 112300,
    status: 'Aberto',
  },
  {
    id: 'CTE-202605-00003',
    number: '351605000003',
    issuer: 'Transportes Parceiros SA',
    origin: 'Lauro de Freitas - BA',
    destination: 'Maceio - AL',
    cargoWeight: 15300,
    cargoValue: 206900,
    status: 'Aberto',
  },
  {
    id: 'CTE-202605-00004',
    number: '351605000004',
    issuer: 'JTD Armazens Salvador',
    origin: 'Salvador - BA',
    destination: 'Recife - PE',
    cargoWeight: 11100,
    cargoValue: 158750,
    status: 'Aberto',
  },
];

const cityApiUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';

const fallbackCities = [
  'Aracaju - SE',
  'Camacari - BA',
  'Feira de Santana - BA',
  'Lauro de Freitas - BA',
  'Maceio - AL',
  'Recife - PE',
  'Salvador - BA',
];

function cityLabel(city) {
  const uf = city.microrregiao?.mesorregiao?.UF?.sigla
    || city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
    || '';

  return uf ? `${city.nome} - ${uf}` : city.nome;
}

function formatWeight(value) {
  return `${Number(value || 0).toLocaleString('pt-BR')} kg`;
}

function nextManifestNumber() {
  const now = new Date();
  const key = 'manifestSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `MDFE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

export default function GenerateManifestPage() {
  const [unit, setUnit] = useState('001');
  const [cities, setCities] = useState(fallbackCities);
  const [cteSearch, setCteSearch] = useState('');
  const [selectedCteIds, setSelectedCteIds] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [truckModel, setTruckModel] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [driverName, setDriverName] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [cargoValue, setCargoValue] = useState('');
  const [hasInsurance, setHasInsurance] = useState('Nao');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [status, setStatus] = useAutoClearMessage();

  useEffect(() => {
    let ignore = false;

    async function loadCities() {
      try {
        const response = await fetch(cityApiUrl);

        if (!response.ok) {
          throw new Error('Falha ao carregar cidades');
        }

        const data = await response.json();
        const nextCities = [...new Set(data.map(cityLabel))]
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right, 'pt-BR'));

        if (!ignore) {
          setCities(nextCities);
        }
      } catch {
        if (!ignore) {
          setCities(fallbackCities);
        }
      }
    }

    loadCities();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredCtes = useMemo(() => {
    const query = normalizeText(cteSearch);
    if (!query) return openCtes;

    return openCtes.filter((cte) => normalizeText(`${cte.id} ${cte.number} ${cte.issuer} ${cte.origin} ${cte.destination}`).includes(query));
  }, [cteSearch]);

  const selectedCtes = useMemo(
    () => openCtes.filter((cte) => selectedCteIds.includes(cte.id)),
    [selectedCteIds],
  );
  const originOptions = origin && !cities.includes(origin) ? [origin, ...cities] : cities;
  const destinationOptions = destination && !cities.includes(destination) ? [destination, ...cities] : cities;

  const selectedWeight = selectedCtes.reduce((sum, cte) => sum + cte.cargoWeight, 0);
  const selectedValue = selectedCtes.reduce((sum, cte) => sum + cte.cargoValue, 0);

  function addCte(cte) {
    setSelectedCteIds((current) => (current.includes(cte.id) ? current : [...current, cte.id]));
    setOrigin((current) => current || cte.origin);
    setDestination((current) => current || cte.destination);
    setCargoWeight((current) => current || String(cte.cargoWeight));
    setCargoValue((current) => current || String(cte.cargoValue));
    setStatus('CTE anexado ao manifesto');
  }

  function removeCte(cteId) {
    setSelectedCteIds((current) => current.filter((id) => id !== cteId));
    setStatus('CTE removido do manifesto');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedCtes.length) {
      setStatus('Anexe pelo menos um CTE aberto ao manifesto');
      return;
    }

    const manifestNumber = nextManifestNumber();
    setStatus(`Manifesto ${manifestNumber} lancado com ${selectedCtes.length} CTE(s)`);
  }

  function handleReset() {
    setUnit('001');
    setCteSearch('');
    setSelectedCteIds([]);
    setOrigin('');
    setDestination('');
    setTruckPlate('');
    setTruckModel('');
    setDriverCpf('');
    setDriverName('');
    setCargoWeight('');
    setCargoValue('');
    setHasInsurance('Nao');
    setInsuranceCompany('');
    setInsurancePolicy('');
    setStatus('');
  }

  return (
    <section className="generate-manifest-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gerar Manifesto</h1>
          <p className="page-kicker">Lancamento de manifesto operacional com CTEs em aberto</p>
        </div>
      </header>

      <form className="finance-form manifest-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value)}>
              {businessUnits.map((businessUnit) => (
                <option value={businessUnit.value} key={businessUnit.value}>{businessUnit.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="schedule-layout manifest-cte-layout">
          <section className="registered-launches-panel" aria-labelledby="manifest-cte-title">
            <div className="registered-launches-header">
              <h2 id="manifest-cte-title">Anexar CTE</h2>
              <div>
                <span>{filteredCtes.length} CTE(s) em aberto</span>
                <strong>{currency(filteredCtes.reduce((sum, cte) => sum + cte.cargoValue, 0))}</strong>
              </div>
            </div>

            <div className="schedule-direct-search">
              <label htmlFor="manifest-cte-search">Consultar CTE</label>
              <div>
                <input
                  id="manifest-cte-search"
                  type="search"
                  placeholder="Numero, emissor, origem ou destino"
                  value={cteSearch}
                  onChange={(event) => setCteSearch(event.target.value)}
                />
                <button type="button" className="secondary-button schedule-search-button">
                  <Search size={15} strokeWidth={2.2} />
                  Pesquisar
                </button>
              </div>
            </div>

            <div className="registered-launches-table-wrap">
              <table className="registered-launches-table manifest-cte-table">
                <thead>
                  <tr>
                    <th>CTE</th>
                    <th>Emissor</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Peso</th>
                    <th>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCtes.map((cte) => {
                    const selected = selectedCteIds.includes(cte.id);

                    return (
                      <tr key={cte.id}>
                        <td><strong>{cte.id}</strong><span>{cte.number}</span></td>
                        <td>{cte.issuer}</td>
                        <td>{cte.origin}</td>
                        <td>{cte.destination}</td>
                        <td>{formatWeight(cte.cargoWeight)}</td>
                        <td>{currency(cte.cargoValue)}</td>
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Anexar CTE"
                            title="Anexar CTE"
                            disabled={selected}
                            onClick={() => addCte(cte)}
                          >
                            <Plus size={16} strokeWidth={2.2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!filteredCtes.length && <div className="empty-list">Nenhum CTE em aberto encontrado</div>}
            </div>
          </section>

          <section className="selection-panel selected-panel" aria-labelledby="manifest-selected-title">
            <div className="selection-panel-header">
              <h2 id="manifest-selected-title">CTEs anexados</h2>
              <strong>{currency(selectedValue)}</strong>
            </div>

            <div className="selected-list-box">
              {selectedCtes.map((cte) => (
                <div className="selected-launch-row" key={cte.id}>
                  <div>
                    <strong>{cte.id}</strong>
                    <span>{cte.origin} - {cte.destination}</span>
                  </div>
                  <div className="settlement-value-stack">
                    <span>{formatWeight(cte.cargoWeight)}</span>
                    <strong>{currency(cte.cargoValue)}</strong>
                  </div>
                  <button
                    type="button"
                    className="mini-remove-button"
                    aria-label="Remover CTE"
                    onClick={() => removeCte(cte.id)}
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              {!selectedCtes.length && <div className="empty-list">Nenhum CTE anexado</div>}
            </div>

            <div className="manifest-selected-summary">
              <span>Peso total: {formatWeight(selectedWeight)}</span>
              <span>Valor total: {currency(selectedValue)}</span>
            </div>
          </section>
        </div>

        <div className="form-grid manifest-details-grid">
          <label className="field">
            <span>Origem</span>
            <select value={origin} onChange={(event) => setOrigin(event.target.value)} required>
              <option value="">Selecione a cidade de origem</option>
              {originOptions.map((city) => (
                <option value={city} key={`origin-${city}`}>{city}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Destino</span>
            <select value={destination} onChange={(event) => setDestination(event.target.value)} required>
              <option value="">Selecione a cidade de destino</option>
              {destinationOptions.map((city) => (
                <option value={city} key={`destination-${city}`}>{city}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Placa do cavalo</span>
            <input type="text" placeholder="ABC1D23" value={truckPlate} onChange={(event) => setTruckPlate(event.target.value.toUpperCase())} required />
          </label>

          <label className="field">
            <span>Modelo do cavalo</span>
            <input type="text" placeholder="Modelo do cavalo" value={truckModel} onChange={(event) => setTruckModel(event.target.value)} required />
          </label>

          <label className="field">
            <span>CPF do motorista</span>
            <input type="text" placeholder="000.000.000-00" value={driverCpf} onChange={(event) => setDriverCpf(event.target.value)} required />
          </label>

          <label className="field">
            <span>Nome do motorista</span>
            <input type="text" placeholder="Nome completo" value={driverName} onChange={(event) => setDriverName(event.target.value)} required />
          </label>

          <label className="field">
            <span>Peso da carga</span>
            <input type="number" min="0" step="0.01" placeholder="kg" value={cargoWeight} onChange={(event) => setCargoWeight(event.target.value)} required />
          </label>

          <label className="field">
            <span>Valor da carga</span>
            <input type="number" min="0" step="0.01" placeholder="0,00" value={cargoValue} onChange={(event) => setCargoValue(event.target.value)} required />
          </label>

          <label className="field">
            <span>Seguro</span>
            <select value={hasInsurance} onChange={(event) => setHasInsurance(event.target.value)}>
              <option>Nao</option>
              <option>Sim</option>
            </select>
          </label>

          {hasInsurance === 'Sim' && (
            <>
              <label className="field">
                <span>Seguradora</span>
                <input type="text" placeholder="Nome da seguradora" value={insuranceCompany} onChange={(event) => setInsuranceCompany(event.target.value)} required />
              </label>

              <label className="field">
                <span>Apolice</span>
                <input type="text" placeholder="Numero da apolice" value={insurancePolicy} onChange={(event) => setInsurancePolicy(event.target.value)} required />
              </label>
            </>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Lançar manifesto</button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>
    </section>
  );
}
