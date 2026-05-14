export default function CardGrid({ cards, variant }) {
  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <button type="button" className={`dashboard-card dashboard-card--${variant}`} key={card.id}>
          <span className="sr-only">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
