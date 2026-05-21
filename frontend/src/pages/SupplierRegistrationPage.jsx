import { useMemo, useRef, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import DataTable from '../components/DataTable.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  deactivateSupplier,
  deleteSupplier,
  formatCpfCnpj,
  getRegisteredSuppliers,
  saveSupplier,
} from '../data/managementRegistry.js';
import { onlyDigits } from '../data/transportRegistry.js';
import { normalizeText } from '../data/financeData.js';
import { getSupplierDeletionBlockers } from '../data/deletionRules.js';
import { blankAddressFields, normalizeAddressFields } from '../utils/address.js';
import { fetchCompanyByCnpj } from '../utils/companyLookup.js';
import { sortTableRows } from '../utils/tableSort.js';

const initialForm = {
  id: '',
  name: '',
  cnpj: '',
  contact: '',
  email: '',
  ...blankAddressFields(),
  active: true,
};

const supplierSortColumns = [
  { key: 'name', label: 'Nome', type: 'text', getValue: (supplier) => supplier.name, render: (supplier) => <strong>{supplier.name}</strong> },
  { key: 'document', label: 'CNPJ/CPF', type: 'text', getValue: (supplier) => supplier.cnpj },
  { key: 'contact', label: 'Contato', type: 'text', getValue: (supplier) => supplier.contact },
  { key: 'email', label: 'E-mail', type: 'text', getValue: (supplier) => supplier.email },
  { key: 'address', label: 'EndereÃ§o', type: 'text', getValue: (supplier) => supplier.address },
  { key: 'active', label: 'Ativo', type: 'text', getValue: (supplier) => (supplier.active ? 'Sim' : 'Nao'), render: (supplier) => (supplier.active ? 'Sim' : 'Nao') },
];

