import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import AddressFields from '../components/AddressFields.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  deactivateUnit,
  deleteUnit,
  formatCnpj,
  getRegisteredUnits,
  saveUnit,
} from '../data/managementRegistry.js';
import { onlyDigits } from '../data/transportRegistry.js';
import { getUnitDeletionBlockers } from '../data/deletionRules.js';
import { blankAddressFields, normalizeAddressFields } from '../utils/address.js';
import { fetchCompanyByCnpj } from '../utils/companyLookup.js';
import { sortTableRows } from '../utils/tableSort.js';

const cnaeApiUrl = 'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses';
const cnaeCacheKey = 'ibgeCnaeOptionsCache';
const cnaeCacheTtlMs = 15 * 24 * 60 * 60 * 1000;

const fallbackCnaes = [
  {
    value: '4930-2/02',
    label: '4930-2/02 - Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional',
  },
  {
    value: '4930-2/01',
    label: '4930-2/01 - Transporte rodoviário de carga, exceto produtos perigosos e mudanças, municipal',
  },
  {
    value: '4930-2/03',
    label: '4930-2/03 - Transporte rodoviário de produtos perigosos',
  },
  {
    value: '5211-7/99',
    label: '5211-7/99 - Depósitos de mercadorias para terceiros, exceto armazéns gerais e guarda-móveis',
  },
];

const initialForm = {
  id: '',
  name: '',
  cnpj: '',
  description: '',
  ...blankAddressFields(),
  active: true,
  cnae: '',
};

const unitSortColumns = [
  { key: 'name', label: 'Nome', type: 'text', getValue: (unit) => unit.name },
  { key: 'cnpj', label: 'CNPJ', type: 'text', getValue: (unit) => unit.cnpj },
  { key: 'cnae', label: 'CNAE', type: 'text', getValue: (unit) => unit.cnae },
  { key: 'zipCode', label: 'CEP', type: 'text', getValue: (unit) => unit.zipCode },
  { key: 'street', label: 'Rua', type: 'text', getValue: (unit) => unit.street },
  { key: 'addressNumber', label: 'Numero', type: 'text', getValue: (unit) => unit.addressNumber },
  { key: 'district', label: 'Bairro', type: 'text', getValue: (unit) => unit.district },
  { key: 'active', label: 'Ativo', type: 'text', getValue: (unit) => (unit.active ? 'Sim' : 'Nao') },
];

function formatCnaeCode(value) {
  const digits = onlyDigits(value).slice(0, 7);
  const classCode = digits.slice(0, 4);
  const verifier = digits.slice(4, 5);
  const subclass = digits.slice(5, 7);

  if (digits.length > 5) return `${classCode}-${verifier}/${subclass}`;
  if (digits.length > 4) return `${classCode}-${verifier}`;
  return classCode;
}

function cnaeOptionFromApi(item) {
  const value = formatCnaeCode(item.id);
  const description = String(item.descricao || '').toLocaleLowerCase('pt-BR');
  const normalizedDescription = description.charAt(0).toLocaleUpperCase('pt-BR') + description.slice(1);

  return {
    value,
    label: `${value} - ${normalizedDescription}`,
  };
}

