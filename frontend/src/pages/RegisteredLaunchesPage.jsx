import { useMemo, useState } from 'react';

const businessUnits = [
  { value: '001', label: '001 - JTD Transportes LTDA' },
  { value: '002', label: '002 - JTD Logistica Nordeste' },
  { value: '003', label: '003 - JTD Armazens Salvador' },
];

const searchTypes = [
  { label: 'Data Emissao', field: 'issueDate' },
  { label: 'Data de Vencimento', field: 'dueDate' },
  { label: 'Data de Cadastro', field: 'createdDate' },
  { label: 'Data de Pagamento', field: 'paymentDate' },
  { label: 'Data de Apropriacao', field: 'appropriationDate' },
  { label: 'Data de Previsao de Pagamento', field: 'paymentForecastDate' },
];

const registeredLaunches = [
  {
    id: 'CAP-202605-00001',
    unit: '001',
    supplier: 'Auto Posto Central LTDA',
    type: 'Combustivel',
    document: 'NF-8742',
    issueDate: '2026-05-10',
    dueDate: '2026-05-14',
    createdDate: '2026-05-10',
    paymentDate: '',
    appropriationDate: '2026-05-10',
    paymentForecastDate: '2026-05-14',
    amount: 1350.25,
    status: 'Aberto',
  },
  {
    id: 'CAP-202605-00002',
    unit: '001',
    supplier: 'Oficina Sao Jorge',
    type: 'Manutencao',
    document: 'OS-1180',
    issueDate: '2026-05-11',
    dueDate: '2026-05-14',
    createdDate: '2026-05-11',
    paymentDate: '',
    appropriationDate: '2026-05-11',
    paymentForecastDate: '2026-05-14',
    amount: 780,
    status: 'Aberto',
  },
  {
    id: 'CAP-202605-00003',
    unit: '002',
    supplier: 'Seguradora Atlantica',
    type: 'Seguro',
    document: 'AP-4409',
    issueDate: '2026-05-12',
    dueDate: '2026-06-02',
    createdDate: '2026-05-12',
    paymentDate: '2026-05-30',
    appropriationDate: '2026-05-12',
    paymentForecastDate: '2026-06-02',
    amount: 2420.5,
    status: 'Baixado',
  },
  {
    id: 'CAP-202605-00004',
    unit: '003',
    supplier: 'Transportes Parceiros SA',
    type: 'Servicos de transporte',
    document: 'FAT-3321',
    issueDate: '2026-05-13',
    dueDate: '2026-06-10',
    createdDate: '2026-05-13',
    paymentDate: '',
    appropriationDate: '2026-05-13',
    paymentForecastDate: '2026-06-10',
    amount: 990.9,
    status: 'Aberto',
  },
  {
    id: 'CAP-202605-00005',
    unit: '001',
    supplier: 'JTD Logistica Nordeste',
    type: 'Administrativo',
    document: 'DUP-0091',
    issueDate: '2026-05-15',
    dueDate: '2026-05-28',
    createdDate: '2026-05-15',
    paymentDate: '',
    appropriationDate: '2026-05-15',
    paymentForecastDate: '2026-05-28',
    amount: 3180,
    status: 'Aberto',
  },
  {
    id: 'PAV-202605-00001',
    unit: '001',
    supplier: 'Cartorio Modelo',
    type: 'Administrativo',
    document: 'DOC-2201',
    issueDate: '2026-05-15',
    dueDate: '2026-05-15',
    createdDate: '2026-05-15',
    paymentDate: '2026-05-15',
    appropriationDate: '2026-05-15',
    paymentForecastDate: '2026-05-15',
    amount: 240,
    status: 'Baixado',
  },
];

function currency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function numberValue(value) {
  return Number.parseFloat(String(value).replace(',', '.'));
}