export default function SupplierRegistrationPage() {
  const [suppliers, setSuppliers] = useState(getRegisteredSuppliers);
  const [form, setForm] = useState(initialForm);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierSort, setSupplierSort] = useState({ key: 'name', direction: 'asc' });
  const [message, setMessage] = useAutoClearMessage();
  const companyLookupRequestRef = useRef(0);

  const sortedSuppliers = useMemo(
    () => sortTableRows(
      suppliers,
      supplierSortColumns,
      supplierSort,
      (left, right) => left.name.localeCompare(right.name, 'pt-BR'),
    ),
    [supplierSort, suppliers],
  );
  const visibleSuppliers = useMemo(() => {
    const query = normalizeText(supplierSearch);
    if (!query) return sortedSuppliers;

    return sortedSuppliers.filter((supplier) => (
      normalizeText(`${supplier.name} ${supplier.cnpj} ${supplier.contact} ${supplier.email} ${supplier.address} ${supplier.active ? 'ativo' : 'inativo'}`).includes(query)
    ));
  }, [sortedSuppliers, supplierSearch]);
  const lookupSuppliers = useMemo(() => {
    const query = normalizeText(lookupSearch);
    if (!query) return sortedSuppliers;

    return sortedSuppliers.filter((supplier) => (
      normalizeText(`${supplier.name} ${supplier.cnpj} ${supplier.contact} ${supplier.email} ${supplier.address}`).includes(query)
    ));
  }, [lookupSearch, sortedSuppliers]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function updateFields(updates) {
    setForm((current) => ({ ...current, ...updates }));
    setMessage('');
  }

  async function handleDocumentBlur() {
    const documentDigits = onlyDigits(form.cnpj);

    if (!documentDigits) {
      return;
    }

    if (documentDigits.length === 11) {
      setForm((current) => ({ ...current, cnpj: formatCpfCnpj(current.cnpj) }));
      return;
    }

    if (documentDigits.length !== 14) {
      setMessage('Informe um CPF com 11 digitos ou CNPJ com 14 digitos');
      return;
    }

    const requestId = companyLookupRequestRef.current + 1;
    companyLookupRequestRef.current = requestId;
    setMessage('Consultando CNPJ...');

    try {
      const company = await fetchCompanyByCnpj(documentDigits);

      if (companyLookupRequestRef.current !== requestId) {
        return;
      }

      if (!company) {
        setMessage('CNPJ nao encontrado');
        return;
      }

      setForm((current) => ({
        ...current,
        cnpj: formatCpfCnpj(company.cnpj || documentDigits),
        name: company.name || company.legalName || current.name,
        contact: company.phone || current.contact,
        email: company.email || current.email,
        zipCode: company.zipCode || current.zipCode,
        street: company.street || current.street,
        addressNumber: company.addressNumber || current.addressNumber,
        district: company.district || current.district,
      }));

      setMessage(
        company.city && company.state
          ? `CNPJ localizado: ${company.city}/${company.state}`
          : 'Dados preenchidos pelo CNPJ',
      );
    } catch {
      if (companyLookupRequestRef.current === requestId) {
        setMessage('Nao foi possivel consultar o CNPJ agora');
      }
    }
  }

  function loadSupplier(supplier) {
    setForm(normalizeAddressFields(supplier));
    setMessage(`Fornecedor ${supplier.name} carregado para edição`);
  }

  function openLookup() {
    setLookupOpen(true);
    setLookupSearch('');
  }

  function closeLookup() {
    setLookupOpen(false);
    setLookupSearch('');
  }

  function selectSupplier(supplier) {
    loadSupplier(supplier);
    closeLookup();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const documentLength = onlyDigits(form.cnpj).length;

    if (documentLength !== 11 && documentLength !== 14) {
      setMessage('Informe um CPF ou CNPJ valido para o fornecedor');
      return;
    }

    const nextSuppliers = saveSupplier(form);
    setSuppliers(nextSuppliers);
    setForm((current) => ({ ...current, cnpj: formatCpfCnpj(current.cnpj) }));
    setMessage(`Fornecedor ${form.name} salvo`);
  }

  function handleReset() {
    setForm(initialForm);
    closeLookup();
    setMessage('');
  }

  function handleDelete() {
    const currentSupplier = suppliers.find((supplier) => (
      supplier.id === form.id || onlyDigits(supplier.cnpj) === onlyDigits(form.cnpj)
    ));

    if (!currentSupplier) {
      setMessage('Selecione um fornecedor cadastrado para excluir');
      return;
    }

    const blockers = getSupplierDeletionBlockers(currentSupplier);

    if (blockers.length) {
      const nextSuppliers = deactivateSupplier(currentSupplier);
      const inactiveSupplier = nextSuppliers.find((supplier) => supplier.id === currentSupplier.id || onlyDigits(supplier.cnpj) === onlyDigits(currentSupplier.cnpj));
      setSuppliers(nextSuppliers);
      setForm(inactiveSupplier || { ...currentSupplier, active: false });
      setMessage(`Fornecedor possui vinculo em ${blockers.join(', ')} e foi desativado`);
      return;
    }

    const nextSuppliers = deleteSupplier(currentSupplier);
    setSuppliers(nextSuppliers);
    setForm(initialForm);
    setMessage(`Fornecedor ${currentSupplier.name} excluido`);
  }

  return (
    <section className="supplier-registration-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Fornecedor</h1>
          <p className="page-kicker">Cadastro de fornecedores do sistema</p>
        </div>
      </header>

      <form className="finance-form registry-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <div className="field field--span-2">
            <span>Nome</span>
            <div className="lookup-field">
              <input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar fornecedor"
                title="Pesquisar fornecedor"
                tabIndex={-1}
                onClick={openLookup}
              >
                <Search size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="field">
            <span>CNPJ/CPF</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="CPF ou CNPJ"
              value={form.cnpj}
              onChange={(event) => updateField('cnpj', formatCpfCnpj(event.target.value))}
              onBlur={handleDocumentBlur}
              required
            />
          </label>

          <label className="field">
            <span>Contato</span>
            <input type="text" value={form.contact} onChange={(event) => updateField('contact', event.target.value)} />
          </label>

          <label className="field field--span-2">
            <span>E-mail</span>
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>

          <AddressFields
            values={form}
            onChange={updateField}
            onChangeMany={updateFields}
            onStatus={setMessage}
          />

          <div className="field inline-check-field">
            <input
              type="checkbox"
              aria-label="Ativo"
              checked={form.active}
              onChange={(event) => updateField('active', event.target.checked)}
            />
            <span>Ativo</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar fornecedor</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir fornecedor
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <DataTable
        title="Fornecedores cadastrados"
        titleId="suppliers-list-title"
        rows={visibleSuppliers}
        columns={supplierSortColumns}
        sort={supplierSort}
        onSortChange={setSupplierSort}
        getRowKey={(supplier) => supplier.id || supplier.cnpj}
        onRowClick={loadSupplier}
        rowClassName="registry-row"
        searchValue={supplierSearch}
        onSearchChange={setSupplierSearch}
        searchPlaceholder="Pesquisar por nome, CPF/CNPJ, contato, e-mail ou endereco"
        summary={<span>{visibleSuppliers.length} fornecedor(es)</span>}
        panelClassName="registry-list-panel"
        tableClassName="registry-table"
        minWidth={1080}
        emptyMessage="Nenhum fornecedor encontrado"
      />

      {lookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="supplier-lookup-title">Pesquisar fornecedor</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por nome, CPF/CNPJ ou contato"
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CNPJ/CPF</th>
                    <th>Contato</th>
                    <th>Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {lookupSuppliers.map((supplier) => (
                    <tr key={supplier.id || supplier.cnpj} onClick={() => selectSupplier(supplier)}>
                      <td>{supplier.name}</td>
                      <td>{supplier.cnpj}</td>
                      <td>{supplier.contact}</td>
                      <td>{supplier.active ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!lookupSuppliers.length && <div className="lookup-empty">Nenhuma opção encontrada</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
