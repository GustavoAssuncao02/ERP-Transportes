import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { businessUnits, currency, normalizeText } from '../data/financeData.js';
import { getManifestDeletionBlockers } from '../data/deletionRules.js';
import { getDefaultInsurance } from '../data/managementRegistry.js';
import {
  deactivateManifest,
  deleteManifest,
  getRegisteredCtes,
  getRegisteredManifests,
  pendingManifestIdKey,
  saveManifest,
} from '../data/operationRegistry.js';
import { identifierNumberValue, sortTableRows } from '../utils/tableSort.js';

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
    issuer: 'JTD Logística Nordeste',
    origin: 'Camaçari - BA',
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
    destination: 'Maceió - AL',
    cargoWeight: 15300,
    cargoValue: 206900,
    status: 'Aberto',
  },
  {
    id: 'CTE-202605-00004',
    number: '351605000004',
    issuer: 'JTD Armazéns Salvador',
    origin: 'Salvador - BA',
    destination: 'Recife - PE',
    cargoWeight: 11100,
    cargoValue: 158750,
    status: 'Aberto',
  },
];

const manifestCteSortColumns = [
  { key: 'id', label: 'CT-e', type: 'number', defaultDirection: 'asc', getValue: (cte) => identifierNumberValue(cte.id) },
  { key: 'issuer', label: 'Emissor', type: 'text', getValue: (cte) => cte.issuer },
  { key: 'origin', label: 'Origem', type: 'text', getValue: (cte) => cte.origin },
  { key: 'destination', label: 'Destino', type: 'text', getValue: (cte) => cte.destination },
  { key: 'cargoWeight', label: 'Peso', type: 'number', getValue: (cte) => cte.cargoWeight },
  { key: 'cargoValue', label: 'Valor', type: 'number', getValue: (cte) => cte.cargoValue },
  { key: 'actions', label: '', sortable: false },
];

const manifestStorageKey = 'transportManifests';

const manifestTypeOptions = [
  'Manifesto de Controle',
  'Manifesto de Trânsito',
];

const defaultManifests = [
  {
    id: 'MDFE-202605-00001',
    unit: '001',
    selectedCteIds: ['CTE-202605-00001', 'CTE-202605-00002'],
    origin: 'Salvador - BA',
    destination: 'Feira de Santana - BA',
    truckPlate: 'ABC1D23',
    truckModel: 'Volvo FH 540',
    driverCpf: '529.982.247-25',
    driverName: 'João Pereira Santos',
    cargoWeight: '22000',
    cargoValue: '296800',
    hasInsurance: 'Sim',
    insuranceCompany: 'Seguradora Atlântica',
    insurancePolicy: 'AP-2026-00184',
    manifestType: 'Manifesto de Trânsito',
    createdAt: '2026-05-18T08:30',
  },
];

const cityApiUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';

