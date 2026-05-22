import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import DataTable from '../components/DataTable.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { normalizeText } from '../data/financeData.js';
import {
  deactivateDriver,
  deleteDriver,
  findDriverByCpf,
  formatCpf,
  getRegisteredDrivers,
  isValidCpf,
  onlyDigits,
  pendingDriverCpfKey,
  saveDriver,
} from '../data/transportRegistry.js';
import { getDriverDeletionBlockers } from '../data/deletionRules.js';
import { getRegisteredSuppliers, saveSupplier } from '../data/managementRegistry.js';
import { blankAddressFields, normalizeAddressFields } from '../utils/address.js';
import { sortTableRows } from '../utils/tableSort.js';

const licenseCategories = ['B', 'C', 'D', 'E'];
const blankAddress = blankAddressFields();

const driverSortColumns = [
  { key: 'cpf', label: 'CPF', type: 'text', getValue: (driver) => formatCpf(driver.cpf), render: (driver) => <strong>{formatCpf(driver.cpf)}</strong> },
  { key: 'name', label: 'Nome', type: 'text', getValue: (driver) => driver.name },
  { key: 'phone', label: 'Telefone', type: 'text', getValue: (driver) => driver.phone },
  { key: 'supplierCode', label: 'Fornecedor', type: 'text', getValue: (driver) => driver.supplierCode || '-' },
  { key: 'cnh', label: 'CNH', type: 'text', getValue: (driver) => `${driver.cnh} ${driver.category}`, render: (driver) => `${driver.cnh} / ${driver.category}` },
  { key: 'status', label: 'Status', type: 'text', getValue: (driver) => driver.status, status: true },
];

function pendingCpf() {
  try {
    return formatCpf(localStorage.getItem(pendingDriverCpfKey) || '');
  } catch {
    return '';
  }
}

function findSupplierForDriver(driverOrCpf) {
  const cpf = onlyDigits(driverOrCpf?.cpf || driverOrCpf);
  const supplierCode = String(driverOrCpf?.supplierCode || '').trim();

  return getRegisteredSuppliers().find((supplier) => (
    supplier.id === supplierCode
    || supplier.code === supplierCode
    || onlyDigits(supplier.cnpj) === cpf
  )) || null;
}

function driverAddressFields(driver) {
  const supplier = findSupplierForDriver(driver);
  return normalizeAddressFields({
    ...blankAddress,
    ...(supplier || {}),
    ...driver,
  });
}

