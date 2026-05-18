import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { normalizeText } from '../data/financeData.js';
import { getInsuranceDeletionBlockers } from '../data/deletionRules.js';
import {
  deactivateInsurance,
  deleteInsurance,
  formatCnpj,
  getRegisteredInsurances,
  saveInsurance,
} from '../data/managementRegistry.js';
import { onlyDigits } from '../data/transportRegistry.js';

const initialForm = {
  id: '',
  companyName: '',
  cnpj: '',
  policyNumber: '',
  endorsementNumber: '',
  contact: '',
  active: true,
  defaultInsurance: false,
};

export default function InsuranceRegistrationPage() {
  const [insurances, setInsurances] = useState(getRegisteredInsurances);
  const [form, setForm] = useState(initialForm);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [message, setMessage] = useAutoClearMessage();

  const sortedInsurances = useMemo(
    () => [...insurances].sort((left, right) => (
      Number(right.defaultInsurance) - Number(left.defaultInsurance)
      || left.companyName.localeCompare(right.companyName, 'pt-BR')
    )),
    [insurances],
  );
  const lookupInsurances = useMemo(() => {
    const query = normalizeText(lookupSearch);
    if (!query) return sortedInsurances;

    return sortedInsurances.filter((insurance) => normalizeText([
      insurance.companyName,
      insurance.cnpj,
      insurance.policyNumber,
      insurance.endorsementNumber,
      insurance.contact,
    ].join(' ')).includes(query));
  }, [lookupSearch, sortedInsurances]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      active: field === 'defaultInsurance' && value ? true : current.active,
    }));
    setMessage('');
  }

  function loadInsurance(insurance) {
    setForm({ ...initialForm, ...insurance });
    setMessage(`Seguro ${insurance.companyName} carregado para edicao`);
  }

  function openLookup() {
    setLookupOpen(true);
    setLookupSearch('');
  }

  function closeLookup() {
    setLookupOpen(false);
    setLookupSearch('');
  }

  function selectInsurance(insurance) {
    loadInsurance(insurance);
    closeLookup();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.companyName.trim()) {
      setMessage('Informe a seguradora');
      return;
    }

    if (onlyDigits(form.cnpj).length !== 14) {
      setMessage('Informe um CNPJ valido para a seguradora');
      return;
    }

    if (!form.policyNumber.trim()) {
      setMessage('Informe a apolice do seguro');
      return;
    }

    const nextInsurances = saveInsurance(form);
    const savedInsurance = nextInsurances.find((insurance) => (
      insurance.id === form.id
      || (
        onlyDigits(insurance.cnpj) === onlyDigits(form.cnpj)
        && normalizeText(insurance.policyNumber) === normalizeText(form.policyNumber)
      )
    ));

    setInsurances(nextInsurances);
    setForm(savedInsurance || { ...form, cnpj: formatCnpj(form.cnpj) });
    setMessage(`Seguro ${form.companyName} salvo`);
  }

  function handleReset() {
    setForm(initialForm);
    closeLookup();
    setMessage('');
  }

  function handleDelete() {
    const currentInsurance = insurances.find((insurance) => (
      insurance.id === form.id
      || (
        onlyDigits(insurance.cnpj) === onlyDigits(form.cnpj)
        && normalizeText(insurance.policyNumber) === normalizeText(form.policyNumber)
      )
    ));

    if (!currentInsurance) {
      setMessage('Selecione um seguro cadastrado para excluir');
      return;
    }

    const blockers = getInsuranceDeletionBlockers(currentInsurance);

    if (blockers.length) {
      const nextInsurances = deactivateInsurance(currentInsurance);
      const inactiveInsurance = nextInsurances.find((insurance) => insurance.id === currentInsurance.id);
      setInsurances(nextInsurances);
      setForm(inactiveInsurance || { ...currentInsurance, active: false, defaultInsurance: false });
      setMessage(`Seguro possui vinculo em ${blockers.join(', ')} e foi desativado`);
      return;
    }

    const nextInsurances = deleteInsurance(currentInsurance);
    setInsurances(nextInsurances);
    setForm(initialForm);
    setMessage(`Seguro ${currentInsurance.companyName} excluido`);
  }

  return (
    <section className="insurance-registration-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Seguros</h1>
          <p className="page-kicker">Cadastro de seguros e definicao do seguro padrao do sistema</p>
        </div>
      </header>

      <form className="finance-form registry-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <div className="field field--span-2">
            <span>Seguradora</span>
            <div className="lookup-field">
              <input type="text" value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} required />
              <button
                type="button"
                className="icon-button"
                aria-label="Pesquisar seguro"
                title="Pesquisar seguro"
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
            <span>Apolice</span>
            <input type="text" value={form.policyNumber} onChange={(event) => updateField('policyNumber', event.target.value.toUpperCase())} required />
          </label>

          <label className="field">
            <span>Averbacao</span>
            <input type="text" value={form.endorsementNumber} onChange={(event) => updateField('endorsementNumber', event.target.value.toUpperCase())} />
          </label>

          <label className="field field--span-2">
            <span>Contato</span>
            <input type="text" value={form.contact} onChange={(event) => updateField('contact', event.target.value)} />
          </label>

          <label className="field inline-check-field">
            <input type="checkbox" checked={form.active} onChange={(event) => updateField('active', event.target.checked)} />
            <span>Ativo</span>
          </label>

          <label className="field inline-check-field">
            <input type="checkbox" checked={form.defaultInsurance} onChange={(event) => updateField('defaultInsurance', event.target.checked)} />
            <span>Seguro padrao</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Salvar seguro</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir seguro
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="insurances-list-title">
        <div className="registered-launches-header">
          <h2 id="insurances-list-title">Seguros cadastrados</h2>
          <div>
            <span>{sortedInsurances.length} seguro(s)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <th>Seguradora</th>
                <th>CNPJ</th>
                <th>Apolice</th>
                <th>Averbacao</th>
                <th>Ativo</th>
                <th>Padrao</th>
              </tr>
            </thead>
            <tbody>
              {sortedInsurances.map((insurance) => (
                <tr key={insurance.id} onClick={() => loadInsurance(insurance)}>
                  <td><strong>{insurance.companyName}</strong></td>
                  <td>{insurance.cnpj}</td>
                  <td>{insurance.policyNumber}</td>
                  <td>{insurance.endorsementNumber || '-'}</td>
                  <td>{insurance.active ? 'Sim' : 'Nao'}</td>
                  <td>{insurance.defaultInsurance ? 'Sim' : 'Nao'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {lookupOpen && (
        <div className="lookup-modal" role="dialog" aria-modal="true" aria-labelledby="insurance-lookup-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar pesquisa" onClick={closeLookup} />
          <div className="lookup-modal-panel">
            <header className="lookup-modal-header">
              <h2 id="insurance-lookup-title">Pesquisar seguro</h2>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closeLookup}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="lookup-modal-toolbar">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por seguradora, CNPJ ou apolice"
                value={lookupSearch}
                onChange={(event) => setLookupSearch(event.target.value)}
                autoFocus
              />
            </div>

            <div className="lookup-table-wrap">
              <table className="lookup-table">
                <thead>
                  <tr>
                    <th>Seguradora</th>
                    <th>CNPJ</th>
                    <th>Apolice</th>
                    <th>Padrao</th>
                  </tr>
                </thead>
                <tbody>
                  {lookupInsurances.map((insurance) => (
                    <tr key={insurance.id} onClick={() => selectInsurance(insurance)}>
                      <td>{insurance.companyName}</td>
                      <td>{insurance.cnpj}</td>
                      <td>{insurance.policyNumber}</td>
                      <td>{insurance.defaultInsurance ? 'Sim' : 'Nao'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!lookupInsurances.length && <div className="empty-list">Nenhum seguro encontrado</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
