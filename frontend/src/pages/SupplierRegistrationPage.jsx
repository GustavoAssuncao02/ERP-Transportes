import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { formatCnpj, getRegisteredSuppliers, saveSupplier } from '../data/managementRegistry.js';
import { onlyDigits } from '../data/transportRegistry.js';
import { normalizeText } from '../data/financeData.js';

const initialForm = {
  id: '',
  name: '',
  cnpj: '',
  contact: '',
  email: '',
  address: '',
  active: true,
};

export default function SupplierRegistrationPage() {
  const [suppliers, setSuppliers] = useState(getRegisteredSuppliers);
  const [form, setForm] = useState(initialForm);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [message, setMessage] = useAutoClearMessage();

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [suppliers],
  );
  const lookupSuppliers = useMemo(() => {
    const query = normalizeText(lookupSearch);
    if (!query) return sortedSuppliers;

    return sortedSuppliers.filter((supplier) => normalizeText(`${supplier.name} ${supplier.cnpj} ${supplier.contact}`).includes(query));
  }, [lookupSearch, sortedSuppliers]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function loadSupplier(supplier) {
    setForm(supplier);
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

    if (onlyDigits(form.cnpj).length !== 14) {
      setMessage('Informe um CNPJ válido para o fornecedor');
      return;
    }

    const nextSuppliers = saveSupplier(form);
    setSuppliers(nextSuppliers);
    setForm((current) => ({ ...current, cnpj: formatCnpj(current.cnpj) }));
    setMessage(`Fornecedor ${form.name} salvo`);
  }

  function handleReset() {
    setForm(initialForm);
    closeLookup();
    setMessage('');
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
            <span>CNPJ</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={form.cnpj}
              onChange={(event) => updateField('cnpj', formatCnpj(event.target.value))}
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

          <label className="field field--span-2">
            <span>Endereço</span>
            <input type="text" value={form.address} onChange={(event) => updateField('address', event.target.value)} />
          </label>

          <label className="field inline-check-field">
            <input type="checkbox" checked={form.active} onChange={(event) => updateField('active', event.target.checked)} />
            <span>Ativo</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar fornecedor</button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="suppliers-list-title">
        <div className="registered-launches-header">
          <h2 id="suppliers-list-title">Fornecedores cadastrados</h2>
          <div>
            <span>{sortedSuppliers.length} fornecedor(es)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>E-mail</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {sortedSuppliers.map((supplier) => (
                <tr key={supplier.id || supplier.cnpj} onClick={() => loadSupplier(supplier)}>
                  <td><strong>{supplier.name}</strong></td>
                  <td>{supplier.cnpj}</td>
                  <td>{supplier.contact}</td>
                  <td>{supplier.email}</td>
                  <td>{supplier.active ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                placeholder="Pesquisar por nome, CNPJ ou contato"
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
                    <th>CNPJ</th>
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
