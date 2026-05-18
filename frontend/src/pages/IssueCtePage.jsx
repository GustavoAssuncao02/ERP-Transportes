import { useEffect, useMemo, useState } from 'react';
import { FilePlus, Plus, Search, X } from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { businessUnits, currency, normalizeText } from '../data/financeData.js';
import {
  findDriverByCpf,
  findVehicleByPlate,
  formatCpf,
  getRegisteredDrivers,
  normalizePlate,
  onlyDigits,
  pendingDriverCpfKey,
  pendingVehiclePlateKey,
} from '../data/transportRegistry.js';

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

function localDateTimeValue() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function nextCteNumber() {
  const now = new Date();
  const key = 'cteSequence';
  let sequence = 1;

  try {
    sequence = Number.parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(sequence));
  } catch {
    sequence = now.getTime() % 100000;
  }

  return `CTE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(5, '0')}`;
}

function newFiscalDocument() {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: 'NF-e',
    number: '',
  };
}

export default function IssueCtePage({ onNavigate }) {
  const [unit, setUnit] = useState('001');
  const [cities, setCities] = useState(fallbackCities);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [driverLookupOpen, setDriverLookupOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [cargoDocuments, setCargoDocuments] = useState([newFiscalDocument()]);
  const [cargoWeight, setCargoWeight] = useState('');
  const [cargoValue, setCargoValue] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [insuranceEndorsement, setInsuranceEndorsement] = useState('');
  const [mdfeAccessKey, setMdfeAccessKey] = useState('');
  const [issueDateTime, setIssueDateTime] = useState(localDateTimeValue());
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [damdfeAttachments, setDamdfeAttachments] = useState([]);
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

  const vehicle = useMemo(() => findVehicleByPlate(truckPlate), [truckPlate]);
  const driver = useMemo(() => findDriverByCpf(driverCpf), [driverCpf]);
  const plateIsComplete = normalizePlate(truckPlate).length === 7;
  const cpfIsComplete = onlyDigits(driverCpf).length === 11;
  const filledFiscalDocuments = cargoDocuments.filter((document) => document.number.trim());
  const originOptions = origin && !cities.includes(origin) ? [origin, ...cities] : cities;
  const destinationOptions = destination && !cities.includes(destination) ? [destination, ...cities] : cities;
  const driverOptions = useMemo(
    () => [...getRegisteredDrivers()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [],
  );
  const filteredDrivers = useMemo(() => {
    const query = normalizeText(driverSearch);
    if (!query) return driverOptions;

    return driverOptions.filter((driverOption) => (
      normalizeText(`${driverOption.name} ${formatCpf(driverOption.cpf)} ${driverOption.cnh} ${driverOption.phone} ${driverOption.status}`).includes(query)
    ));
  }, [driverOptions, driverSearch]);

  function openVehicleRegistration() {
    try {
      localStorage.setItem(pendingVehiclePlateKey, normalizePlate(truckPlate));
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }

    onNavigate?.({ pageId: 'vehicle-registration', label: 'Cadastrar Veículo' });
  }

  function openDriverRegistration() {
    try {
      localStorage.setItem(pendingDriverCpfKey, onlyDigits(driverCpf));
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }

    onNavigate?.({ pageId: 'driver-registration', label: 'Cadastrar Motorista' });
  }

  function updateFiscalDocument(documentId, field, value) {
    setCargoDocuments((currentDocuments) => currentDocuments.map((document) => (
      document.id === documentId ? { ...document, [field]: value } : document
    )));
  }

  function addFiscalDocument() {
    setCargoDocuments((currentDocuments) => [...currentDocuments, newFiscalDocument()]);
  }

  function removeFiscalDocument(documentId) {
    setCargoDocuments((currentDocuments) => (
      currentDocuments.length === 1 ? currentDocuments : currentDocuments.filter((document) => document.id !== documentId)
    ));
  }

  function handleTruckPlateChange(value) {
    setTruckPlate(normalizePlate(value));
    setStatus('');
  }

  function handleDriverCpfChange(value) {
    setDriverCpf(formatCpf(value));
    setStatus('');
  }

  function openDriverLookup() {
    setDriverLookupOpen(true);
    setDriverSearch('');
  }

  function closeDriverLookup() {
    setDriverLookupOpen(false);
    setDriverSearch('');
  }

  function selectDriver(driverOption) {
    setDriverCpf(formatCpf(driverOption.cpf));
    setStatus(`Motorista ${driverOption.name} selecionado`);
    closeDriverLookup();
  }

  function handleVehicleLookup() {
    if (!plateIsComplete) {
      setStatus('Informe a placa completa do veículo');
      return;
    }

    setStatus(vehicle ? `Veículo ${vehicle.plate} localizado` : 'Veículo não cadastrado');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!vehicle) {
      setStatus('Cadastre o veículo antes de emitir o CT-e');
      return;
    }

    if (!driver) {
      setStatus('Cadastre o motorista antes de emitir o CT-e');
      return;
    }

    if (!filledFiscalDocuments.length) {
      setStatus('Informe pelo menos um documento fiscal da carga');
      return;
    }

    const cteNumber = nextCteNumber();
    setStatus(`CT-e ${cteNumber} emitido com ${filledFiscalDocuments.length} documento(s) fiscal(is)`);
  }

  function handleReset() {
    setUnit('001');
    setOrigin('');
    setDestination('');
    setTruckPlate('');
    setDriverCpf('');
    setDriverLookupOpen(false);
    setDriverSearch('');
    setCargoDocuments([newFiscalDocument()]);
    setCargoWeight('');
    setCargoValue('');
    setInsuranceCompany('');
    setInsurancePolicy('');
    setInsuranceEndorsement('');
    setMdfeAccessKey('');
    setIssueDateTime(localDateTimeValue());
    setQrCodeValue('');
    setDamdfeAttachments([]);
    setStatus('');
  }

  return (
    <section className="issue-cte-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Emitir CT-e</h1>
          <p className="page-kicker">Emissão operacional com validação de veículo, motorista e documentos fiscais</p>
        </div>
      </header>

      <form className="finance-form issue-cte-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value)} required>
              {businessUnits.map((businessUnit) => (
                <option value={businessUnit.value} key={businessUnit.value}>{businessUnit.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Estado/cidade de origem</span>
            <select value={origin} onChange={(event) => setOrigin(event.target.value)} required>
              <option value="">Selecione a origem</option>
              {originOptions.map((city) => (
                <option value={city} key={`origin-${city}`}>{city}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Estado/cidade de destino</span>
            <select value={destination} onChange={(event) => setDestination(event.target.value)} required>
              <option value="">Selecione o destino</option>
              {destinationOptions.map((city) => (
                <option value={city} key={`destination-${city}`}>{city}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Data e hora de emissão</span>
            <input type="datetime-local" value={issueDateTime} onChange={(event) => setIssueDateTime(event.target.value)} required />
          </label>

          <div className="form-section-title field--span-4">Veículo e motorista</div>

          <div className="field">
            <span>Placa do veículo</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="ABC1D23"
                value={truckPlate}
                onChange={(event) => handleTruckPlateChange(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Consultar veículo"
                title="Consultar veículo"
                tabIndex={-1}
                onClick={handleVehicleLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Modelo do veículo</span>
            <input type="text" value={vehicle?.model || ''} placeholder="Preenchido pela placa" readOnly tabIndex={-1} />
          </label>

          <div className="field">
            <span>CPF do motorista</span>
            <div className="lookup-field">
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={driverCpf}
                onChange={(event) => handleDriverCpfChange(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar motorista"
                title="Pesquisar motorista"
                tabIndex={-1}
                onClick={openDriverLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Nome do motorista</span>
            <input type="text" value={driver?.name || ''} placeholder="Preenchido pelo CPF" readOnly tabIndex={-1} />
          </label>

          {plateIsComplete && !vehicle && (
            <div className="lookup-status field--span-2">
              <span>Veículo não cadastrado.</span>
              <button type="button" className="secondary-button" onClick={openVehicleRegistration}>Cadastrar veículo</button>
            </div>
          )}

          {cpfIsComplete && !driver && (
            <div className="lookup-status field--span-2">
              <span>Motorista não cadastrado.</span>
              <button type="button" className="secondary-button" onClick={openDriverRegistration}>Cadastrar motorista</button>
            </div>
          )}

          <div className="form-section-title field--span-4">Carga e documentos fiscais</div>

          <section className="fiscal-documents-panel field--span-4" aria-labelledby="fiscal-documents-title">
            <div className="fiscal-documents-header">
              <h2 id="fiscal-documents-title">Documentos da carga</h2>
              <button type="button" className="secondary-button" onClick={addFiscalDocument}>
                <Plus size={15} strokeWidth={2.2} />
                Adicionar NF-e
              </button>
            </div>

            <div className="fiscal-document-list">
              {cargoDocuments.map((document, index) => (
                <div className="fiscal-document-row" key={document.id}>
                  <label className="field">
                    <span>Tipo</span>
                    <select value={document.type} onChange={(event) => updateFiscalDocument(document.id, 'type', event.target.value)}>
                      <option>NF-e</option>
                      <option>CT-e complementar</option>
                      <option>Outro documento fiscal</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Chave ou número do documento</span>
                    <input
                      type="text"
                      placeholder={`Documento fiscal ${index + 1}`}
                      value={document.number}
                      onChange={(event) => updateFiscalDocument(document.id, 'number', event.target.value)}
                      required={index === 0}
                    />
                  </label>

                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remover documento fiscal"
                    title="Remover documento fiscal"
                    disabled={cargoDocuments.length === 1}
                    onClick={() => removeFiscalDocument(document.id)}
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <label className="field">
            <span>Peso total da carga</span>
            <input type="number" min="0" step="0.01" placeholder="kg" value={cargoWeight} onChange={(event) => setCargoWeight(event.target.value)} required />
          </label>

          <label className="field">
            <span>Valor total da carga</span>
            <input type="number" min="0" step="0.01" placeholder="0,00" value={cargoValue} onChange={(event) => setCargoValue(event.target.value)} required />
          </label>

          <label className="field">
            <span>Quantidade de documentos fiscais</span>
            <input type="number" value={filledFiscalDocuments.length} readOnly tabIndex={-1} />
          </label>

          <label className="field">
            <span>Total declarado</span>
            <input type="text" value={currency(cargoValue)} readOnly tabIndex={-1} />
          </label>

          <div className="form-section-title field--span-4">Dados do seguro e MDF-e</div>

          <label className="field">
            <span>Seguradora</span>
            <input type="text" placeholder="Nome da seguradora" value={insuranceCompany} onChange={(event) => setInsuranceCompany(event.target.value)} required />
          </label>

          <label className="field">
            <span>Apólice</span>
            <input type="text" placeholder="Número da apólice" value={insurancePolicy} onChange={(event) => setInsurancePolicy(event.target.value)} required />
          </label>

          <label className="field">
            <span>Averbação</span>
            <input type="text" placeholder="Número de averbação" value={insuranceEndorsement} onChange={(event) => setInsuranceEndorsement(event.target.value)} />
          </label>

          <label className="field">
            <span>Chave de acesso do MDF-e</span>
            <input type="text" inputMode="numeric" maxLength="44" placeholder="44 dígitos" value={mdfeAccessKey} onChange={(event) => setMdfeAccessKey(event.target.value)} required />
          </label>

          <label className="field field--span-4">
            <span>QR Code / DAMDFe</span>
            <textarea placeholder="URL ou chave do QR Code do DAMDFe" value={qrCodeValue} onChange={(event) => setQrCodeValue(event.target.value)} required />
          </label>
        </div>

        <AttachmentPanel attachments={damdfeAttachments} onAddFiles={(files) => setDamdfeAttachments((current) => [...current, ...files])} />

        <div className="form-actions">
          <button type="submit" className="primary-button">
            <FilePlus size={15} strokeWidth={2.2} />
            Emitir CT-e
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>

      {driverLookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="issue-cte-driver-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeDriverLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="issue-cte-driver-lookup-title">Pesquisar motorista</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeDriverLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por nome, CPF, CNH ou telefone"
                value={driverSearch}
                onChange={(event) => setDriverSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>CPF</th>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>CNH</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driverOption) => (
                    <tr key={driverOption.cpf} onClick={() => selectDriver(driverOption)}>
                      <td>{formatCpf(driverOption.cpf)}</td>
                      <td>{driverOption.name}</td>
                      <td>{driverOption.phone}</td>
                      <td>{driverOption.cnh} / {driverOption.category}</td>
                      <td>{driverOption.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filteredDrivers.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
