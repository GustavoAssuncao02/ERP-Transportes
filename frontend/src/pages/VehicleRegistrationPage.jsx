import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import ReportPanel from '../components/ReportPanel.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { businessUnits, normalizeText } from '../data/financeData.js';
import { getRegisteredManifests } from '../data/operationRegistry.js';
import {
  deactivateVehicle,
  deleteVehicle,
  formatCpf,
  getRegisteredDrivers,
  findVehicleByPlate,
  getRegisteredVehicles,
  onlyDigits,
  normalizePlate,
  pendingVehiclePlateKey,
  saveVehicle,
} from '../data/transportRegistry.js';
import { getVehicleDeletionBlockers } from '../data/deletionRules.js';
import { formatReportDate, formatReportDateTime, isDateInRange, normalizeReportText, uniqueSortedOptions } from '../utils/report.js';
import { sortTableRows } from '../utils/tableSort.js';

const vehicleTypes = ['Cavalo mecânico', 'Truck', 'Toco', 'Bitruck', 'Van', 'Carreta'];

const vehicleReportDefaultFilters = {
  search: '',
  periodField: 'createdAt',
  periodStart: '',
  periodEnd: '',
  owner: '',
  type: '',
  status: '',
  unit: '',
};

function businessUnitOwnerLabel(unitCode) {
  const businessUnit = businessUnits.find((item) => item.value === unitCode);
  return businessUnit?.name || 'JTD Transportes LTDA';
}

function vehicleOwnerLabel(vehicle) {
  return vehicle.ownerType === 'driver'
    ? `Motorista - ${vehicle.owner || ''}`
    : `Empresa - ${vehicle.owner || businessUnitOwnerLabel(vehicle.unit)}`;
}

const vehicleReportColumns = [
  { key: 'plate', label: 'Placa', pdfWidth: 8, getValue: (vehicle) => vehicle.plate, render: (vehicle) => <strong>{vehicle.plate}</strong> },
  { key: 'model', label: 'Modelo', pdfWidth: 22, getValue: (vehicle) => vehicle.model },
  { key: 'type', label: 'Tipo', pdfWidth: 16, getValue: (vehicle) => vehicle.type },
  { key: 'owner', label: 'Proprietario', pdfWidth: 24, getValue: (vehicle) => vehicleOwnerLabel(vehicle) },
  { key: 'unit', label: 'Unid.', pdfWidth: 6, getValue: (vehicle) => vehicle.unit },
  { key: 'status', label: 'Status', pdfWidth: 9, getValue: (vehicle) => vehicle.status },
  { key: 'createdAt', label: 'Cadastro', pdfWidth: 10, getValue: (vehicle) => formatReportDate(vehicle.createdAt) },
  { key: 'lastManifestId', label: 'Ultimo manifesto', pdfWidth: 18, getValue: (vehicle) => vehicle.lastManifestId || '-' },
  { key: 'lastManifestDate', label: 'Ultima utiliz.', pdfWidth: 16, getValue: (vehicle) => formatReportDateTime(vehicle.lastManifestDate) },
  { key: 'lastManifestDriver', label: 'Motorista', pdfWidth: 20, getValue: (vehicle) => vehicle.lastManifestDriver || '-' },
];

function reportFilterLabel(value, allLabel = 'Todos') {
  return value || allLabel;
}