function readCachedCnaes() {
  try {
    const cached = JSON.parse(localStorage.getItem(cnaeCacheKey) || 'null');

    if (cached?.options?.length) {
      return cached;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedCnaes(options) {
  try {
    localStorage.setItem(cnaeCacheKey, JSON.stringify({
      updatedAt: Date.now(),
      options,
    }));
  } catch {
    // Se o navegador negar armazenamento, a tela continua usando o fallback.
  }
}

function shouldRefreshCnaes(cache) {
  return !cache?.updatedAt || Date.now() - cache.updatedAt > cnaeCacheTtlMs;
}

export default function UnitRegistrationPage() {
  const [units, setUnits] = useState(getRegisteredUnits);
  const [form, setForm] = useState(initialForm);
  const [cnaeOptions, setCnaeOptions] = useState(() => readCachedCnaes()?.options || fallbackCnaes);
  const [unitSort, setUnitSort] = useState({ key: 'name', direction: 'asc' });
  const [message, setMessage] = useAutoClearMessage();
  const companyLookupRequestRef = useRef(0);

  const sortedUnits = useMemo(
    () => sortTableRows(
      units,
      unitSortColumns,
      unitSort,
      (left, right) => left.name.localeCompare(right.name, 'pt-BR'),
    ),
    [unitSort, units],
  );
  const visibleCnaeOptions = useMemo(() => {
    if (!form.cnae || cnaeOptions.some((option) => option.value === form.cnae)) {
      return cnaeOptions;
    }

    return [{ value: form.cnae, label: form.cnae }, ...cnaeOptions];
  }, [cnaeOptions, form.cnae]);

  useEffect(() => {
    let ignore = false;
    const cache = readCachedCnaes();

    if (!shouldRefreshCnaes(cache)) {
      return () => {
        ignore = true;
      };
    }

    async function updateCnaesCache() {
      try {
        const response = await fetch(cnaeApiUrl);

        if (!response.ok) {
          throw new Error('Falha ao carregar CNAEs');
        }

        const data = await response.json();
        const nextOptions = data
          .map(cnaeOptionFromApi)
          .sort((left, right) => left.value.localeCompare(right.value, 'pt-BR'));

        if (!ignore && nextOptions.length) {
          setCnaeOptions(nextOptions);
          writeCachedCnaes(nextOptions);
        }
      } catch {
        if (!ignore && !cache?.options?.length) {
          setCnaeOptions(fallbackCnaes);
        }
      }
    }

    updateCnaesCache();

    return () => {
      ignore = true;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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

      const companyCnae = formatCnaeCode(company.cnae);

      setForm((current) => ({
        ...current,
        cnpj: formatCnpj(company.cnpj || cnpj),
        name: company.name || company.legalName || current.name,
        cnae: companyCnae || current.cnae,
        description: company.cnaeDescription || company.legalName || current.description,
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

  function loadUnit(unit) {
    setForm({ ...normalizeAddressFields(unit), cnae: formatCnaeCode(unit.cnae) });
    setMessage(`Unidade ${unit.name} carregada para edição`);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (onlyDigits(form.cnpj).length !== 14) {
      setMessage('Informe um CNPJ válido para a unidade');
      return;
    }

    if (!form.cnae) {
      setMessage('Selecione o CNAE da unidade');
      return;
    }

    const nextUnits = saveUnit(form);
    setUnits(nextUnits);
    setForm((current) => ({ ...current, cnpj: formatCnpj(current.cnpj) }));
    setMessage(`Unidade ${form.name} salva`);
  }

  function handleReset() {
    setForm(initialForm);
    setMessage('');
  }

  function handleDelete() {
    const currentUnit = units.find((unit) => (
      unit.id === form.id || onlyDigits(unit.cnpj) === onlyDigits(form.cnpj)
    ));

    if (!currentUnit) {
      setMessage('Selecione uma unidade cadastrada para excluir');
      return;
    }

    const blockers = getUnitDeletionBlockers(currentUnit);

    if (blockers.length) {
      const nextUnits = deactivateUnit(currentUnit);
      const inactiveUnit = nextUnits.find((unit) => unit.id === currentUnit.id || onlyDigits(unit.cnpj) === onlyDigits(currentUnit.cnpj));
      setUnits(nextUnits);
      setForm(inactiveUnit || { ...currentUnit, active: false });
      setMessage(`Unidade possui vinculo em ${blockers.join(', ')} e foi desativada`);
      return;
    }

    const nextUnits = deleteUnit(currentUnit);
    setUnits(nextUnits);
    setForm(initialForm);
    setMessage(`Unidade ${currentUnit.name} excluida`);
  }

  return (
    <section className="unit-registration-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Unidade</h1>
          <p className="page-kicker">Cadastro das unidades da empresa</p>
        </div>
      </header>

      <form className="finance-form registry-form" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="form-grid">
          <label className="field field--span-2">
            <span>Nome</span>
            <input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
          </label>

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
            <span>CNAE</span>
            <select value={form.cnae} onChange={(event) => updateField('cnae', event.target.value)} required>
              <option value="">Selecione o CNAE</option>
              {visibleCnaeOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="field field--span-4">
            <span>Descrição da empresa</span>
            <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} required />
          </label>

          <AddressFields
            values={form}
            onChange={updateField}
            onChangeMany={updateFields}
            onStatus={setMessage}
            required
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
          <button type="submit" className="primary-button">Salvar unidade</button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            <Trash2 size={15} strokeWidth={2.2} />
            Excluir unidade
          </button>
          <button type="reset" className="secondary-button">Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel registry-list-panel" aria-labelledby="units-list-title">
        <div className="registered-launches-header">
          <h2 id="units-list-title">Unidades cadastradas</h2>
          <div>
            <span>{sortedUnits.length} unidade(s)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table registry-table">
            <thead>
              <tr>
                <SortableTableHeader columns={unitSortColumns} sort={unitSort} onSortChange={setUnitSort} />
                <th>Rua</th>
                <th>Número</th>
                <th>Bairro</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {sortedUnits.map((unit) => (
                <tr key={unit.id || unit.cnpj} onClick={() => loadUnit(unit)}>
                  <td><strong>{unit.name}</strong></td>
                  <td>{unit.cnpj}</td>
                  <td>{unit.cnae}</td>
                  <td>{unit.zipCode || '-'}</td>
                  <td>{unit.street || '-'}</td>
                  <td>{unit.addressNumber || '-'}</td>
                  <td>{unit.district || '-'}</td>
                  <td>{unit.active ? 'Sim' : 'Não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
