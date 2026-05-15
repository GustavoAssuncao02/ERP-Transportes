import { moduleIcons } from '../assets/icons/modules/index.js';

export default function CardGrid({ cards, variant, onCardClick }) {
  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <button
          type="button"
          className={`dashboard-card dashboard-card--${variant}`}
          key={card.id}
          onClick={() => onCardClick?.(card)}
        >
          {card.icon && moduleIcons[card.icon] && (
            <img className="dashboard-card-icon" src={moduleIcons[card.icon]} alt="" aria-hidden="true" />
          )}
          <span className="dashboard-card-label">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
