import { useMemo, useRef, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import TriStateCheckbox from '../components/TriStateCheckbox.jsx';
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
import { blankAddressFields, normalizeAddressFields } from '../utils/address.js';
import { fetchCompanyByCnpj } from '../utils/companyLookup.js';
import { sortTableRows } from '../utils/tableSort.js';

const initialForm = {
  id: '',
  companyName: '',
  cnpj: '',
  policyNumber: '',
  endorsementNumber: '',
  contact: '',
  email: '',
  ...blankAddressFields(),
  active: true,
  defaultInsurance: false,
};

const insuranceSortColumns = [
  { key: 'companyName', label: 'Seguradora', type: 'text', getValue: (insurance) => insurance.companyName },
  { key: 'cnpj', label: 'CNPJ', type: 'text', getValue: (insurance) => insurance.cnpj },
  { key: 'policyNumber', label: 'Apolice', type: 'text', getValue: (insurance) => insurance.policyNumber },
  { key: 'endorsementNumber', label: 'Averbacao', type: 'text', getValue: (insurance) => insurance.endorsementNumber },
  { key: 'contact', label: 'Contato', type: 'text', getValue: (insurance) => insurance.contact },
  { key: 'email', label: 'E-mail', type: 'text', getValue: (insurance) => insurance.email },
  { key: 'active', label: 'Ativo', type: 'number', getValue: (insurance) => Number(insurance.active) },
  { key: 'defaultInsurance', label: 'Padrao', type: 'number', getValue: (insurance) => Number(insurance.defaultInsurance) },
];

export default function InsuranceRegistrationPage() {
  const [insurances, setInsurances] = useState(getRegisteredInsurances);
  const [form, setForm] = useState(initialForm);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [insuranceSort, setInsuranceSort] = useState({ key: 'defaultInsurance', direction: 'desc' });
  const [message, setMessage] = useAutoClearMessage();
  const companyLookupRequestRef = useRef(0);

  const sortedInsurances = useMemo(
    () => sortTableRows(
      insurances,
      insuranceSortColumns,
      insuranceSort,
      (left, right) => left.companyName.localeCompare(right.companyName, 'pt-BR'),
    ),
    [insuranceSort, insurances],
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
      insurance.email,
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

  function updateFields(updates) {
    setForm((current) => ({ ...current, ...updates }));
    setMessage('');
  }

  async function handleCnpjBlur() {
    const cnpj = onlyDigits(form.cnpj);

    if (!cnpj) {
      return;
    }

    if (cnpj.length !== 14) {
      setMessage('Informe um CNPJ com 14 digitos');
      return;
    }

    const requestId = companyLookupRequestRef.current + 1;
    companyLookupRequestRef.current = requestId;
    setMessage('Consultando CNPJ...');

    try {
      const company = await fetchCompanyByCnpj(cnpj);

      if (companyLookupRequestRef.current !== requestId) {
        return;
      }

      if (!company) {
        setMessage('CNPJ nao encontrado');
        return;
      }

      setForm((current) => ({
        ...current,
        cnpj: formatCnpj(company.cnpj || cnpj),
        companyName: company.name || company.legalName || current.companyName,
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

  function loadInsurance(insurance) {
    setForm({ ...initialForm, ...normalizeAddressFields(insurance) });
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
              onBlur={handleCnpjBlur}
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
            <TriStateCheckbox
              aria-label="Ativo"
              checked={form.active}
              onChange={(event) => updateField('active', event.target.checked)}
            />
            <span>Ativo</span>
          </div>

          <div className="field inline-check-field">
            <TriStateCheckbox
              aria-label="Seguro padrao"
              checked={form.defaultInsurance}
              onChange={(event) => updateField('defaultInsurance', event.target.checked)}
            />
            <span>Seguro padrao</span>
          </div>
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
                <SortableTableHeader
                  columns={insuranceSortColumns}
                  sort={insuranceSort}
                  onSortChange={setInsuranceSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedInsurances.map((insurance) => (
                <tr key={insurance.id} onClick={() => loadInsurance(insurance)}>
                  <td><strong>{insurance.companyName}</strong></td>
                  <td>{insurance.cnpj}</td>
                  <td>{insurance.policyNumber}</td>
                  <td>{insurance.endorsementNumber || '-'}</td>
                  <td>{insurance.contact || '-'}</td>
                  <td>{insurance.email || '-'}</td>
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
