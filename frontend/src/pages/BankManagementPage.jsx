import { useMemo, useState } from 'react';
import { Building2, Plus, Search, Trash2 } from 'lucide-react';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { normalizeText } from '../data/financeData.js';
import { deleteBank, getRegisteredBanks, getRegisteredUnits, saveBank } from '../data/managementRegistry.js';
import { sortTableRows } from '../utils/tableSort.js';

const initialForm = {
  id: '',
  unit: '001',
  name: '',
  agency: '',
  account: '',
  active: true,
};

function unitLabel(unit) {
  return `${unit.id} - ${unit.name}`;
}

function bankSearchText(bank, unitMap) {
  return normalizeText(`${bank.name} ${bank.agency} ${bank.account} ${unitMap.get(bank.unit) || bank.unit} ${bank.active ? 'ativo' : 'inativo'}`);
}

export default function BankManagementPage() {
  const [banks, setBanks] = useState(getRegisteredBanks);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [bankSort, setBankSort] = useState({ key: 'name', direction: 'asc' });
  const [message, setMessage] = useAutoClearMessage();
  const unitOptions = useMemo(() => getRegisteredUnits().filter((unit) => unit.active !== false), []);
  const unitMap = useMemo(() => new Map(unitOptions.map((unit) => [unit.id, unitLabel(unit)])), [unitOptions]);
  const bankSortColumns = useMemo(() => [
    { key: 'unit', label: 'Unidade', type: 'text', getValue: (bank) => unitMap.get(bank.unit) || bank.unit },
    { key: 'name', label: 'Nome', type: 'text', getValue: (bank) => bank.name },
    { key: 'agency', label: 'Agencia', type: 'text', getValue: (bank) => bank.agency },
    { key: 'account', label: 'Conta', type: 'text', getValue: (bank) => bank.account },
    { key: 'status', label: 'Status', type: 'text', getValue: (bank) => (bank.active ? 'Ativo' : 'Inativo') },
  ], [unitMap]);

  const visibleBanks = useMemo(() => {
    const query = normalizeText(search);
    const filteredBanks = query
      ? banks.filter((bank) => bankSearchText(bank, unitMap).includes(query))
      : banks;

    return sortTableRows(
      filteredBanks,
      bankSortColumns,
      bankSort,
      (left, right) => left.name.localeCompare(right.name, 'pt-BR'),
    );
  }, [bankSort, bankSortColumns, banks, search, unitMap]);
  const activeBanks = useMemo(() => banks.filter((bank) => bank.active).length, [banks]);
  const uniqueAgencies = useMemo(() => new Set(banks.map((bank) => bank.agency).filter(Boolean)).size, [banks]);
  const linkedUnits = useMemo(() => new Set(banks.map((bank) => bank.unit).filter(Boolean)).size, [banks]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function loadBank(bank) {
    setForm(bank);
    setMessage(`Banco ${bank.name} carregado para edicao`);
  }

  function handleNewBank() {
    setForm(initialForm);
    setMessage('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.unit || !form.name.trim() || !form.agency.trim() || !form.account.trim()) {
      setMessage('Informe unidade, nome, agencia e conta do banco');
      return;
    }

    const duplicateBank = banks.find((bank) => (
      bank.id !== form.id
      && bank.unit === form.unit
      && normalizeText(bank.name) === normalizeText(form.name)
      && normalizeText(bank.agency) === normalizeText(form.agency)
      && normalizeText(bank.account) === normalizeText(form.account)
    ));

    if (duplicateBank) {
      setMessage('Esse banco ja esta cadastrado nessa unidade com a mesma agencia e conta');
      return;
    }

    const nextBanks = saveBank(form);
    const savedBank = nextBanks.find((bank) => (
      bank.id === form.id
      || (
        normalizeText(bank.name) === normalizeText(form.name)
        && bank.unit === form.unit
        && normalizeText(bank.agency) === normalizeText(form.agency)
        && normalizeText(bank.account) === normalizeText(form.account)
      )
    ));

    setBanks(nextBanks);
    setForm(savedBank || initialForm);
    setMessage(`Banco ${form.name} salvo`);
  }

  function handleDelete() {
    if (!form.id) {
      setMessage('Selecione um banco cadastrado para excluir');
      return;
    }

    const nextBanks = deleteBank(form);
    setBanks(nextBanks);
    setForm(initialForm);
    setMessage(`Banco ${form.name} excluido`);
  }

  return (
    <section className="bank-management-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Banco</h1>
          <p className="page-kicker">Cadastre e visualize as contas bancarias usadas pela tesouraria</p>
        </div>

        <button type="button" className="primary-button bank-new-button" onClick={handleNewBank}>
          <Plus size={16} strokeWidth={2.3} />
          Novo banco
        </button>
      </header>

      <section className="bank-summary-grid" aria-label="Resumo dos bancos">
        <div>
          <span>Total</span>
          <strong>{banks.length}</strong>
        </div>
        <div>
          <span>Ativos</span>
          <strong>{activeBanks}</strong>
        </div>
        <div>
          <span>Unidades</span>
          <strong>{linkedUnits}</strong>
        </div>
        <div>
          <span>Agencias</span>
          <strong>{uniqueAgencies}</strong>
        </div>
      </section>

      <div className="bank-management-layout">
        <section className="registered-launches-panel bank-list-panel" aria-labelledby="bank-list-title">
          <div className="registered-launches-header">
            <h2 id="bank-list-title">Bancos cadastrados</h2>
            <div>
              <span>{visibleBanks.length} banco(s)</span>
            </div>
          </div>

          <div className="bank-searchbar">
            <div className="lookup-field">
              <input
                type="search"
                placeholder="Pesquisar banco, unidade, agencia ou conta"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="shortcut-search-icon" aria-hidden="true">
                <Search size={16} strokeWidth={2.2} />
              </span>
            </div>
          </div>

          <div className="registered-launches-table-wrap">
            <table className="registered-launches-table bank-table">
              <thead>
                <tr>
                  <SortableTableHeader columns={bankSortColumns} sort={bankSort} onSortChange={setBankSort} />
                </tr>
              </thead>
              <tbody>
                {visibleBanks.map((bank) => (
                  <tr
                    key={bank.id}
                    className={bank.id === form.id ? 'bank-row bank-row--selected' : 'bank-row'}
                    onClick={() => loadBank(bank)}
                  >
                    <td>{unitMap.get(bank.unit) || bank.unit}</td>
                    <td className="bank-name-cell">
                      <strong>{bank.name}</strong>
                      <span>{bank.id}</span>
                    </td>
                    <td>{bank.agency}</td>
                    <td>{bank.account}</td>
                    <td>
                      <span className={bank.active ? 'bank-status-pill bank-status-pill--active' : 'bank-status-pill'}>
                        {bank.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!visibleBanks.length && <div className="empty-list">Nenhum banco encontrado</div>}
          </div>
        </section>

        <section className="selection-panel bank-form-panel" aria-labelledby="bank-form-title">
          <div className="selection-panel-header">
            <h2 id="bank-form-title">Dados do banco</h2>
            <strong>{form.id ? form.id : 'Novo'}</strong>
          </div>

          <form className="bank-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Unidade</span>
              <select
                value={form.unit}
                onChange={(event) => updateField('unit', event.target.value)}
                required
              >
                {unitOptions.map((unit) => (
                  <option value={unit.id} key={unit.id}>{unitLabel(unit)}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Nome</span>
              <input
                type="text"
                placeholder="Ex.: Banco do Brasil"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Agencia</span>
              <input
                type="text"
                placeholder="Ex.: 0001-9"
                value={form.agency}
                onChange={(event) => updateField('agency', event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Conta</span>
              <input
                type="text"
                placeholder="Ex.: 12345-6"
                value={form.account}
                onChange={(event) => updateField('account', event.target.value)}
                required
              />
            </label>

            <label className="field inline-check-field bank-active-field">
              <input
                type="checkbox"
                aria-label="Ativo"
                checked={form.active}
                onChange={(event) => updateField('active', event.target.checked)}
              />
              <span>Ativo</span>
            </label>

            <div className="bank-preview">
              <Building2 size={18} strokeWidth={2.2} />
              <div>
                <strong>{form.name || 'Banco ainda sem nome'}</strong>
                <span>{unitMap.get(form.unit) || form.unit} / Ag. {form.agency || '-'} / Conta {form.account || '-'}</span>
              </div>
            </div>

            <div className="form-actions bank-form-actions">
              <button type="submit" className="primary-button">Salvar banco</button>
              <button type="button" className="danger-button" onClick={handleDelete}>
                <Trash2 size={15} strokeWidth={2.2} />
                Excluir
              </button>
              <button type="button" className="secondary-button" onClick={handleNewBank}>Limpar</button>
            </div>

            <span className="status-line bank-status-line" aria-live="polite">{message}</span>
          </form>
        </section>
      </div>
    </section>
  );
}
