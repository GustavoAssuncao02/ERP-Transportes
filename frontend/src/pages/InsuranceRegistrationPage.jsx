import { useMemo, useRef, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import ReportPanel from '../components/ReportPanel.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import TriStateCheckbox from '../components/TriStateCheckbox.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { getFinanceLaunches, normalizeText } from '../data/financeData.js';
import { getInsuranceDeletionBlockers } from '../data/deletionRules.js';
import { getRegisteredCtes, getRegisteredManifests } from '../data/operationRegistry.js';
import {
  deactivateInsurance,
  deleteInsurance,
  formatCnpj,
  getRegisteredInsurances,
  saveInsurance,
} from '../data/managementRegistry.js';
import { onlyDigits } from '../data/transportRegistry.js';
import { blankAddressFields, brazilianStateOptions, normalizeAddressFields } from '../utils/address.js';
import { fetchCompanyByCnpj } from '../utils/companyLookup.js';
import { formatReportDate, formatReportDateTime, isDateInRange, isReportOptionSelected, normalizeReportText, reportSelectionLabel } from '../utils/report.js';
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
const insuranceReportBaseFilters = {
  insuranceIds: [],
  active: '',
  defaultInsurance: '',
  state: '',
  periodField: 'createdAt',
  periodStart: '',
  periodEnd: '',
};

const insuranceReportBaseFields = [
  { type: 'select', key: 'active', label: 'Status', options: [{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }] },
  { type: 'select', key: 'defaultInsurance', label: 'Seguro padrao', options: [{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Nao' }] },
  { type: 'select', key: 'state', label: 'UF', options: brazilianStateOptions },
  {
    type: 'dateRange',
    key: 'period',
    label: 'Periodo',
    fieldKey: 'periodField',
    startKey: 'periodStart',
    endKey: 'periodEnd',
    options: [
      { value: 'createdAt', label: 'Cadastro' },
      { value: 'lastUsageDate', label: 'Data de utilizacao' },
    ],
  },
];

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

const insuranceReportColumns = [
  { key: 'companyName', label: 'Seguradora', pdfWidth: 26, getValue: (insurance) => insurance.companyName, render: (insurance) => <strong>{insurance.companyName}</strong> },
  { key: 'cnpj', label: 'CNPJ', pdfWidth: 18, getValue: (insurance) => insurance.cnpj },
  { key: 'policyNumber', label: 'Apolice', pdfWidth: 18, getValue: (insurance) => insurance.policyNumber },
  { key: 'endorsementNumber', label: 'Averbacao', pdfWidth: 14, getValue: (insurance) => insurance.endorsementNumber || '-' },
  { key: 'contact', label: 'Contato', pdfWidth: 20, getValue: (insurance) => insurance.contact || '-' },
  { key: 'state', label: 'UF', pdfWidth: 4, getValue: (insurance) => insurance.state || '-' },
  { key: 'active', label: 'Ativo', pdfWidth: 6, getValue: (insurance) => (insurance.active ? 'Sim' : 'Nao') },
  { key: 'defaultInsurance', label: 'Padrao', pdfWidth: 6, getValue: (insurance) => (insurance.defaultInsurance ? 'Sim' : 'Nao') },
  { key: 'createdAt', label: 'Cadastro', pdfWidth: 10, getValue: (insurance) => formatReportDate(insurance.createdAt) },
  { key: 'lastUsageDate', label: 'Ultima utiliz.', pdfWidth: 16, getValue: (insurance) => formatReportDateTime(insurance.lastUsageDate) },
];

function reportFilterLabel(value, allLabel = 'Todos') {
  return value || allLabel;
}

function dateTimeMs(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function insuranceReportKey(insurance) {
  return String(insurance.id || insurance.cnpj || insurance.policyNumber || insurance.companyName || '');
}

function insuranceReportOption(insurance) {
  return {
    value: insuranceReportKey(insurance),
    label: insurance.companyName,
    meta: {
      cnpj: insurance.cnpj || '-',
      apolice: insurance.policyNumber || '-',
      status: insurance.active ? 'Ativo' : 'Inativo',
    },
    searchText: [insurance.companyName, insurance.cnpj, insurance.policyNumber, insurance.contact].join(' '),
  };
}

function sameInsuranceName(insurance, name) {
  return normalizeReportText(insurance.companyName) === normalizeReportText(name);
}

function financeLaunchDate(launch) {
  return launch.createdDate || launch.issueDate || launch.appropriationDate || launch.paymentDate || launch.dueDate || '';
}

function insuranceUsageDate(usage) {
  return usage.date || usage.createdAt || '';
}

function lastInsuranceUsage(insurance, ctes, manifests, launches) {
  const usageItems = [
    ...ctes
      .filter((cte) => sameInsuranceName(insurance, cte.insuranceCompany))
      .map((cte) => ({ date: cte.issueDateTime || cte.createdAt, id: cte.id })),
    ...manifests
      .filter((manifest) => sameInsuranceName(insurance, manifest.insuranceCompany))
      .map((manifest) => ({ date: manifest.updatedAt || manifest.closedAt || manifest.startedAt || manifest.createdAt, id: manifest.id })),
    ...launches
      .filter((launch) => sameInsuranceName(insurance, launch.supplier))
      .map((launch) => ({ date: financeLaunchDate(launch), id: launch.id })),
  ];

  return usageItems
    .filter((usage) => usage.date)
    .sort((left, right) => dateTimeMs(insuranceUsageDate(right)) - dateTimeMs(insuranceUsageDate(left)))[0] || null;
}

export default function InsuranceRegistrationPage({ initialSavedQuery = null, onSavedQueriesChange }) {
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
  const ctes = useMemo(() => getRegisteredCtes(), []);
  const manifests = useMemo(() => getRegisteredManifests(), []);
  const financeLaunches = useMemo(() => getFinanceLaunches(), []);
  const insuranceReportOptions = useMemo(
    () => sortedInsurances.map(insuranceReportOption),
    [sortedInsurances],
  );
  const insuranceReportDefaultFilters = useMemo(() => ({
    ...insuranceReportBaseFilters,
    insuranceIds: insuranceReportOptions.map((option) => option.value),
  }), [insuranceReportOptions]);
  const insuranceReportFields = useMemo(() => [
    {
      type: 'lookupMulti',
      key: 'insuranceIds',
      label: 'Seguradora',
      options: insuranceReportOptions,
      searchPlaceholder: 'Pesquisar seguradora',
      columns: [
        { key: 'cnpj', label: 'CNPJ' },
        { key: 'apolice', label: 'Apolice' },
        { key: 'status', label: 'Status' },
      ],
    },
    ...insuranceReportBaseFields,
  ], [insuranceReportOptions]);

  function buildInsuranceReportRows(filters) {
    return sortedInsurances
      .map((insurance) => {
        const lastUsage = lastInsuranceUsage(insurance, ctes, manifests, financeLaunches);

        return {
          ...insurance,
          reportKey: insuranceReportKey(insurance),
          lastUsageDate: lastUsage ? insuranceUsageDate(lastUsage) : '',
          lastUsageId: lastUsage?.id || '',
        };
      })
      .filter((insurance) => {
        const periodValue = filters.periodField === 'lastUsageDate' ? insurance.lastUsageDate : insurance.createdAt;

        return isReportOptionSelected(insurance.reportKey, filters.insuranceIds)
          && (!filters.active || (filters.active === 'active' ? insurance.active : !insurance.active))
          && (!filters.defaultInsurance || (filters.defaultInsurance === 'yes' ? insurance.defaultInsurance : !insurance.defaultInsurance))
          && (!filters.state || insurance.state === filters.state)
          && isDateInRange(periodValue, filters.periodStart, filters.periodEnd);
      });
  }

  function insuranceReportMetadata(filters, rows) {
    const periodOption = insuranceReportFields
      .find((field) => field.type === 'dateRange')
      ?.options.find((option) => option.value === filters.periodField);

    return [
      ['Seguradora', reportSelectionLabel(filters.insuranceIds, insuranceReportOptions)],
      ['Status', filters.active === 'active' ? 'Ativo' : filters.active === 'inactive' ? 'Inativo' : 'Todos'],
      ['Seguro padrao', filters.defaultInsurance === 'yes' ? 'Sim' : filters.defaultInsurance === 'no' ? 'Nao' : 'Todos'],
      ['UF', reportFilterLabel(filters.state)],
      ['Periodo por', periodOption?.label || 'Cadastro'],
      ['Periodo de', reportFilterLabel(filters.periodStart)],
      ['Periodo ate', reportFilterLabel(filters.periodEnd)],
      ['Resultado', `${rows.length} seguro(s)`],
    ];
  }

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
        state: company.state || current.state,
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
            showState
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

      <ReportPanel
        title="Relatorio de seguros"
        titleId="insurance-report-title"
        pageId="insurance-registration"
        reportType="insurance-report"
        module="Gestao"
        icon="operation"
        defaultFilters={insuranceReportDefaultFilters}
        fields={insuranceReportFields}
        columns={insuranceReportColumns}
        buildRows={buildInsuranceReportRows}
        filenamePrefix="relatorio-seguros"
        initialSavedQuery={initialSavedQuery}
        onSavedQueriesChange={onSavedQueriesChange}
        getSummary={(rows) => `${rows.length} seguro(s)`}
        getMetadata={insuranceReportMetadata}
        getRowKey={(insurance) => insurance.id}
      />

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
