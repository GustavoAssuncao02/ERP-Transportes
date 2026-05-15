import { useMemo, useState } from 'react';
import { LineChart, PieChart } from '../components/FinanceCharts.jsx';
import { currency, financeLaunches, todayValue } from '../data/financeData.js';

function groupByDate(launches, field) {
  const grouped = new Map();

  launches.forEach((launch) => {
    const key = launch[field];
    if (!key) return;
    grouped.set(key, (grouped.get(key) || 0) + launch.amount);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function groupByType(launches) {
  const grouped = new Map();

  launches.forEach((launch) => {
    grouped.set(launch.type, (grouped.get(launch.type) || 0) + launch.amount);
  });

  return [...grouped.entries()]
    .sort(([, leftValue], [, rightValue]) => rightValue - leftValue)
    .map(([label, value]) => ({ label, value }));
}

function totalAmount(launches) {
  return launches.reduce((sum, launch) => sum + launch.amount, 0);
}

function MetricCard({ label, value, detail }) {
  return (
    <section className="bi-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </section>
  );
}

function ChartButton({ title, subtitle, children, onClick }) {
  return (
    <button type="button" className="chart-panel" onClick={onClick}>
      <span className="chart-title">{title}</span>
      <strong>{subtitle}</strong>
      {children}
    </button>
  );
}

function LaunchReport({ title, launches }) {
  const total = totalAmount(launches);

  return (
    <section className="bi-report-panel" aria-labelledby="bi-report-title">
      <div className="registered-launches-header">
        <h2 id="bi-report-title">{title}</h2>
        <div>
          <span>{launches.length} titulo(s)</span>
          <strong>{currency(total)}</strong>
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
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th>Valor</th>
              <th>Situacao</th>
            </tr>
          </thead>
          <tbody>
            {launches.map((launch) => (
              <tr key={launch.id}>
                <td><strong>{launch.id}</strong></td>
                <td>{launch.unit}</td>
                <td>{launch.supplier}</td>
                <td>{launch.document}</td>
                <td>{launch.type}</td>
                <td>{launch.dueDate}</td>
                <td>{launch.paymentDate || '-'}</td>
                <td>{currency(launch.amount)}</td>
                <td><span className="launch-status-pill">{launch.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {!launches.length && <div className="empty-list">Nenhum titulo encontrado</div>}
      </div>
    </section>
  );
}

export default function BusinessIntelligencePage() {
  const today = todayValue();
  const [report, setReport] = useState({ title: 'Lancamentos em aberto', launches: financeLaunches.filter((launch) => launch.status === 'Aberto') });

  const data = useMemo(() => {
    const open = financeLaunches.filter((launch) => launch.status === 'Aberto');
    const paid = financeLaunches.filter((launch) => launch.status === 'Baixado');
    const future = open.filter((launch) => launch.dueDate > today);
    const dueToday = open.filter((launch) => launch.dueDate === today);
    const overdue = open.filter((launch) => launch.dueDate < today);

    return {
      open,
      paid,
      future,
      dueToday,
      overdue,
      futureLine: groupByDate(future, 'dueDate'),
      paidLine: groupByDate(paid, 'paymentDate'),
      dueTodayPie: groupByType(dueToday),
      futurePie: groupByType(future),
      paidPie: groupByType(paid),
      overduePie: groupByType(overdue),
    };
  }, [today]);

  return (
    <section className="business-intelligence-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Business Intelligence</h1>
          <p className="page-kicker">Indicadores financeiros de contas a pagar</p>
        </div>
      </header>

      <div className="bi-metrics-grid">
        <MetricCard label="Lancamentos em aberto" value={data.open.length} detail={currency(totalAmount(data.open))} />
        <MetricCard label="Lancamentos baixados" value={data.paid.length} detail={currency(totalAmount(data.paid))} />
        <MetricCard label="Vencidos em aberto" value={data.overdue.length} detail={currency(totalAmount(data.overdue))} />
        <MetricCard label="Vencendo hoje" value={data.dueToday.length} detail={currency(totalAmount(data.dueToday))} />
        <MetricCard label="Programaveis futuros" value={data.future.length} detail={currency(totalAmount(data.future))} />
      </div>

      <div className="bi-chart-grid">
        <ChartButton
          title="Contas a pagar no futuro"
          subtitle={currency(totalAmount(data.future))}
          onClick={() => setReport({ title: 'Contas a pagar no futuro', launches: data.future })}
        >
          <LineChart data={data.futureLine} />
        </ChartButton>

        <ChartButton
          title="Contas pagas"
          subtitle={currency(totalAmount(data.paid))}
          onClick={() => setReport({ title: 'Contas pagas', launches: data.paid })}
        >
          <LineChart data={data.paidLine} />
        </ChartButton>

        <ChartButton
          title="A pagar hoje por tipo"
          subtitle={currency(totalAmount(data.dueToday))}
          onClick={() => setReport({ title: 'Lancamentos a pagar hoje', launches: data.dueToday })}
        >
          <PieChart data={data.dueTodayPie} />
        </ChartButton>

        <ChartButton
          title="Futuros por tipo"
          subtitle={currency(totalAmount(data.future))}
          onClick={() => setReport({ title: 'Lancamentos futuros', launches: data.future })}
        >
          <PieChart data={data.futurePie} />
        </ChartButton>

        <ChartButton
          title="Baixados por tipo"
          subtitle={currency(totalAmount(data.paid))}
          onClick={() => setReport({ title: 'Lancamentos baixados', launches: data.paid })}
        >
          <PieChart data={data.paidPie} />
        </ChartButton>

        <ChartButton
          title="Vencidos por tipo"
          subtitle={currency(totalAmount(data.overdue))}
          onClick={() => setReport({ title: 'Lancamentos vencidos', launches: data.overdue })}
        >
          <PieChart data={data.overduePie} />
        </ChartButton>
      </div>

      <LaunchReport title={report.title} launches={report.launches} />
    </section>
  );
}
