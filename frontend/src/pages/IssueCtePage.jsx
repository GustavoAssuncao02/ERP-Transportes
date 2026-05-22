import { useEffect, useMemo, useState } from 'react';
import { FilePlus, Plus, Search, Trash2, X } from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel.jsx';
import ReportPanel from '../components/ReportPanel.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { businessUnits, currency, normalizeText } from '../data/financeData.js';
import { getCteDeletionBlockers } from '../data/deletionRules.js';
import { getDefaultInsurance } from '../data/managementRegistry.js';
import {
  deactivateCte,
  deleteCte,
  getRegisteredCtes,
  saveCte,
} from '../data/operationRegistry.js';
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
import { fetchCityOptions, initialCityOptions } from '../utils/cities.js';
import { formatReportDateTime, isDateInRange, isReportOptionSelected, reportSelectionLabel, uniqueSortedOptions } from '../utils/report.js';

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
const cteReportBaseFilters = {
  cteIds: [],
  periodField: 'issueDateTime',
  periodStart: '',
  periodEnd: '',
  unit: '',
  status: '',
  origin: [],
  destination: [],
  driver: [],
  vehicle: [],
  insuranceCompany: [],
};

const cteReportColumns = [
  { key: 'id', label: 'CT-e', pdfWidth: 18, getValue: (cte) => cte.id, render: (cte) => <strong>{cte.id}</strong> },
  { key: 'issuer', label: 'Emissor', pdfWidth: 24, getValue: (cte) => cte.issuer },
  { key: 'origin', label: 'Origem', pdfWidth: 18, getValue: (cte) => cte.origin },
  { key: 'destination', label: 'Destino', pdfWidth: 18, getValue: (cte) => cte.destination },
  { key: 'driverName', label: 'Motorista', pdfWidth: 20, getValue: (cte) => cte.driverName || '-' },
  { key: 'vehiclePlate', label: 'Placa', pdfWidth: 8, getValue: (cte) => cte.vehiclePlate || '-' },
  { key: 'status', label: 'Status', pdfWidth: 9, getValue: (cte) => cte.status },
  { key: 'issueDateTime', label: 'Emissao', pdfWidth: 16, getValue: (cte) => formatReportDateTime(cte.issueDateTime || cte.createdAt) },
  { key: 'cargoWeight', label: 'Peso', pdfWidth: 10, getValue: (cte) => `${Number(cte.cargoWeight || 0).toLocaleString('pt-BR')} kg` },
  { key: 'cargoValue', label: 'Valor', pdfWidth: 12, getValue: (cte) => currency(cte.cargoValue) },
];

function reportFilterLabel(value, allLabel = 'Todos') {
  return value || allLabel;
}

function cteReportOption(cte) {
  return {
    value: cte.id,
    label: cte.id,
    meta: {
      emissor: cte.issuer || '-',
      status: cte.status || '-',
      placa: cte.vehiclePlate || '-',
    },
    searchText: [cte.id, cte.number, cte.issuer, cte.origin, cte.destination, cte.driverName, cte.vehiclePlate, cte.status].join(' '),
  };
}

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

function defaultCteInsurance() {
  const insurance = getDefaultInsurance();

  return {
    company: insurance?.companyName || '',
    policy: insurance?.policyNumber || '',
    endorsement: insurance?.endorsementNumber || '',
  };
}