function dateTimeMs(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function manifestVehicleDate(manifest) {
  return manifest.startedAt || manifest.createdAt || manifest.updatedAt || manifest.closedAt || '';
}

function lastVehicleManifest(vehicle, manifests) {
  const plate = normalizePlate(vehicle.plate);

  return manifests
    .filter((manifest) => normalizePlate(manifest.truckPlate) === plate)
    .sort((left, right) => dateTimeMs(manifestVehicleDate(right)) - dateTimeMs(manifestVehicleDate(left)))[0] || null;
}

const vehicleSortColumns = [
  { key: 'plate', label: 'Placa', type: 'text', getValue: (vehicle) => vehicle.plate },
  { key: 'model', label: 'Modelo', type: 'text', getValue: (vehicle) => vehicle.model },
  { key: 'type', label: 'Tipo', type: 'text', getValue: (vehicle) => vehicle.type },
  { key: 'owner', label: 'Propriedade', type: 'text', getValue: (vehicle) => vehicleOwnerLabel(vehicle) },
  { key: 'unit', label: 'Unidade', type: 'text', getValue: (vehicle) => vehicle.unit },
  { key: 'status', label: 'Status', type: 'text', getValue: (vehicle) => vehicle.status },
];

function pendingPlate() {
  try {
    return normalizePlate(localStorage.getItem(pendingVehiclePlateKey) || '');
  } catch {
    return '';
  }
}

export default function VehicleRegistrationPage({ initialSavedQuery = null, onSavedQueriesChange }) {
  const [vehicles, setVehicles] = useState(getRegisteredVehicles);
  const [unit, setUnit] = useState('001');
  const [plate, setPlate] = useState(pendingPlate);
  const [model, setModel] = useState('');
  const [type, setType] = useState(vehicleTypes[0]);
  const [ownerType, setOwnerType] = useState('company');
  const [owner, setOwner] = useState('JTD Transportes LTDA');
  const [ownerCpf, setOwnerCpf] = useState('');
  const [vehicleLookupOpen, setVehicleLookupOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [driverLookupOpen, setDriverLookupOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [statusValue, setStatusValue] = useState('Ativo');
  const [message, setMessage] = useAutoClearMessage();
  const [vehicleSort, setVehicleSort] = useState({ key: 'plate', direction: 'asc' });

  const sortedVehicles = useMemo(
    () => sortTableRows(
      vehicles,
      vehicleSortColumns,
      vehicleSort,
      (left, right) => normalizePlate(left.plate).localeCompare(normalizePlate(right.plate), 'pt-BR'),
    ),
    [vehicleSort, vehicles],
  );
  const filteredVehicles = useMemo(() => {
    const query = normalizeText(vehicleSearch);
    if (!query) return sortedVehicles;

    return sortedVehicles.filter((vehicle) => (
      normalizeText(`${vehicle.plate} ${vehicle.model} ${vehicle.type} ${vehicle.owner} ${vehicle.unit} ${vehicle.status}`).includes(query)
    ));
  }, [sortedVehicles, vehicleSearch]);
  const driverOptions = useMemo(() => getRegisteredDrivers(), []);
  const filteredDrivers = useMemo(() => {
    const query = normalizeText(driverSearch);
    if (!query) return driverOptions;

    return driverOptions.filter((driver) => (
      normalizeText(`${driver.name} ${formatCpf(driver.cpf)} ${driver.cnh}`).includes(query)
    ));
  }, [driverOptions, driverSearch]);
  const manifests = useMemo(() => getRegisteredManifests(), []);
  const vehicleOwnerOptions = useMemo(
    () => uniqueSortedOptions(sortedVehicles.map((vehicle) => vehicleOwnerLabel(vehicle))),
    [sortedVehicles],
  );
  const vehicleReportFields = useMemo(() => [
    { type: 'text', key: 'search', label: 'Pesquisar', placeholder: 'Placa, modelo, proprietario ou motorista' },
    {
      type: 'dateRange',
      key: 'period',
      label: 'Periodo',
      fieldKey: 'periodField',
      startKey: 'periodStart',
      endKey: 'periodEnd',
      options: [
        { value: 'createdAt', label: 'Cadastro' },
        { value: 'lastManifestDate', label: 'Ultima utilizacao em manifesto' },
      ],
    },
    { type: 'select', key: 'owner', label: 'Proprietario', options: vehicleOwnerOptions },
    { type: 'select', key: 'type', label: 'Tipo de veiculo', options: vehicleTypes },
    { type: 'select', key: 'status', label: 'Status', options: ['Ativo', 'Inativo'] },
    { type: 'select', key: 'unit', label: 'Unidade', options: businessUnits.map((businessUnit) => ({ value: businessUnit.value, label: businessUnit.label })) },
  ], [vehicleOwnerOptions]);

  function buildVehicleReportRows(filters) {
    const query = normalizeReportText(filters.search);

    return sortedVehicles
      .map((vehicle) => {
        const lastManifest = lastVehicleManifest(vehicle, manifests);

        return {
          ...vehicle,
          ownerLabel: vehicleOwnerLabel(vehicle),
          lastManifestId: lastManifest?.id || '',
          lastManifestDate: lastManifest ? manifestVehicleDate(lastManifest) : '',
          lastManifestDriver: lastManifest?.driverName || '',
        };
      })
      .filter((vehicle) => {
        const periodValue = filters.periodField === 'lastManifestDate' ? vehicle.lastManifestDate : vehicle.createdAt;

        return (!query || normalizeReportText([
          vehicle.plate,
          vehicle.model,
          vehicle.type,
          vehicle.ownerLabel,
          vehicle.status,
          vehicle.unit,
          vehicle.lastManifestId,
          vehicle.lastManifestDriver,
        ].join(' ')).includes(query))
          && (!filters.owner || vehicle.ownerLabel === filters.owner)
          && (!filters.type || vehicle.type === filters.type)
          && (!filters.status || vehicle.status === filters.status)
          && (!filters.unit || vehicle.unit === filters.unit)
          && isDateInRange(periodValue, filters.periodStart, filters.periodEnd);
      });
  }

  function vehicleReportMetadata(filters, rows) {
    const periodOption = vehicleReportFields
      .find((field) => field.type === 'dateRange')
      ?.options.find((option) => option.value === filters.periodField);

    return [
      ['Pesquisa', reportFilterLabel(filters.search)],
      ['Periodo por', periodOption?.label || 'Cadastro'],
      ['Periodo de', reportFilterLabel(filters.periodStart)],
      ['Periodo ate', reportFilterLabel(filters.periodEnd)],
      ['Proprietario', reportFilterLabel(filters.owner)],
      ['Tipo', reportFilterLabel(filters.type)],
      ['Status', reportFilterLabel(filters.status)],
      ['Unidade', reportFilterLabel(filters.unit)],
      ['Resultado', `${rows.length} veiculo(s)`],
    ];
  }

  function companyOwnerLabel(unitCode = unit) {
    return businessUnitOwnerLabel(unitCode);
  }

  function loadVehicle(vehicle) {
    const nextOwnerType = vehicle.ownerType || (vehicle.ownerCpf ? 'driver' : 'company');

    setUnit(vehicle.unit || '001');
    setPlate(normalizePlate(vehicle.plate));
    setModel(vehicle.model || '');
    setType(vehicle.type || vehicleTypes[0]);
    setOwnerType(nextOwnerType);
    setOwner(vehicle.owner || (nextOwnerType === 'company' ? companyOwnerLabel(vehicle.unit) : ''));
    setOwnerCpf(vehicle.ownerCpf || '');
    setStatusValue(vehicle.status || 'Ativo');
    setMessage(`Veículo ${vehicle.plate} carregado para edição`);
  }

  useEffect(() => {
    const nextPlate = pendingPlate();
    if (!nextPlate) return;

    const vehicle = vehicles.find((item) => normalizePlate(item.plate) === nextPlate);
    if (vehicle) {
      loadVehicle(vehicle);
    }

    try {
      localStorage.removeItem(pendingVehiclePlateKey);
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }
  }, []);

  function handlePlateChange(value) {
    const nextPlate = normalizePlate(value);
    setPlate(nextPlate);

    if (nextPlate.length === 7) {
      const vehicle = findVehicleByPlate(nextPlate);
      if (vehicle) {
        loadVehicle(vehicle);
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (ownerType === 'driver' && !ownerCpf) {
      setMessage('Selecione o motorista proprietário do veículo');
      return;
    }

    const nextVehicles = saveVehicle({
      unit,
      plate,
      model,
      type,
      ownerType,
      owner: ownerType === 'company' ? companyOwnerLabel() : owner,
      ownerCpf: ownerType === 'driver' ? onlyDigits(ownerCpf) : '',
      status: statusValue,
    });

    try {
      localStorage.removeItem(pendingVehiclePlateKey);
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }

    setVehicles(nextVehicles);
    setMessage(`Veículo ${plate} cadastrado`);
  }

  function handleReset() {
    setUnit('001');
    setPlate('');
    setModel('');
    setType(vehicleTypes[0]);
    setOwnerType('company');
    setOwner('JTD Transportes LTDA');
    setOwnerCpf('');
    setVehicleLookupOpen(false);
    setVehicleSearch('');
    setDriverLookupOpen(false);
    setDriverSearch('');
    setStatusValue('Ativo');
    setMessage('');
  }

  function handleDelete() {
    const currentVehicle = vehicles.find((vehicle) => normalizePlate(vehicle.plate) === normalizePlate(plate));

    if (!currentVehicle) {
      setMessage('Selecione um veiculo cadastrado para excluir');
      return;
    }

    const blockers = getVehicleDeletionBlockers(currentVehicle);

    if (blockers.length) {
      const nextVehicles = deactivateVehicle(currentVehicle.plate);
      setVehicles(nextVehicles);
      setStatusValue('Inativo');
      setMessage(`Veiculo possui vinculo em ${blockers.join(', ')} e foi desativado`);
      return;
    }

    const nextVehicles = deleteVehicle(currentVehicle.plate);
    setVehicles(nextVehicles);
    setUnit('001');
    setPlate('');
    setModel('');
    setType(vehicleTypes[0]);
    setOwnerType('company');
    setOwner('JTD Transportes LTDA');
    setOwnerCpf('');
    setVehicleLookupOpen(false);
    setVehicleSearch('');
    setDriverLookupOpen(false);
    setDriverSearch('');
    setStatusValue('Ativo');
    setMessage(`Veiculo ${currentVehicle.plate} excluido`);
  }

  function handleUnitChange(value) {
    setUnit(value);
    if (ownerType === 'company') {
      setOwner(companyOwnerLabel(value));
    }
  }

  function handleOwnerTypeChange(value) {
    setOwnerType(value);
    setOwner(value === 'company' ? companyOwnerLabel() : '');
    setOwnerCpf('');
    setDriverSearch('');
  }

  function openVehicleLookup() {
    setVehicleLookupOpen(true);
    setVehicleSearch('');
    setDriverLookupOpen(false);
  }

  function closeVehicleLookup() {
    setVehicleLookupOpen(false);
    setVehicleSearch('');
  }

  function selectVehicle(vehicle) {
    loadVehicle(vehicle);
    closeVehicleLookup();
  }

  function openDriverLookup() {
    setDriverLookupOpen(true);
    setDriverSearch('');
  }

  function closeDriverLookup() {
    setDriverLookupOpen(false);
    setDriverSearch('');
  }

  function selectDriver(driver) {
    setOwner(driver.name);
    setOwnerCpf(driver.cpf);
    closeDriverLookup();
  }

  return (
    <section className="vehicle-registration-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Cadastrar Veículo</h1>
          <p className="page-kicker">Gestão de veículos usados na operação fiscal</p>
        </div>
      </header>

      <form className="finance-form registry-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade</span>
            <select value={unit} onChange={(event) => handleUnitChange(event.target.value)} required>
              {businessUnits.map((businessUnit) => (
                <option value={businessUnit.value} key={businessUnit.value}>{businessUnit.label}</option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Placa do veículo</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder="ABC1D23"
                value={plate}
                onChange={(event) => handlePlateChange(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar veículo"
                title="Pesquisar veículo"
                tabIndex={-1}
                onClick={openVehicleLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Modelo</span>
            <input type="text" placeholder="Modelo do veículo" value={model} onChange={(event) => setModel(event.target.value)} required />
          </label>

          <label className="field">
            <span>Tipo do veículo</span>
            <select value={type} onChange={(event) => setType(event.target.value)} required>
              {vehicleTypes.map((vehicleType) => (
                <option value={vehicleType} key={vehicleType}>{vehicleType}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Propriedade do veículo</span>
            <select value={ownerType} onChange={(event) => handleOwnerTypeChange(event.target.value)} required>
              <option value="company">Empresa</option>
              <option value="driver">Motorista terceiro</option>
            </select>
          </label>

          <label className="field field--span-2">
            <span>{ownerType === 'company' ? 'Empresa proprietária' : 'Motorista proprietário'}</span>
            <div className="lookup-field">
              <input
                type="text"
                placeholder={ownerType === 'company' ? 'Empresa proprietária' : 'Pesquise o motorista cadastrado'}
                value={ownerType === 'company' ? companyOwnerLabel() : owner}
                readOnly
                required
              />
              {ownerType === 'driver' && (
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
              )}
            </div>
          </label>

          <label className="field">
            <span>Status</span>
            <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar veículo</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir veiculo
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="vehicles-list-title">
        <div className="registered-launches-header">
          <h2 id="vehicles-list-title">Veículos cadastrados</h2>
          <div>
            <span>{sortedVehicles.length} veículo(s)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <SortableTableHeader
                  columns={vehicleSortColumns}
                  sort={vehicleSort}
                  onSortChange={setVehicleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedVehicles.map((vehicle) => (
                <tr key={vehicle.plate} onClick={() => loadVehicle(vehicle)}>
                  <td><strong>{vehicle.plate}</strong></td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.type}</td>
                  <td>{vehicleOwnerLabel(vehicle)}</td>
                  <td>{vehicle.unit}</td>
                  <td>{vehicle.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReportPanel
        title="Relatorio de veiculos"
        titleId="vehicle-report-title"
        pageId="vehicle-registration"
        reportType="vehicle-report"
        module="Gestao"
        icon="operation"
        defaultFilters={vehicleReportDefaultFilters}
        fields={vehicleReportFields}
        columns={vehicleReportColumns}
        buildRows={buildVehicleReportRows}
        filenamePrefix="relatorio-veiculos"
        initialSavedQuery={initialSavedQuery}
        onSavedQueriesChange={onSavedQueriesChange}
        getSummary={(rows) => `${rows.length} veiculo(s)`}
        getMetadata={vehicleReportMetadata}
        getRowKey={(vehicle) => vehicle.plate}
      />

      {vehicleLookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeVehicleLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="vehicle-lookup-title">Pesquisar veículo</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeVehicleLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por placa, modelo ou proprietário"
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Modelo</th>
                    <th>Tipo</th>
                    <th>Propriedade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.plate} onClick={() => selectVehicle(vehicle)}>
                      <td>{vehicle.plate}</td>
                      <td>{vehicle.model}</td>
                      <td>{vehicle.type}</td>
                      <td>{vehicleOwnerLabel(vehicle)}</td>
                      <td>{vehicle.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filteredVehicles.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}

      {driverLookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-driver-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeDriverLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="vehicle-driver-lookup-title">Pesquisar motorista</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeDriverLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por nome, CPF ou CNH"
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
                    <th>CNH</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.cpf} onClick={() => selectDriver(driver)}>
                      <td>{formatCpf(driver.cpf)}</td>
                      <td>{driver.name}</td>
                      <td>{driver.cnh} / {driver.category}</td>
                      <td>{driver.status}</td>
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
