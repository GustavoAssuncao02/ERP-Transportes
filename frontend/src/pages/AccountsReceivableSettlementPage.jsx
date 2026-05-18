import { useMemo, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { currency, normalizeText, paymentBanks, toNumber, todayValue } from '../data/financeData.js';
import {
  readReceivables,
  receivableSearchText,
  settleReceivable,
} from '../data/accountsReceivableRegistry.js';

const receiptMethods = ['Boleto', 'Pix', 'Transferencia', 'Cartao', 'Dinheiro', 'Deposito'];

function isReceivablePending(receivable) {
  return toNumber(receivable.openBalance) > 0 && receivable.status !== 'Cancelado';
}

export default function AccountsReceivableSettlementPage() {
  const today = todayValue();
  const [receivables, setReceivables] = useState(readReceivables);
  const [selectedId, setSelectedId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pendentes');
  const [forecastStart, setForecastStart] = useState('');
  const [forecastEnd, setForecastEnd] = useState('');
  const [settlementDate, setSettlementDate] = useState(today);
  const [paymentBank, setPaymentBank] = useState('');
  const [receiptMethod, setReceiptMethod] = useState('Pix');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [status, setStatus] = useAutoClearMessage();

  const selectedReceivable = useMemo(
    () => receivables.find((receivable) => receivable.id === selectedId) || null,
    [receivables, selectedId],
  );

  const summary = useMemo(() => {
    const pendingTitles = receivables.filter(isReceivablePending);
    const openTotal = pendingTitles.reduce((total, receivable) => total + toNumber(receivable.openBalance), 0);
    const overdueTotal = pendingTitles
      .filter((receivable) => receivable.paymentForecastDate && receivable.paymentForecastDate < today)
      .reduce((total, receivable) => total + toNumber(receivable.openBalance), 0);
    const receivedToday = receivables.reduce((total, receivable) => (
      total + (receivable.settlements || [])
        .filter((settlement) => settlement.date === today)
        .reduce((settlementTotal, settlement) => settlementTotal + toNumber(settlement.amount), 0)
    ), 0);

    return {
      pendingCount: pendingTitles.length,
      openTotal,
      overdueTotal,
      receivedToday,
    };
  }, [receivables, today]);

  const visibleReceivables = useMemo(() => {
    const query = normalizeText(searchTerm);

    return receivables
      .filter((receivable) => {
        const pending = isReceivablePending(receivable);
        const searchMatches = !query || normalizeText(receivableSearchText(receivable)).includes(query);
        const startMatches = !forecastStart || receivable.paymentForecastDate >= forecastStart;
        const endMatches = !forecastEnd || receivable.paymentForecastDate <= forecastEnd;
        const statusMatches = statusFilter === 'todos'
          || (statusFilter === 'pendentes' && pending)
          || receivable.status === statusFilter;

        return pending && searchMatches && startMatches && endMatches && statusMatches;
      })
      .sort((left, right) => {
        const dateCompare = String(left.paymentForecastDate || '').localeCompare(String(right.paymentForecastDate || ''), 'pt-BR');
        return dateCompare || left.id.localeCompare(right.id, 'pt-BR');
      });
  }, [forecastEnd, forecastStart, receivables, searchTerm, statusFilter]);

  const selectedBalance = selectedReceivable ? toNumber(selectedReceivable.openBalance) : 0;
  const receiptAmount = toNumber(settlementAmount);
  const previewAmount = receiptAmount > 0 ? Math.min(receiptAmount, selectedBalance) : selectedBalance;

  function selectReceivable(receivable) {
    setSelectedId(receivable.id);
    setSettlementAmount(toNumber(receivable.openBalance).toFixed(2));
    setStatus('');
  }

  function clearSelection() {
    setSelectedId('');
    setSettlementAmount('');
    setSettlementNote('');
    setStatus('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedReceivable) {
      setStatus('Selecione um titulo para baixar');
      return;
    }

    if (!settlementDate || settlementDate > today) {
      setStatus('A data da baixa nao pode ser futura');
      return;
    }

    if (!paymentBank) {
      setStatus('Selecione o banco do recebimento');
      return;
    }

    if (!receiptMethod) {
      setStatus('Selecione a forma de recebimento');
      return;
    }

    if (receiptAmount <= 0) {
      setStatus('Informe um valor de baixa maior que zero');
      return;
    }

    if (receiptAmount > selectedBalance) {
      setStatus(`O valor da baixa nao pode superar o saldo de ${currency(selectedBalance)}`);
      return;
    }

    const { receivables: nextReceivables, receivable } = settleReceivable({
      id: selectedReceivable.id,
      amount: receiptAmount,
      settlementDate,
      bank: paymentBank,
      method: receiptMethod,
      note: settlementNote,
    });

    if (!receivable) {
      setStatus('Titulo nao encontrado para baixa');
      return;
    }

    setReceivables(nextReceivables);
    setSelectedId(receivable.id);
    setSettlementAmount(toNumber(receivable.openBalance) > 0 ? toNumber(receivable.openBalance).toFixed(2) : '');
    setSettlementNote('');
    setStatus(`Baixa registrada no banco ${paymentBank}`);
  }

  return (
    <section className="accounts-receivable-settlement-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Baixa de Titulos a Receber</h1>
          <p className="page-kicker">Recebimento de titulos com banco, saldo e lancamento contabil</p>
        </div>
      </header>

      <div className="receivable-settlement-summary">
        <div>
          <span>Titulos em aberto</span>
          <strong>{summary.pendingCount}</strong>
        </div>
        <div>
          <span>Saldo a receber</span>
          <strong>{currency(summary.openTotal)}</strong>
        </div>
        <div>
          <span>Vencidos</span>
          <strong>{currency(summary.overdueTotal)}</strong>
        </div>
        <div>
          <span>Recebido hoje</span>
          <strong>{currency(summary.receivedToday)}</strong>
        </div>
      </div>

      <form className="finance-form settlement-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Data da baixa</span>
            <input type="date" max={today} value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} required />
          </label>

          <label className="field">
            <span>Banco</span>
            <select value={paymentBank} onChange={(event) => setPaymentBank(event.target.value)} required>
              <option value="">Selecione</option>
              {paymentBanks.map((bank) => (
                <option value={bank} key={bank}>{bank}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Forma de recebimento</span>
            <select value={receiptMethod} onChange={(event) => setReceiptMethod(event.target.value)} required>
              {receiptMethods.map((method) => (
                <option value={method} key={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="pendentes">Pendentes</option>
              <option value="Aberto">Aberto</option>
              <option value="Vencido">Vencido</option>
              <option value="Parcial">Parcial</option>
              <option value="todos">Todos em aberto</option>
            </select>
          </label>

          <label className="field">
            <span>Previsao inicial</span>
            <input type="date" value={forecastStart} onChange={(event) => setForecastStart(event.target.value)} />
          </label>

          <label className="field">
            <span>Previsao final</span>
            <input type="date" value={forecastEnd} onChange={(event) => setForecastEnd(event.target.value)} />
          </label>

          <label className="field field--span-2">
            <span>Pesquisar titulo, cliente ou documento</span>
            <div className="settlement-search receivable-settlement-search">
              <Search size={16} strokeWidth={2.2} aria-hidden="true" />
              <input
                type="search"
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="settlement-layout receivable-settlement-layout">
          <section className="selection-panel" aria-labelledby="receivable-titles-title">
            <div className="selection-panel-header">
              <h2 id="receivable-titles-title">Titulos disponiveis para baixa</h2>
              <strong>{visibleReceivables.length} titulo(s)</strong>
            </div>

            <div className="launch-list receivable-title-list">
              {visibleReceivables.map((receivable) => {
                const isSelected = receivable.id === selectedId;

                return (
                  <div className={`launch-row receivable-title-row ${isSelected ? 'launch-row--selected' : ''}`} key={receivable.id}>
                    <div>
                      <strong>{receivable.id}</strong>
                      <span>{receivable.customerName} - {receivable.customerDocument}</span>
                    </div>
                    <div>
                      <span>Previsao: {receivable.paymentForecastDate || '-'}</span>
                      <span>Saldo: {currency(receivable.openBalance)}</span>
                      <span>{receivable.status}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Selecionar ${receivable.id}`}
                      title="Selecionar titulo"
                      onClick={() => selectReceivable(receivable)}
                    >
                      <Receipt size={17} strokeWidth={2.2} />
                    </button>
                  </div>
                );
              })}
              {!visibleReceivables.length && <div className="empty-list">Nenhum titulo em aberto encontrado</div>}
            </div>
          </section>

          <section className="selection-panel selected-panel" aria-labelledby="selected-receivable-title">
            <div className="selection-panel-header">
              <h2 id="selected-receivable-title">Titulo selecionado</h2>
              <strong>{selectedReceivable ? currency(selectedBalance) : currency(0)}</strong>
            </div>

            {selectedReceivable ? (
              <div className="receivable-settlement-details">
                <div className="receivable-selected-card">
                  <strong>{selectedReceivable.id}</strong>
                  <span>{selectedReceivable.customerName}</span>
                  <span>{selectedReceivable.cteId || selectedReceivable.nfeNumber || selectedReceivable.collectionOrderId || 'Sem documento vinculado'}</span>
                </div>

                <div className="receivable-balance-grid">
                  <div>
                    <span>Original</span>
                    <strong>{currency(selectedReceivable.originalValue)}</strong>
                  </div>
                  <div>
                    <span>Pago</span>
                    <strong>{currency(selectedReceivable.paidValue)}</strong>
                  </div>
                  <div>
                    <span>Saldo</span>
                    <strong>{currency(selectedReceivable.openBalance)}</strong>
                  </div>
                </div>

                <label className="field">
                  <span>Valor da baixa</span>
                  <input
                    type="number"
                    min="0.01"
                    max={selectedBalance}
                    step="0.01"
                    value={settlementAmount}
                    onChange={(event) => setSettlementAmount(event.target.value)}
                    required
                  />
                </label>

                <label className="field">
                  <span>Observacao da baixa</span>
                  <textarea
                    value={settlementNote}
                    onChange={(event) => setSettlementNote(event.target.value)}
                    placeholder="Comprovante, conciliacao ou detalhe do recebimento"
                  />
                </label>

                <div className="receivable-accounting-preview" aria-label="Previa contabil">
                  <div>
                    <span>Debito</span>
                    <strong>{paymentBank || 'Selecione o banco'}</strong>
                  </div>
                  <div>
                    <span>Credito</span>
                    <strong>Clientes / Contas a Receber</strong>
                  </div>
                  <div>
                    <span>Valor</span>
                    <strong>{currency(previewAmount)}</strong>
                  </div>
                </div>

                <div className="receivable-history">
                  <strong>Historico de baixas</strong>
                  {(selectedReceivable.settlements || []).map((settlement) => (
                    <div key={settlement.id}>
                      <span>{settlement.date} - {settlement.bank}</span>
                      <strong>{currency(settlement.amount)}</strong>
                    </div>
                  ))}
                  {!(selectedReceivable.settlements || []).length && <span>Nenhuma baixa registrada</span>}
                </div>
              </div>
            ) : (
              <div className="empty-list">Selecione um titulo para informar o recebimento</div>
            )}
          </section>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={!selectedReceivable}>Registrar baixa</button>
          <button type="button" className="secondary-button" onClick={clearSelection}>Limpar selecao</button>
          <span className="status-line" aria-live="polite">{status}</span>
        </div>
      </form>
    </section>
  );
}