export default function IssueCtePage({ onNavigate, initialSavedQuery = null, onSavedQueriesChange }) {
  const [ctes, setCtes] = useState(getRegisteredCtes);
  const [cteNumber, setCteNumber] = useState('');
  const [cteLookupOpen, setCteLookupOpen] = useState(false);
  const [cteSearch, setCteSearch] = useState('');
  const [unit, setUnit] = useState('001');
  const [cities, setCities] = useState(initialCityOptions);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [driverLookupOpen, setDriverLookupOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [cargoDocuments, setCargoDocuments] = useState([newFiscalDocument()]);
  const [cargoWeight, setCargoWeight] = useState('');
  const [cargoValue, setCargoValue] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState(() => defaultCteInsurance().company);
  const [insurancePolicy, setInsurancePolicy] = useState(() => defaultCteInsurance().policy);
  const [insuranceEndorsement, setInsuranceEndorsement] = useState(() => defaultCteInsurance().endorsement);
  const [mdfeAccessKey, setMdfeAccessKey] = useState('');
  const [issueDateTime, setIssueDateTime] = useState(localDateTimeValue());
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [damdfeAttachments, setDamdfeAttachments] = useState([]);
  const [cteStatus, setCteStatus] = useState('Aberto');
  const [status, setStatus] = useAutoClearMessage();

  useEffect(() => {
    let ignore = false;

    async function loadCities() {
      try {
        const nextCities = await fetchCityOptions();

        if (!ignore) {
          setCities(nextCities);
        }
      } catch {
        if (!ignore) {
          setCities(initialCityOptions());
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
  const filteredCtes = useMemo(() => {
    const query = normalizeText(cteSearch);
    const sortedCtes = [...ctes].sort((left, right) => right.id.localeCompare(left.id, 'pt-BR'));
    if (!query) return sortedCtes;

    return sortedCtes.filter((cte) => (
      normalizeText(`${cte.id} ${cte.number} ${cte.issuer} ${cte.origin} ${cte.destination} ${cte.driverName} ${cte.vehiclePlate} ${cte.status}`).includes(query)
    ));
  }, [cteSearch, ctes]);
  const cteReportOptions = useMemo(
    () => [...ctes]
      .sort((left, right) => String(right.issueDateTime || right.createdAt || right.id).localeCompare(String(left.issueDateTime || left.createdAt || left.id)))
      .map(cteReportOption),
    [ctes],
  );
  const cteOriginOptions = useMemo(() => uniqueSortedOptions(ctes.map((cte) => cte.origin)), [ctes]);
  const cteDestinationOptions = useMemo(() => uniqueSortedOptions(ctes.map((cte) => cte.destination)), [ctes]);
  const cteDriverOptions = useMemo(() => uniqueSortedOptions(ctes.map((cte) => cte.driverName)), [ctes]);
  const cteVehicleOptions = useMemo(() => uniqueSortedOptions(ctes.map((cte) => cte.vehiclePlate)), [ctes]);
  const cteInsuranceOptions = useMemo(() => uniqueSortedOptions(ctes.map((cte) => cte.insuranceCompany)), [ctes]);
  const cteReportDefaultFilters = useMemo(() => ({
    ...cteReportBaseFilters,
    cteIds: cteReportOptions.map((option) => option.value),
    origin: cteOriginOptions,
    destination: cteDestinationOptions,
    driver: cteDriverOptions,
    vehicle: cteVehicleOptions,
    insuranceCompany: cteInsuranceOptions,
  }), [cteDestinationOptions, cteDriverOptions, cteInsuranceOptions, cteOriginOptions, cteReportOptions, cteVehicleOptions]);
  const cteReportFields = useMemo(() => [
    {
      type: 'lookupMulti',
      key: 'cteIds',
      label: 'CT-e',
      options: cteReportOptions,
      searchPlaceholder: 'Pesquisar CT-e',
      columns: [
        { key: 'emissor', label: 'Emissor' },
        { key: 'status', label: 'Status' },
        { key: 'placa', label: 'Placa' },
      ],
    },
    { type: 'select', key: 'unit', label: 'Unidade', options: businessUnits.map((businessUnit) => ({ value: businessUnit.value, label: businessUnit.label })) },
    { type: 'select', key: 'status', label: 'Status', options: uniqueSortedOptions(ctes.map((cte) => cte.status)) },
    { type: 'lookupMulti', key: 'origin', label: 'Origem', options: cteOriginOptions, searchPlaceholder: 'Pesquisar origem' },
    { type: 'lookupMulti', key: 'destination', label: 'Destino', options: cteDestinationOptions, searchPlaceholder: 'Pesquisar destino' },
    { type: 'lookupMulti', key: 'driver', label: 'Motorista', options: cteDriverOptions, searchPlaceholder: 'Pesquisar motorista' },
    { type: 'lookupMulti', key: 'vehicle', label: 'Placa', options: cteVehicleOptions, searchPlaceholder: 'Pesquisar placa' },
    { type: 'lookupMulti', key: 'insuranceCompany', label: 'Seguradora', options: cteInsuranceOptions, searchPlaceholder: 'Pesquisar seguradora' },
    {
      type: 'dateRange',
      key: 'period',
      label: 'Periodo',
      fieldKey: 'periodField',
      startKey: 'periodStart',
      endKey: 'periodEnd',
      options: [
        { value: 'issueDateTime', label: 'Emissao' },
        { value: 'createdAt', label: 'Cadastro' },
      ],
    },
  ], [cteDestinationOptions, cteDriverOptions, cteInsuranceOptions, cteOriginOptions, cteReportOptions, cteVehicleOptions, ctes]);

  function buildCteReportRows(filters) {
    return [...ctes]
      .sort((left, right) => String(right.issueDateTime || right.createdAt || right.id).localeCompare(String(left.issueDateTime || left.createdAt || left.id)))
      .filter((cte) => {
        const periodValue = filters.periodField === 'createdAt' ? cte.createdAt : cte.issueDateTime || cte.createdAt;

        return isReportOptionSelected(cte.id, filters.cteIds)
          && (!filters.unit || cte.unit === filters.unit)
          && (!filters.status || cte.status === filters.status)
          && isReportOptionSelected(cte.origin, filters.origin)
          && isReportOptionSelected(cte.destination, filters.destination)
          && isReportOptionSelected(cte.driverName, filters.driver)
          && isReportOptionSelected(cte.vehiclePlate, filters.vehicle)
          && isReportOptionSelected(cte.insuranceCompany, filters.insuranceCompany)
          && isDateInRange(periodValue, filters.periodStart, filters.periodEnd);
      });
  }

  function cteReportMetadata(filters, rows) {
    const periodOption = cteReportFields
      .find((field) => field.type === 'dateRange')
      ?.options.find((option) => option.value === filters.periodField);

    return [
      ['CT-e', reportSelectionLabel(filters.cteIds, cteReportOptions)],
      ['Unidade', reportFilterLabel(filters.unit)],
      ['Status', reportFilterLabel(filters.status)],
      ['Origem', reportSelectionLabel(filters.origin, cteOriginOptions)],
      ['Destino', reportSelectionLabel(filters.destination, cteDestinationOptions)],
      ['Motorista', reportSelectionLabel(filters.driver, cteDriverOptions)],
      ['Placa', reportSelectionLabel(filters.vehicle, cteVehicleOptions)],
      ['Seguradora', reportSelectionLabel(filters.insuranceCompany, cteInsuranceOptions)],
      ['Periodo por', periodOption?.label || 'Emissao'],
      ['Periodo de', reportFilterLabel(filters.periodStart)],
      ['Periodo ate', reportFilterLabel(filters.periodEnd)],
      ['Resultado', `${rows.length} CT-e(s)`],
    ];
  }

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

  function loadCte(cte) {
    setCteNumber(cte.id || '');
    setUnit(cte.unit || '001');
    setOrigin(cte.origin || '');
    setDestination(cte.destination || '');
    setTruckPlate(normalizePlate(cte.vehiclePlate || cte.truckPlate || ''));
    setDriverCpf(formatCpf(cte.driverCpf || ''));
    setCargoDocuments(cte.cargoDocuments?.length ? cte.cargoDocuments : [{ ...newFiscalDocument(), number: cte.linkedInvoice || cte.number || cte.id }]);
    setCargoWeight(String(cte.cargoWeight || ''));
    setCargoValue(String(cte.cargoValue || ''));
    setInsuranceCompany(cte.insuranceCompany || '');
    setInsurancePolicy(cte.insurancePolicy || '');
    setInsuranceEndorsement(cte.insuranceEndorsement || '');
    setMdfeAccessKey(cte.mdfeAccessKey || '');
    setIssueDateTime(cte.issueDateTime || localDateTimeValue());
    setQrCodeValue(cte.qrCodeValue || '');
    setDamdfeAttachments(cte.damdfeAttachments || []);
    setCteStatus(cte.status || 'Aberto');
    setStatus(`CT-e ${cte.id} carregado para edicao`);
  }

  function handleCteNumberChange(value) {
    const nextNumber = value.toUpperCase();
    setCteNumber(nextNumber);

    const existingCte = ctes.find((cte) => normalizeText(cte.id) === normalizeText(nextNumber));
    if (existingCte) {
      loadCte(existingCte);
      return;
    }

    setStatus('');
  }

  function openCteLookup() {
    setCteLookupOpen(true);
    setCteSearch('');
  }

  function closeCteLookup() {
    setCteLookupOpen(false);
    setCteSearch('');
  }

  function selectCte(cte) {
    loadCte(cte);
    closeCteLookup();
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

    const generatedCteNumber = cteNumber.trim().toUpperCase() || nextCteNumber();
    const selectedUnit = businessUnits.find((businessUnit) => businessUnit.value === unit);
    const nextCte = {
      id: generatedCteNumber,
      number: generatedCteNumber,
      unit,
      issuer: selectedUnit?.name || unit,
      origin,
      destination,
      cargoDocuments,
      cargoWeight,
      cargoValue,
      insuranceCompany,
      insurancePolicy,
      insuranceEndorsement,
      mdfeAccessKey,
      issueDateTime,
      qrCodeValue,
      damdfeAttachments,
      status: cteStatus,
      vehiclePlate: normalizePlate(truckPlate),
      vehicleModel: vehicle.model,
      driverCpf: onlyDigits(driverCpf),
      driverName: driver.name,
    };
    const nextCtes = saveCte(nextCte);

    setCtes(nextCtes);
    setCteNumber(generatedCteNumber);
    setStatus(`CT-e ${generatedCteNumber} emitido com ${filledFiscalDocuments.length} documento(s) fiscal(is)`);
  }

  function handleReset() {
    const insurance = defaultCteInsurance();

    setCteNumber('');
    setCteLookupOpen(false);
    setCteSearch('');
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
    setInsuranceCompany(insurance.company);
    setInsurancePolicy(insurance.policy);
    setInsuranceEndorsement(insurance.endorsement);
    setMdfeAccessKey('');
    setIssueDateTime(localDateTimeValue());
    setQrCodeValue('');
    setDamdfeAttachments([]);
    setCteStatus('Aberto');
    setStatus('');
  }

  function handleDeleteCte() {
    const currentCte = ctes.find((cte) => normalizeText(cte.id) === normalizeText(cteNumber));

    if (!currentCte) {
      setStatus('Selecione um CT-e cadastrado para excluir');
      return;
    }

    const blockers = getCteDeletionBlockers(currentCte);

    if (blockers.length) {
      const nextCtes = deactivateCte(currentCte.id);
      const inactiveCte = nextCtes.find((cte) => cte.id === currentCte.id);
      setCtes(nextCtes);
      setCteStatus('Cancelado');
      if (inactiveCte) loadCte(inactiveCte);
      setStatus(`CT-e possui vinculo em ${blockers.join(', ')} e foi cancelado`);
      return;
    }

    const nextCtes = deleteCte(currentCte.id);
    setCtes(nextCtes);
    handleReset();
    setStatus(`CT-e ${currentCte.id} excluido`);
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
          <div className="field">
            <span>Numero do CT-e</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="Gerado ao emitir ou informe um CT-e"
                value={cteNumber}
                onChange={(event) => handleCteNumberChange(event.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar CT-e"
                title="Pesquisar CT-e"
                tabIndex={-1}
                onClick={openCteLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

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

          <label className="field">
            <span>Status do CT-e</span>
            <select value={cteStatus} onChange={(event) => setCteStatus(event.target.value)} required>
              <option>Aberto</option>
              <option>Emitido</option>
              <option>Cancelado</option>
            </select>
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
          <button type="button" className="danger-button" onClick={handleDeleteCte}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir CT-e
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>

      <ReportPanel
        title="Relatorio de CT-e"
        titleId="cte-report-title"
        pageId="issue-cte"
        reportType="cte-report"
        module="Operacao"
        icon="operation"
        defaultFilters={cteReportDefaultFilters}
        fields={cteReportFields}
        columns={cteReportColumns}
        buildRows={buildCteReportRows}
        filenamePrefix="relatorio-cte"
        initialSavedQuery={initialSavedQuery}
        onSavedQueriesChange={onSavedQueriesChange}
        getSummary={(rows) => `${rows.length} CT-e(s)`}
        getMetadata={cteReportMetadata}
        getRowKey={(cte) => cte.id}
      />

      {cteLookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="issue-cte-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeCteLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="issue-cte-lookup-title">Pesquisar CT-e</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeCteLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por CT-e, emissor, origem, destino, motorista ou placa"
                value={cteSearch}
                onChange={(event) => setCteSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>CT-e</th>
                    <th>Emissor</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCtes.map((cte) => (
                    <tr key={cte.id} onClick={() => selectCte(cte)}>
                      <td>{cte.id}</td>
                      <td>{cte.issuer}</td>
                      <td>{cte.origin}</td>
                      <td>{cte.destination}</td>
                      <td>{cte.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filteredCtes.length && <div className="lookup-empty">Nenhuma opcao encontrada</div>}
            </div>
          </div>
        </div>
      )}

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