export default function RegisteredLaunchesPage() {
  const [businessUnit, setBusinessUnit] = useState('');
  const [searchType, setSearchType] = useState('issueDate');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  const filteredLaunches = useMemo(() => {
    const supplierQuery = normalizeText(supplierFilter.trim());
    const min = numberValue(minValue);
    const max = numberValue(maxValue);
    const selectedDateField = searchTypes.find((type) => type.field === searchType)?.field || 'issueDate';

    return registeredLaunches.filter((launch) => {
      const dateValue = launch[selectedDateField];
      const unitMatches = !businessUnit || launch.unit === businessUnit;
      const supplierMatches = !supplierQuery || normalizeText(launch.supplier).includes(supplierQuery);
      const startMatches = !dateStart || (dateValue && dateValue >= dateStart);
      const endMatches = !dateEnd || (dateValue && dateValue <= dateEnd);
      const minMatches = Number.isNaN(min) || launch.amount >= min;
      const maxMatches = Number.isNaN(max) || launch.amount <= max;

      return unitMatches && supplierMatches && startMatches && endMatches && minMatches && maxMatches;
    });
  }, [businessUnit, dateEnd, dateStart, maxValue, minValue, searchType, supplierFilter]);

  const filteredTotal = filteredLaunches.reduce((total, launch) => total + launch.amount, 0);

  function clearFilters() {
    setBusinessUnit('');
    setSearchType('issueDate');
    setSupplierFilter('');
    setDateStart('');
    setDateEnd('');
    setMinValue('');
    setMaxValue('');
  }

  return (
    <section className="registered-launches-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Consultar Lancamentos</h1>
          <p className="page-kicker">Consulta dos lancamentos cadastrados no sistema</p>
        </div>
      </header>

      <form className="finance-form registered-launches-form" onSubmit={(event) => event.preventDefault()}>
        <div className="form-grid">
          <label className="field">
            <span>Unidade</span>
            <select value={businessUnit} onChange={(event) => setBusinessUnit(event.target.value)}>
              <option value="">Todas</option>
              {businessUnits.map((unit) => (
                <option value={unit.value} key={unit.value}>{unit.label}</option>
              ))}
            </select>
          </label>

          <label className="field field--span-2">
            <span>Fornecedor</span>
            <input
              type="search"
              placeholder="Pesquisar fornecedor"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Selecionar Tipo Pesquisa</span>
            <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
              {searchTypes.map((type) => (
                <option value={type.field} key={type.field}>{type.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Data inicial</span>
            <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
          </label>

          <label className="field">
            <span>Data final</span>
            <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
          </label>

          <label className="field">
            <span>Valor minimo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={minValue}
              onChange={(event) => setMinValue(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Valor maximo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={maxValue}
              onChange={(event) => setMaxValue(event.target.value)}
            />
          </label>

          <div className="field registered-launches-actions">
            <span>&nbsp;</span>
            <button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button>
          </div>
        </div>

        <section className="registered-launches-panel" aria-labelledby="registered-launches-title">
          <div className="registered-launches-header">
            <h2 id="registered-launches-title">Lancamentos cadastrados</h2>
            <div>
              <span>{filteredLaunches.length} lancamento(s)</span>
              <strong>{currency(filteredTotal)}</strong>
            </div>
          </div>

          <div className="registered-launches-table-wrap">
            <table className="registered-launches-table">
              <thead>
                <tr>
                  <th>Lancamento</th>
                  <th>Unidade</th>
                  <th>Fornecedor</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Emissao</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Situacao</th>
                </tr>
              </thead>
              <tbody>
                {filteredLaunches.map((launch) => (
                  <tr key={launch.id}>
                    <td><strong>{launch.id}</strong></td>
                    <td>{launch.unit}</td>
                    <td>{launch.supplier}</td>
                    <td>{launch.document}</td>
                    <td>{launch.type}</td>
                    <td>{launch.issueDate}</td>
                    <td>{launch.dueDate}</td>
                    <td>{currency(launch.amount)}</td>
                    <td><span className="launch-status-pill">{launch.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredLaunches.length && (
              <div className="empty-list">Nenhum lancamento encontrado para os filtros informados</div>
            )}
          </div>
        </section>
      </form>
    </section>
  );
}
