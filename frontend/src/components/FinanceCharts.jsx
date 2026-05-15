const palette = ['#1a7a72', '#e87722', '#3b6ea8', '#7a5c99', '#b95f5f', '#5f8f3f', '#c08a1a', '#4f7f8f'];

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
}

function describeSlice(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

export function LineChart({ data }) {
  const width = 560;
  const height = 240;
  const paddingX = 42;
  const paddingTop = 22;
  const paddingBottom = 38;
  const chartWidth = width - (paddingX * 2);
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const bottom = height - paddingBottom;
  const pointStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = data.length > 1 ? paddingX + (index * pointStep) : width / 2;
    const y = bottom - ((item.value / maxValue) * chartHeight);
    return { ...item, x, y };
  });

  if (!data.length) {
    return <div className="chart-empty">Sem dados</div>;
  }

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafico em linha">
      <line x1={paddingX} y1={bottom} x2={width - paddingX} y2={bottom} className="chart-axis" />
      <line x1={paddingX} y1={paddingTop} x2={paddingX} y2={bottom} className="chart-axis" />
      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        className="line-chart-path"
      />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4" className="line-chart-dot" />
          <text x={point.x} y={point.y - 9} textAnchor="middle" className="line-chart-value">
            {point.value.toLocaleString('pt-BR')}
          </text>
        </g>
      ))}
      <text x={paddingX} y={height - 12} textAnchor="start" className="line-chart-label">
        {points[0]?.label}
      </text>
      <text x={width - paddingX} y={height - 12} textAnchor="end" className="line-chart-label">
        {points[points.length - 1]?.label}
      </text>
    </svg>
  );
}

export function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;

  if (!data.length || total <= 0) {
    return <div className="chart-empty">Sem dados</div>;
  }

  return (
    <div className="pie-chart-layout">
      <svg className="pie-chart" viewBox="0 0 220 220" role="img" aria-label="Grafico de pizza">
        {data.map((item, index) => {
          const startAngle = (cumulative / total) * 360;
          const endAngle = ((cumulative + item.value) / total) * 360;
          cumulative += item.value;
          const color = palette[index % palette.length];

          if (item.value === total) {
            return <circle key={item.label} cx="110" cy="110" r="82" fill={color} />;
          }

          return (
            <path
              key={item.label}
              d={describeSlice(110, 110, 82, startAngle, endAngle)}
              fill={color}
            />
          );
        })}
      </svg>

      <div className="pie-legend">
        {data.map((item, index) => (
          <div className="pie-legend-row" key={item.label}>
            <span style={{ background: palette[index % palette.length] }} />
            <strong>{item.label}</strong>
            <em>{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</em>
          </div>
        ))}
      </div>
    </div>
  );
}
