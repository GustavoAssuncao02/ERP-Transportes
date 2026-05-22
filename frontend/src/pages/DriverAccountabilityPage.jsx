import { useMemo, useState } from 'react';
import { FileText, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { PieChart } from '../components/FinanceCharts.jsx';
import SortableTableHeader from '../components/SortableTableHeader.jsx';
import TriStateCheckbox from '../components/TriStateCheckbox.jsx';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  closeDriverSettlement,
  defaultDriverDailyRate,
  downloadDriverSettlementPdf,
  getDriverSettlements,
  getDriverSupplierCode,
  buildDriverSettlementReport,
  reopenDriverSettlement,
} from '../data/driverSettlementRegistry.js';
import { accountingTypes, currency, todayValue, toNumber } from '../data/financeData.js';
import { formatCpf, getRegisteredDrivers, onlyDigits } from '../data/transportRegistry.js';
import { identifierNumberValue, sortTableRows } from '../utils/tableSort.js';

function nextAdjustmentId() {
  return `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
}

function signedCurrency(value) {
  const amount = Number(value || 0);
  const signal = amount > 0 ? '+' : '';

  return `${signal}${currency(amount)}`;
}

function balanceRecipientLabel(value) {
  const amount = Number(value || 0);

  if (amount > 0) return 'Empresa a Receber';
  if (amount < 0) return 'Motorista a Receber';

  return 'Saldo quitado';
}

function adjustmentAccountingTypeLabel(adjustment) {
  const code = String(adjustment?.accountingTypeCode || '').trim();
  const name = String(adjustment?.accountingType || '').trim();

  if (code && name) return `${code} - ${name}`;
  return name || code || '';
}

const openPayableSortColumns = [
  { key: 'id', label: 'Lancamento', type: 'number', getValue: (launch) => identifierNumberValue(launch.id) },
  { key: 'type', label: 'Tipo', type: 'text', getValue: (launch) => launch.type },
  { key: 'document', label: 'Documento', type: 'text', getValue: (launch) => launch.document },
  { key: 'dueDate', label: 'Vencimento', type: 'date', defaultDirection: 'asc', getValue: (launch) => launch.dueDate },
  { key: 'amount', label: 'Valor', type: 'number', getValue: (launch) => launch.amount },
];

const settlementHistorySortColumns = [
  { key: 'id', label: 'Prestacao', type: 'number', getValue: (settlement) => identifierNumberValue(settlement.id) },
  { key: 'driverName', label: 'Motorista', type: 'text', getValue: (settlement) => settlement.driverName },
  { key: 'closedAt', label: 'Fechamento', type: 'date', getValue: (settlement) => settlement.closedAt || settlement.updatedAt },
  { key: 'balance', label: 'Saldo', type: 'number', getValue: (settlement) => settlement.report?.totals?.balance || 0 },
  { key: 'debtor', label: 'Devedor', type: 'text', getValue: (settlement) => settlement.report?.debtor || '' },
  { key: 'status', label: 'Status', type: 'text', getValue: (settlement) => settlement.status || 'Fechada' },
  { key: 'actions', label: '', sortable: false },
];

function settlementStatusClass(status) {
  return String(status || '').toLowerCase() === 'reaberta'
    ? 'launch-status-pill launch-status-pill--warning'
    : 'launch-status-pill';
}

export default function DriverAccountabilityPage() {
  const [drivers] = useState(getRegisteredDrivers);
  const [selectedDriverCpf, setSelectedDriverCpf] = useState('');
  const [dailyRate, setDailyRate] = useState(String(defaultDriverDailyRate));
  const [kmStart, setKmStart] = useState('');
  const [kmEnd, setKmEnd] = useState('');
  const [dueDate, setDueDate] = useState(todayValue());
  const [adjustmentName, setAdjustmentName] = useState('');
  const [adjustmentAccountingTypeCode, setAdjustmentAccountingTypeCode] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustments, setAdjustments] = useState([]);
  const [excludedFinancialMovementIds, setExcludedFinancialMovementIds] = useState([]);
  const [editingSettlementId, setEditingSettlementId] = useState('');
  const [settlements, setSettlements] = useState(getDriverSettlements);
  const [openPayableSort, setOpenPayableSort] = useState({ key: 'dueDate', direction: 'asc' });
  const [settlementHistorySort, setSettlementHistorySort] = useState({ key: 'closedAt', direction: 'desc' });
  const [message, setMessage] = useAutoClearMessage();

  const selectedDriver = useMemo(
    () => drivers.find((driver) => onlyDigits(driver.cpf) === onlyDigits(selectedDriverCpf)) || null,
    [drivers, selectedDriverCpf],
  );
  const report = useMemo(() => {
    if (!selectedDriver) return null;

    return buildDriverSettlementReport({
      driver: selectedDriver,
      dailyRate,
      kmStart,
      kmEnd,
      adjustments,
      excludedFinancialMovementIds,
      dueDate,
      settlementId: editingSettlementId,
    });
  }, [adjustments, dailyRate, dueDate, editingSettlementId, excludedFinancialMovementIds, kmEnd, kmStart, selectedDriver]);
  const driverSettlements = useMemo(
    () => settlements.filter((settlement) => !selectedDriver || onlyDigits(settlement.driverCpf) === onlyDigits(selectedDriver.cpf)),
    [selectedDriver, settlements],
  );
  const sortedOpenPayableLaunches = useMemo(
    () => sortTableRows(
      report?.openPayableLaunches || [],
      openPayableSortColumns,
      openPayableSort,
      (left, right) => identifierNumberValue(left.id) - identifierNumberValue(right.id),
    ),
    [openPayableSort, report],
  );
  const sortedDriverSettlements = useMemo(
    () => sortTableRows(
      driverSettlements,
      settlementHistorySortColumns,
      settlementHistorySort,
      (left, right) => identifierNumberValue(left.id) - identifierNumberValue(right.id),
    ),
    [driverSettlements, settlementHistorySort],
  );
  const supplierCode = selectedDriver ? getDriverSupplierCode(selectedDriver) : '';
  const canClose = Boolean(selectedDriver && dueDate);

  function handleDriverChange(value) {
    setSelectedDriverCpf(value);
    setEditingSettlementId('');
    setExcludedFinancialMovementIds([]);
    setMessage('');
  }

  function addAdjustment() {
    const name = adjustmentName.trim();
    const amount = toNumber(adjustmentAmount);
    const accountingType = accountingTypes.find((type) => type.code === adjustmentAccountingTypeCode) || null;

    if (!name) {
      setMessage('Informe o nome do ajuste avulso');
      return;
    }

    if (!Number.isFinite(amount) || amount === 0) {
      setMessage('Informe um valor positivo ou negativo para o ajuste avulso');
      return;
    }

    setAdjustments((current) => [
      ...current,
      {
        id: nextAdjustmentId(),
        name,
        amount,
        accountingTypeCode: accountingType?.code || '',
        accountingType: accountingType?.name || '',
      },
    ]);
    setAdjustmentName('');
    setAdjustmentAccountingTypeCode('');
    setAdjustmentAmount('');
    setMessage('Ajuste avulso adicionado');
  }

  function removeAdjustment(adjustmentId) {
    setAdjustments((current) => current.filter((adjustment) => adjustment.id !== adjustmentId));
    setMessage('Ajuste avulso removido');
  }

  function generateReport() {
    if (!report) {
      setMessage('Selecione um motorista para gerar o relatorio');
      return;
    }

    downloadDriverSettlementPdf(report);
    setMessage('Relatorio avulso gerado');
  }

  function closeSettlement() {
    if (!canClose) {
      setMessage('Selecione o motorista e a data de vencimento do saldo');
      return;
    }

    if (!supplierCode) {
      setMessage('Motorista sem fornecedor vinculado. Salve o cadastro do motorista para gerar o fornecedor automaticamente.');
      return;
    }

    const result = closeDriverSettlement({
      existingSettlementId: editingSettlementId,
      driver: selectedDriver,
      dailyRate,
      kmStart,
      kmEnd,
      adjustments,
      excludedFinancialMovementIds,
      dueDate,
    });

    setSettlements(result.settlements);
    setEditingSettlementId('');
    downloadDriverSettlementPdf(result.report);
    setMessage(`Prestacao ${result.settlement.id} fechada e lancamento ${result.payableLaunch.id} criado`);
  }

  function loadReopenedSettlement(settlement) {
    const result = reopenDriverSettlement(settlement.id);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setSettlements(result.settlements);
    setEditingSettlementId(settlement.id);
    setSelectedDriverCpf(formatCpf(settlement.driverCpf));
    setDailyRate(String(settlement.dailyRate || defaultDriverDailyRate));
    setKmStart(settlement.kmStart || '');
    setKmEnd(settlement.kmEnd || '');
    setDueDate(settlement.dueDate || todayValue());
    setAdjustmentName('');
    setAdjustmentAccountingTypeCode('');
    setAdjustmentAmount('');
    setAdjustments(Array.isArray(settlement.adjustments) ? settlement.adjustments : []);
    setExcludedFinancialMovementIds(Array.isArray(settlement.excludedFinancialMovementIds) ? settlement.excludedFinancialMovementIds : []);
    setMessage(`Prestacao ${settlement.id} reaberta para correcao`);
  }

  function toggleFinancialMovement(launchId) {
    setExcludedFinancialMovementIds((current) => (
      current.includes(launchId)
        ? current.filter((id) => id !== launchId)
        : [...current, launchId]
    ));
    setMessage('');
  }

  function clearForm() {
    setSelectedDriverCpf('');
    setDailyRate(String(defaultDriverDailyRate));
    setKmStart('');
    setKmEnd('');
    setDueDate(todayValue());
    setAdjustmentName('');
    setAdjustmentAccountingTypeCode('');
    setAdjustmentAmount('');
    setAdjustments([]);
    setExcludedFinancialMovementIds([]);
    setEditingSettlementId('');
    setMessage('');
  }

  return (
    <section className="driver-accountability-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Prestacao de conta</h1>
          <p className="page-kicker">Fechamento financeiro de motorista por manifestos e valores recebidos</p>
        </div>
      </header>

      <form className="finance-form driver-accountability-form" onSubmit={(event) => event.preventDefault()}>
        {editingSettlementId && (
          <div className="locked-record-notice">
            Prestacao {editingSettlementId} reaberta: ao fechar novamente, o lancamento antigo de saldo sera removido e outro sera criado.
          </div>
        )}

        <div className="form-grid">
          <label className="field field--span-2">
            <span>Motorista</span>
            <select value={selectedDriverCpf} onChange={(event) => handleDriverChange(event.target.value)} required>
              <option value="">Selecione o motorista</option>
              {drivers.map((driver) => (
                <option value={formatCpf(driver.cpf)} key={driver.cpf}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Valor diaria</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={dailyRate}
              onChange={(event) => setDailyRate(event.target.value)}
            />
          </label>

          <label className="field">
            <span>KM inicial</span>
            <input
              type="number"
              min="0"
              step="1"
              value={kmStart}
              onChange={(event) => setKmStart(event.target.value)}
            />
          </label>

          <label className="field">
            <span>KM final</span>
            <input
              type="number"
              min="0"
              step="1"
              value={kmEnd}
              onChange={(event) => setKmEnd(event.target.value)}
            />
          </label>
        </div>

        {report && (
          <>
            <div className="accountability-summary-grid">
              <section className="bi-metric">
                <span>Total recebido</span>
                <strong>{currency(report.totals.totalReceived)}</strong>
                <em>Financeiro + ajustes avulsos</em>
              </section>

              <section className="bi-metric">
                <span>Total de diarias</span>
                <strong>{currency(report.totals.totalDailyAmount)}</strong>
                <em>{report.totals.totalDays} dia(s) x {currency(report.dailyRate)}</em>
              </section>

              <section className="bi-metric">
                <span>Saldo do motorista</span>
                <strong>{currency(report.totals.balance)}</strong>
                <em>{balanceRecipientLabel(report.totals.balance)}</em>
              </section>

              <section className="bi-metric">
                <span>Quem esta devendo</span>
                <strong>{report.debtor}</strong>
                <em>Media: {report.averageKmPerDay.toLocaleString('pt-BR')} km/dia</em>
              </section>
            </div>

            <div className="schedule-layout accountability-layout">
              <section className="registered-launches-panel" aria-labelledby="accountability-manifest-title">
                <div className="registered-launches-header">
                  <h2 id="accountability-manifest-title">Manifestos no periodo</h2>
                  <div>
                    <span>{report.manifests.length} manifesto(s)</span>
                    <strong>{report.totals.totalDays} dia(s)</strong>
                  </div>
                </div>

                <div className="registered-launches-table-wrap">
                  <table className="registered-launches-table accountability-table">
                    <thead>
                      <tr>
                        <th>Manifesto</th>
                        <th>Placa</th>
                        <th>Inicio</th>
                        <th>Fim</th>
                        <th>Origem</th>
                        <th>Destino</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.manifests.map((manifest) => (
                        <tr key={manifest.id}>
                          <td><strong>{manifest.id}</strong></td>
                          <td>{manifest.truckPlate}</td>
                          <td>{formatDateTime(manifest.startDateTime)}</td>
                          <td>{manifest.endDateTime ? formatDateTime(manifest.endDateTime) : 'Aberto'}</td>
                          <td>{manifest.origin}</td>
                          <td>{manifest.destination}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!report.manifests.length && <div className="empty-list">Nenhum manifesto encontrado desde a ultima prestacao</div>}
                </div>
              </section>

              <section className="selection-panel selected-panel" aria-labelledby="accountability-days-title">
                <div className="selection-panel-header">
                  <h2 id="accountability-days-title">Diarias</h2>
                  <strong>{currency(report.totals.totalDailyAmount)}</strong>
                </div>

                <div className="selected-list-box">
                  {report.manifests.map((manifest) => (
                    <div className="selected-launch-row" key={`${manifest.id}-days`}>
                      <div>
                        <strong>{manifest.id}</strong>
                        <small className="accountability-route-line">{manifest.origin} - {manifest.destination}</small>
                        <span>{manifest.days} dia(s) em aberto</span>
                      </div>
                      <div className="settlement-value-stack">
                        <span>Valor diaria: {currency(manifest.dailyRate)}</span>
                        <strong>{currency(manifest.dailyTotal)}</strong>
                      </div>
                    </div>
                  ))}
                  {!report.manifests.length && <div className="empty-list">Sem diarias calculadas</div>}
                </div>
              </section>
            </div>

            <section className="registered-launches-panel" aria-labelledby="accountability-finance-title">
              <div className="registered-launches-header">
                <h2 id="accountability-finance-title">Movimentacoes financeiras consideradas</h2>
                <div>
                  <span>{report.consideredFinancialMovements.length} de {report.financialMovements.length} marcado(s)</span>
                  <strong>{currency(-report.totals.totalReceivedFromFinance)}</strong>
                </div>
              </div>

              <div className="registered-launches-table-wrap">
                <table className="registered-launches-table accountability-table">
                  <thead>
                    <tr>
                      <th>Considerar</th>
                      <th>Lancamento</th>
                      <th>Data/hora</th>
                      <th>Tipo</th>
                      <th>Documento</th>
                      <th>Situacao</th>
                      <th>Valor no relatorio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.financialMovements.map((launch) => (
                      <tr className={launch.considered ? '' : 'accountability-row--muted'} key={launch.id}>
                        <td>
                          <TriStateCheckbox
                            checked={launch.considered}
                            aria-label={`Considerar movimentacao ${launch.id}`}
                            onChange={() => toggleFinancialMovement(launch.id)}
                          />
                        </td>
                        <td><strong>{launch.id}</strong></td>
                        <td>{formatDateTime(launch.eventDate)}</td>
                        <td>{launch.type}</td>
                        <td>{launch.document}</td>
                        <td><span className="launch-status-pill">{launch.status}</span></td>
                        <td>{launch.considered ? currency(launch.reportAmount) : 'Desconsiderada'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!report.financialMovements.length && <div className="empty-list">Nenhuma movimentacao encontrada para o fornecedor do motorista</div>}
              </div>
            </section>

            <div className="schedule-layout accountability-adjustment-layout">
              <section className="registered-launches-panel" aria-labelledby="accountability-adjustment-title">
                <div className="registered-launches-header">
                  <h2 id="accountability-adjustment-title">Ajustes avulsos</h2>
                  <div>
                    <span>{adjustments.length} ajuste(s)</span>
                    <strong>{signedCurrency(report.totals.totalAdjustments)}</strong>
                  </div>
                </div>

                <div className="schedule-one-off-grid accountability-one-off-grid">
                  <label className="field">
                    <span>Nome</span>
                    <input
                      type="text"
                      placeholder="Ex.: adiantamento, desconto"
                      value={adjustmentName}
                      onChange={(event) => setAdjustmentName(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Tipo</span>
                    <select
                      value={adjustmentAccountingTypeCode}
                      onChange={(event) => setAdjustmentAccountingTypeCode(event.target.value)}
                    >
                      <option value="">Sem Tipo</option>
                      {accountingTypes.map((type) => (
                        <option value={type.code} key={type.code}>
                          {type.code} - {type.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Valor</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Pode ser positivo ou negativo"
                      value={adjustmentAmount}
                      onChange={(event) => setAdjustmentAmount(event.target.value)}
                    />
                  </label>

                  <button type="button" className="secondary-button schedule-one-off-add" onClick={addAdjustment}>
                    <Plus size={15} strokeWidth={2.2} />
                    Adicionar
                  </button>
                </div>

                <div className="selected-list-box accountability-adjustment-list">
                  {adjustments.map((adjustment) => (
                    <div className="selected-launch-row selected-launch-row--one-off" key={adjustment.id}>
                      <div>
                        <strong>{adjustment.name}</strong>
                        <span>{adjustmentAccountingTypeLabel(adjustment) || 'Ajuste avulso da prestacao'}</span>
                      </div>
                      <div className="settlement-value-stack">
                        <strong>{signedCurrency(adjustment.amount)}</strong>
                      </div>
                      <button
                        type="button"
                        className="mini-remove-button"
                        aria-label="Remover ajuste avulso"
                        onClick={() => removeAdjustment(adjustment.id)}
                      >
                        <Trash2 size={14} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                  {!adjustments.length && <div className="empty-list">Nenhum ajuste avulso informado</div>}
                </div>
              </section>

              <section className="chart-panel chart-panel--static accountability-chart-panel">
                <span className="chart-title">Principais gastos do motorista</span>
                <strong>{currency(report.totals.totalReceivedFromFinance)}</strong>
                <PieChart data={report.expensePieData} showPercentage />
              </section>
            </div>

            {report.openPayableLaunches.length > 0 && (
              <section className="registered-launches-panel" aria-labelledby="accountability-open-payables-title">
                <div className="registered-launches-header">
                  <h2 id="accountability-open-payables-title">Titulos em aberto para este motorista</h2>
                  <div>
                    <span>{report.openPayableLaunches.length} titulo(s)</span>
                    <strong>{currency(report.openPayableLaunches.reduce((total, launch) => total + Number(launch.amount || 0), 0))}</strong>
                  </div>
                </div>

                <div className="registered-launches-table-wrap">
                  <table className="registered-launches-table accountability-table">
                    <thead>
                      <tr>
                        <SortableTableHeader
                          columns={openPayableSortColumns}
                          sort={openPayableSort}
                          onSortChange={setOpenPayableSort}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOpenPayableLaunches.map((launch) => (
                        <tr key={launch.id}>
                          <td><strong>{launch.id}</strong></td>
                          <td>{launch.type}</td>
                          <td>{launch.document}</td>
                          <td>{launch.dueDate}</td>
                          <td>{currency(launch.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <div className="form-actions accountability-actions">
          <button type="button" className="secondary-button" onClick={generateReport}>
            <FileText size={15} strokeWidth={2.2} />
            Gerar relatorio avulso
          </button>

          <label className="field accountability-due-date">
            <span>Vencimento do saldo</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
          </label>

          <button type="button" className="primary-button" onClick={closeSettlement}>
            Realizar fechamento da prestacao de conta
          </button>

          <button type="button" className="secondary-button" onClick={clearForm}>Limpar</button>
          <span className="status-line" aria-live="polite">{message}</span>
        </div>
      </form>

      <section className="registered-launches-panel accountability-history-panel" aria-labelledby="accountability-history-title">
        <div className="registered-launches-header">
          <h2 id="accountability-history-title">Historico de prestacoes</h2>
          <div>
            <span>{driverSettlements.length} prestacao(oes)</span>
          </div>
        </div>

        <div className="registered-launches-table-wrap">
          <table className="registered-launches-table accountability-table">
            <thead>
              <tr>
                <SortableTableHeader
                  columns={settlementHistorySortColumns}
                  sort={settlementHistorySort}
                  onSortChange={setSettlementHistorySort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedDriverSettlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td><strong>{settlement.id}</strong></td>
                  <td>{settlement.driverName}</td>
                  <td>{formatDateTime(settlement.closedAt || settlement.updatedAt)}</td>
                  <td>{currency(settlement.report?.totals?.balance || 0)}</td>
                  <td>{settlement.report?.debtor || '-'}</td>
                  <td><span className={settlementStatusClass(settlement.status)}>{settlement.status || 'Fechada'}</span></td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button accountability-reopen-button"
                      disabled={String(settlement.status || '').toLowerCase() === 'reaberta'}
                      onClick={() => loadReopenedSettlement(settlement)}
                    >
                      <RotateCcw size={14} strokeWidth={2.2} />
                      Reabrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!driverSettlements.length && <div className="empty-list">Nenhuma prestacao de conta registrada</div>}
        </div>
      </section>
    </section>
  );
}