export default function DriverRegistrationPage() {
  const [drivers, setDrivers] = useState(getRegisteredDrivers);
  const [cpf, setCpf] = useState(pendingCpf);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnh, setCnh] = useState('');
  const [category, setCategory] = useState('E');
  const [supplierCode, setSupplierCode] = useState('');
  const [address, setAddress] = useState(blankAddress);
  const [statusValue, setStatusValue] = useState('Ativo');
  const [cpfError, setCpfError] = useState('');
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [driverSort, setDriverSort] = useState({ key: 'name', direction: 'asc' });
  const [message, setMessage] = useAutoClearMessage();

  const sortedDrivers = useMemo(
    () => sortTableRows(
      drivers,
      driverSortColumns,
      driverSort,
      (left, right) => left.name.localeCompare(right.name, 'pt-BR'),
    ),
    [driverSort, drivers],
  );
  const visibleDrivers = useMemo(() => {
    const query = normalizeText(driverSearch);
    if (!query) return sortedDrivers;

    return sortedDrivers.filter((driver) => (
      normalizeText(`${driver.name} ${formatCpf(driver.cpf)} ${driver.cnh} ${driver.phone} ${driver.supplierCode} ${driver.address} ${driver.status}`).includes(query)
    ));
  }, [driverSearch, sortedDrivers]);
  const lookupDrivers = useMemo(() => {
    const query = normalizeText(lookupSearch);
    if (!query) return sortedDrivers;

    return sortedDrivers.filter((driver) => normalizeText(`${driver.name} ${formatCpf(driver.cpf)} ${driver.cnh} ${driver.phone}`).includes(query));
  }, [lookupSearch, sortedDrivers]);

  function loadDriver(driver) {
    const normalizedDriver = driverAddressFields(driver);
    setCpf(formatCpf(driver.cpf));
    setName(driver.name || '');
    setPhone(driver.phone || '');
    setCnh(driver.cnh || '');
    setCategory(driver.category || 'E');
    setSupplierCode(driver.supplierCode || findSupplierForDriver(driver)?.id || '');
    setAddress({
      zipCode: normalizedDriver.zipCode || '',
      street: normalizedDriver.street || '',
      addressNumber: normalizedDriver.addressNumber || '',
      district: normalizedDriver.district || '',
      address: normalizedDriver.address || '',
    });
    setStatusValue(driver.status || 'Ativo');
    setCpfError('');
    setMessage(`Motorista ${driver.name} carregado para edição`);
  }

  function handleCpfChange(value) {
    const nextCpf = formatCpf(value);
    setCpf(nextCpf);
    setCpfError('');

    if (onlyDigits(nextCpf).length === 11) {
      if (!isValidCpf(nextCpf)) {
        setCpfError('CPF inválido');
        return;
      }

      const driver = findDriverByCpf(nextCpf);
      if (driver) {
        loadDriver(driver);
        return;
      }

      const supplier = findSupplierForDriver(nextCpf);
      if (supplier) {
        const normalizedSupplier = normalizeAddressFields(supplier);
        setSupplierCode(supplier.id || supplier.code || '');
        setName((current) => current || supplier.name || '');
        setPhone((current) => current || supplier.contact || '');
        setAddress({
          zipCode: normalizedSupplier.zipCode || '',
          street: normalizedSupplier.street || '',
          addressNumber: normalizedSupplier.addressNumber || '',
          district: normalizedSupplier.district || '',
          address: normalizedSupplier.address || '',
        });
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!isValidCpf(cpf)) {
      setCpfError('CPF inválido');
      setMessage('Informe um CPF válido para cadastrar o motorista');
      return;
    }

    const savedSuppliers = saveSupplier({
      id: supplierCode || '',
      name,
      cnpj: cpf,
      contact: phone,
      email: '',
      ...address,
      active: statusValue === 'Ativo',
    });
    const linkedSupplier = savedSuppliers.find((supplier) => onlyDigits(supplier.cnpj) === onlyDigits(cpf));
    const nextAddress = normalizeAddressFields(address);
    const nextDrivers = saveDriver({
      cpf,
      name,
      phone,
      cnh,
      category,
      supplierCode: linkedSupplier?.id || supplierCode,
      ...nextAddress,
      status: statusValue,
    });

    try {
      localStorage.removeItem(pendingDriverCpfKey);
    } catch {
      // localStorage pode estar indisponível em navegação privada.
    }

    setDrivers(nextDrivers);
    setSupplierCode(linkedSupplier?.id || supplierCode);
    setAddress({
      zipCode: nextAddress.zipCode || '',
      street: nextAddress.street || '',
      addressNumber: nextAddress.addressNumber || '',
      district: nextAddress.district || '',
      address: nextAddress.address || '',
    });
    setMessage(`Motorista ${name} cadastrado e fornecedor ${linkedSupplier?.id || supplierCode} vinculado`);
  }

  function openLookup() {
    setLookupOpen(true);
    setLookupSearch('');
  }

  function closeLookup() {
    setLookupOpen(false);
    setLookupSearch('');
  }

  function selectDriver(driver) {
    loadDriver(driver);
    closeLookup();
  }

  function updateAddressField(field, value) {
    setAddress((current) => normalizeAddressFields({ ...current, [field]: value }));
    setMessage('');
  }

  function updateAddressFields(updates) {
    setAddress((current) => normalizeAddressFields({ ...current, ...updates }));
    setMessage('');
  }

  function handleReset() {
    setCpf('');
    setName('');
    setPhone('');
    setCnh('');
    setCategory('E');
    setSupplierCode('');
    setAddress(blankAddress);
    setStatusValue('Ativo');
    setCpfError('');
    closeLookup();
    setMessage('');
  }

  function handleDelete() {
    const currentDriver = drivers.find((driver) => onlyDigits(driver.cpf) === onlyDigits(cpf));

    if (!currentDriver) {
      setMessage('Selecione um motorista cadastrado para excluir');
      return;
    }

    const blockers = getDriverDeletionBlockers(currentDriver);

    if (blockers.length) {
      const nextDrivers = deactivateDriver(currentDriver.cpf);
      setDrivers(nextDrivers);
      setStatusValue('Inativo');
      setMessage(`Motorista possui vinculo em ${blockers.join(', ')} e foi desativado`);
      return;
    }

    const nextDrivers = deleteDriver(currentDriver.cpf);
    setDrivers(nextDrivers);
    setCpf('');
    setName('');
    setPhone('');
    setCnh('');
    setCategory('E');
    setSupplierCode('');
    setAddress(blankAddress);
    setStatusValue('Ativo');
    setCpfError('');
    closeLookup();
    setMessage(`Motorista ${currentDriver.name} excluido`);
  }

  return (
    <section className="driver-registration-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Cadastrar Motorista</h1>
          <p className="page-kicker">Gestão dos motoristas vinculados aos documentos fiscais</p>
        </div>
      </header>

      <form className="finance-form registry-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <label className="field">
            <span>CPF do motorista</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(event) => handleCpfChange(event.target.value)}
              aria-invalid={cpfError ? 'true' : undefined}
              required
            />
            {cpfError && <strong className="field-error">{cpfError}</strong>}
          </label>

          <div className="field field--span-2">
            <span>Nome do motorista</span>
            <div className="lookup-field">
              <input type="text" placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} required />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar motorista"
                title="Pesquisar motorista"
                tabIndex={-1}
                onClick={openLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>Telefone</span>
            <input type="text" placeholder="(00) 00000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>

          <label className="field">
            <span>CNH</span>
            <input type="text" inputMode="numeric" placeholder="Número da CNH" value={cnh} onChange={(event) => setCnh(event.target.value)} required />
          </label>

          <label className="field">
            <span>Categoria da CNH</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} required>
              {licenseCategories.map((licenseCategory) => (
                <option value={licenseCategory} key={licenseCategory}>{licenseCategory}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Fornecedor gerado</span>
            <input type="text" value={supplierCode || 'Gerado ao salvar'} readOnly />
          </label>

          <AddressFields
            values={address}
            onChange={updateAddressField}
            onChangeMany={updateAddressFields}
            onStatus={setMessage}
          />

          <label className="field">
            <span>Status</span>
            <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar motorista</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir motorista
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <DataTable
        title="Motoristas cadastrados"
        titleId="drivers-list-title"
        rows={visibleDrivers}
        columns={driverSortColumns}
        sort={driverSort}
        onSortChange={setDriverSort}
        getRowKey={(driver) => driver.cpf}
        onRowClick={loadDriver}
        rowClassName="registry-row"
        searchValue={driverSearch}
        onSearchChange={setDriverSearch}
        searchPlaceholder="Pesquisar por nome, CPF, CNH, telefone ou status"
        summary={<span>{visibleDrivers.length} motorista(s)</span>}
        panelClassName="registry-list-panel"
        tableClassName="registry-table"
        minWidth={920}
        emptyMessage="Nenhum motorista encontrado"
      />

      {lookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="driver-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="driver-lookup-title">Pesquisar motorista</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por nome, CPF, CNH ou telefone"
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
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
                  {lookupDrivers.map((driver) => (
                    <tr key={driver.cpf} onClick={() => selectDriver(driver)}>
                      <td>{formatCpf(driver.cpf)}</td>
                      <td>{driver.name}</td>
                      <td>{driver.phone}</td>
                      <td>{driver.cnh} / {driver.category}</td>
                      <td>{driver.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!lookupDrivers.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