const fallbackCities = [
  'Aracaju - SE',
  'Camaçari - BA',
  'Feira de Santana - BA',
  'Lauro de Freitas - BA',
  'Maceió - AL',
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

function dateDistance(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return Math.abs(date.getTime() - Date.now());
}

function dateTimeInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function readManifests() {
  try {
    const rawValue = localStorage.getItem(manifestStorageKey);
    if (rawValue !== null) {
      const stored = JSON.parse(rawValue);
      return Array.isArray(stored) ? stored : defaultManifests;
    }
  } catch {
    return defaultManifests;
  }

  return defaultManifests;
}

function writeManifests(manifests) {
  localStorage.setItem(manifestStorageKey, JSON.stringify(manifests));
}

function pendingManifestNumber() {
  try {
    return localStorage.getItem(pendingManifestIdKey) || '';
  } catch {
    return '';
  }
}

function defaultManifestInsurance() {
  const insurance = getDefaultInsurance();

  return {
    hasInsurance: insurance ? 'Sim' : 'Não',
    insuranceCompany: insurance?.companyName || '',
    insurancePolicy: insurance?.policyNumber || '',
  };
}

export default function GenerateManifestPage() {
  const [manifests, setManifests] = useState(getRegisteredManifests);
  const [ctes] = useState(getRegisteredCtes);
  const [unit, setUnit] = useState('001');
  const [manifestNumber, setManifestNumber] = useState(pendingManifestNumber);
  const [cities, setCities] = useState(fallbackCities);
  const [cteSearch, setCteSearch] = useState('');
  const [selectedCteIds, setSelectedCteIds] = useState([]);
  const [manifestLookupOpen, setManifestLookupOpen] = useState(false);
  const [manifestLookupSearch, setManifestLookupSearch] = useState('');
  const [cteSort, setCteSort] = useState({ key: 'id', direction: 'asc' });
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [truckModel, setTruckModel] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [driverName, setDriverName] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [cargoValue, setCargoValue] = useState('');
  const [hasInsurance, setHasInsurance] = useState(() => defaultManifestInsurance().hasInsurance);
  const [insuranceCompany, setInsuranceCompany] = useState(() => defaultManifestInsurance().insuranceCompany);
  const [insurancePolicy, setInsurancePolicy] = useState(() => defaultManifestInsurance().insurancePolicy);
  const [manifestType, setManifestType] = useState('Manifesto de Trânsito');
  const [manifestStatus, setManifestStatus] = useState('Emitido');
  const [startedAt, setStartedAt] = useState(() => dateTimeInputValue());
  const [closedAt, setClosedAt] = useState('');
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
    const availableCtes = ctes.filter((cte) => cte.status !== 'Cancelado');
    const filtered = query
      ? availableCtes.filter((cte) => normalizeText(`${cte.id} ${cte.number} ${cte.issuer} ${cte.origin} ${cte.destination}`).includes(query))
      : availableCtes;

    return sortTableRows(
      filtered,
      manifestCteSortColumns,
      cteSort,
      (left, right) => identifierNumberValue(left.id) - identifierNumberValue(right.id),
    );
  }, [cteSearch, cteSort, ctes]);

  const manifestsByClosestDate = useMemo(
    () => [...manifests].sort((left, right) => dateDistance(left.createdAt) - dateDistance(right.createdAt)),
    [manifests],
  );
  const manifestLookupItems = useMemo(() => {
    const query = normalizeText(manifestLookupSearch);
    if (!query) return manifestsByClosestDate;

    return manifestsByClosestDate.filter((manifest) => (
      normalizeText(`${manifest.id} ${manifest.manifestType} ${manifest.origin} ${manifest.destination} ${manifest.driverName} ${manifest.truckPlate}`).includes(query)
    ));
  }, [manifestLookupSearch, manifestsByClosestDate]);

  const selectedCtes = useMemo(
    () => ctes.filter((cte) => selectedCteIds.includes(cte.id)),
    [ctes, selectedCteIds],
  );
  const originOptions = origin && !cities.includes(origin) ? [origin, ...cities] : cities;
  const destinationOptions = destination && !cities.includes(destination) ? [destination, ...cities] : cities;

  const selectedWeight = selectedCtes.reduce((sum, cte) => sum + Number(cte.cargoWeight || 0), 0);
  const selectedValue = selectedCtes.reduce((sum, cte) => sum + Number(cte.cargoValue || 0), 0);

  function loadManifest(manifest) {
    setManifestNumber(manifest.id || '');
    setUnit(manifest.unit || '001');
    setSelectedCteIds(manifest.selectedCteIds || []);
    setOrigin(manifest.origin || '');
    setDestination(manifest.destination || '');
    setTruckPlate(manifest.truckPlate || '');
    setTruckModel(manifest.truckModel || '');
    setDriverCpf(manifest.driverCpf || '');
    setDriverName(manifest.driverName || '');
    setCargoWeight(manifest.cargoWeight || '');
    setCargoValue(manifest.cargoValue || '');
    setHasInsurance(manifest.hasInsurance || 'Não');
    setInsuranceCompany(manifest.insuranceCompany || '');
    setInsurancePolicy(manifest.insurancePolicy || '');
    setManifestType(manifest.manifestType || 'Manifesto de Trânsito');
    setManifestStatus(manifest.status || 'Emitido');
    setStartedAt(dateTimeInputValue(manifest.startedAt || manifest.createdAt || new Date()));
    setClosedAt(manifest.closedAt ? dateTimeInputValue(manifest.closedAt) : '');
    setStatus(`Manifesto ${manifest.id} carregado para edição`);
  }

  useEffect(() => {
    const pendingId = pendingManifestNumber();
    if (!pendingId) return;

    const manifest = manifests.find((item) => normalizeText(item.id) === normalizeText(pendingId));
    if (manifest) {
      loadManifest(manifest);
    }

    try {
      localStorage.removeItem(pendingManifestIdKey);
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }
  }, [manifests]);

  function handleManifestNumberChange(value) {
    const nextNumber = value.toUpperCase();
    setManifestNumber(nextNumber);

    const existingManifest = manifests.find((manifest) => normalizeText(manifest.id) === normalizeText(nextNumber));
    if (existingManifest) {
      loadManifest(existingManifest);
      return;
    }

    setStatus('');
  }

  function openManifestLookup() {
    setManifestLookupOpen(true);
    setManifestLookupSearch('');
  }

  function closeManifestLookup() {
    setManifestLookupOpen(false);
    setManifestLookupSearch('');
  }

  function selectManifest(manifest) {
    loadManifest(manifest);
    closeManifestLookup();
  }

  function addCte(cte) {
    setSelectedCteIds((current) => (current.includes(cte.id) ? current : [...current, cte.id]));
    setOrigin((current) => current || cte.origin);
    setDestination((current) => current || cte.destination);
    setCargoWeight((current) => current || String(cte.cargoWeight));
    setCargoValue((current) => current || String(cte.cargoValue));
    setStatus('CT-e anexado ao manifesto');
  }

  function handleInsuranceChange(value) {
    setHasInsurance(value);

    if (value === 'Sim' && (!insuranceCompany || !insurancePolicy)) {
      const insurance = defaultManifestInsurance();
      setInsuranceCompany((current) => current || insurance.insuranceCompany);
      setInsurancePolicy((current) => current || insurance.insurancePolicy);
    }
  }

  function removeCte(cteId) {
    setSelectedCteIds((current) => current.filter((id) => id !== cteId));
    setStatus('CT-e removido do manifesto');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedCtes.length) {
      setStatus('Anexe pelo menos um CT-e aberto ao manifesto');
      return;
    }

    const generatedManifestNumber = manifestNumber.trim().toUpperCase() || nextManifestNumber();
    const currentManifest = manifests.find((manifest) => normalizeText(manifest.id) === normalizeText(generatedManifestNumber));
    const nextStartedAt = startedAt || currentManifest?.startedAt || currentManifest?.createdAt || new Date().toISOString();
    const nextClosedAt = manifestStatus === 'Fechado' ? (closedAt || new Date().toISOString()) : closedAt;
    const nextManifest = {
      id: generatedManifestNumber,
      unit,
      selectedCteIds,
      origin,
      destination,
      truckPlate,
      truckModel,
      driverCpf,
      driverName,
      cargoWeight,
      cargoValue,
      hasInsurance,
      insuranceCompany,
      insurancePolicy,
      manifestType,
      status: manifestStatus,
      startedAt: nextStartedAt,
      closedAt: nextClosedAt,
      createdAt: currentManifest?.createdAt || nextStartedAt,
      updatedAt: new Date().toISOString(),
    };
    const nextManifests = saveManifest(nextManifest);
    setManifests(nextManifests);
    setManifestNumber(generatedManifestNumber);
    setStatus(`Manifesto ${generatedManifestNumber} lançado com ${selectedCtes.length} CT-e(s)`);
  }

  function handleReset() {
    const insurance = defaultManifestInsurance();

    setUnit('001');
    setManifestNumber('');
    setCteSearch('');
    setSelectedCteIds([]);
    setManifestLookupOpen(false);
    setManifestLookupSearch('');
    setOrigin('');
    setDestination('');
    setTruckPlate('');
    setTruckModel('');
    setDriverCpf('');
    setDriverName('');
    setCargoWeight('');
    setCargoValue('');
    setHasInsurance(insurance.hasInsurance);
    setInsuranceCompany(insurance.insuranceCompany);
    setInsurancePolicy(insurance.insurancePolicy);
    setManifestType('Manifesto de Trânsito');
    setManifestStatus('Emitido');
    setStartedAt(dateTimeInputValue());
    setClosedAt('');
    setStatus('');
  }

  function handleDeleteManifest() {
    const currentManifest = manifests.find((manifest) => normalizeText(manifest.id) === normalizeText(manifestNumber));

    if (!currentManifest) {
      setStatus('Selecione um manifesto cadastrado para excluir');
      return;
    }

    const blockers = getManifestDeletionBlockers(currentManifest);

    if (blockers.length) {
      const nextManifests = deactivateManifest(currentManifest.id);
      const inactiveManifest = nextManifests.find((manifest) => manifest.id === currentManifest.id);
      setManifests(nextManifests);
      setManifestStatus('Cancelado');
      if (inactiveManifest) loadManifest(inactiveManifest);
      setStatus(`Manifesto possui vinculo em ${blockers.join(', ')} e foi cancelado`);
      return;
    }

    const nextManifests = deleteManifest(currentManifest.id);
    setManifests(nextManifests);
    handleReset();
    setStatus(`Manifesto ${currentManifest.id} excluido`);
  }

  return (
    <section className="generate-manifest-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gerar Manifesto</h1>
          <p className="page-kicker">Lançamento de manifesto operacional com CT-e(s) em aberto</p>
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

          <div className="field">
            <span>Número do manifesto</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Gerado ao lançar ou informe um manifesto existente"
                value={manifestNumber}
                onChange={(event) => handleManifestNumberChange(event.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar manifesto"
                title="Pesquisar manifesto"
                tabIndex={-1}
                onClick={openManifestLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Tipo do manifesto</span>
            <select value={manifestType} onChange={(event) => setManifestType(event.target.value)}>
              {manifestTypeOptions.map((typeOption) => (
                <option value={typeOption} key={typeOption}>{typeOption}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status do manifesto</span>
            <select
              value={manifestStatus}
              onChange={(event) => {
                setManifestStatus(event.target.value);
                if (event.target.value !== 'Fechado') {
                  setClosedAt('');
                }
              }}
            >
              <option>Emitido</option>
              <option>Fechado</option>
              <option>Cancelado</option>
            </select>
          </label>

          <label className="field">
            <span>Inicio do manifesto</span>
            <input type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required />
          </label>

          <label className="field">
            <span>Fechamento do manifesto</span>
            <input
              type="datetime-local"
              value={closedAt}
              onChange={(event) => setClosedAt(event.target.value)}
              disabled={manifestStatus !== 'Fechado'}
              required={manifestStatus === 'Fechado'}
            />
          </label>
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
            <select value={hasInsurance} onChange={(event) => handleInsuranceChange(event.target.value)}>
              <option>Não</option>
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
                <span>Apólice</span>
                <input type="text" placeholder="Número da apólice" value={insurancePolicy} onChange={(event) => setInsurancePolicy(event.target.value)} required />
              </label>
            </>
          )}
        </div>

        <div className="schedule-layout manifest-cte-layout">
          <section className="registered-launches-panel" aria-labelledby="manifest-cte-title">
            <div className="registered-launches-header">
              <h2 id="manifest-cte-title">Anexar CT-e</h2>
              <div>
                <span>{filteredCtes.length} CT-e(s) em aberto</span>
                <strong>{currency(filteredCtes.reduce((sum, cte) => sum + Number(cte.cargoValue || 0), 0))}</strong>
              </div>
            </div>

            <div className="schedule-direct-search">
              <label htmlFor="manifest-cte-search">Consultar CT-e</label>
              <div>
                <input
                  id="manifest-cte-search"
                  type="search"
                  placeholder="Número, emissor, origem ou destino"
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
                    <SortableTableHeader
                      columns={manifestCteSortColumns}
                      sort={cteSort}
                      onSortChange={setCteSort}
                    />
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
                            aria-label="Anexar CT-e"
                            title="Anexar CT-e"
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

              {!filteredCtes.length && <div className="empty-list">Nenhum CT-e em aberto encontrado</div>}
            </div>
          </section>

          <section className="selection-panel selected-panel" aria-labelledby="manifest-selected-title">
            <div className="selection-panel-header">
              <h2 id="manifest-selected-title">CT-e(s) anexados</h2>
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
                    aria-label="Remover CT-e"
                    onClick={() => removeCte(cte.id)}
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              {!selectedCtes.length && <div className="empty-list">Nenhum CT-e anexado</div>}
            </div>

            <div className="manifest-selected-summary">
              <span>Peso total: {formatWeight(selectedWeight)}</span>
              <span>Valor total: {currency(selectedValue)}</span>
            </div>
          </section>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Lançar manifesto</button>
          <button type="button" className="danger-button" onClick={handleDeleteManifest}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir manifesto
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>

      {manifestLookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="manifest-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeManifestLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="manifest-lookup-title">Pesquisar manifesto</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeManifestLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por manifesto, origem, destino, motorista ou placa"
                value={manifestLookupSearch}
                onChange={(event) => setManifestLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>Manifesto</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Motorista</th>
                    <th>Placa</th>
                  </tr>
                </thead>
                <tbody>
                  {manifestLookupItems.map((manifest) => (
                    <tr key={manifest.id} onClick={() => selectManifest(manifest)}>
                      <td>{manifest.id}</td>
                      <td>{manifest.manifestType || 'Manifesto de Trânsito'}</td>
                      <td>{manifest.createdAt ? new Date(manifest.createdAt).toLocaleString('pt-BR') : ''}</td>
                      <td>{manifest.origin}</td>
                      <td>{manifest.destination}</td>
                      <td>{manifest.driverName}</td>
                      <td>{manifest.truckPlate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!manifestLookupItems.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
