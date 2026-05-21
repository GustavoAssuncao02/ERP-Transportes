import { useRef, useState } from 'react';
import { moduleIcons } from '../assets/icons/modules/index.js';

export default function CardGrid({ cards, variant, onCardClick, onReorder }) {
  const [draggedCardId, setDraggedCardId] = useState('');
  const [dropTargetCardId, setDropTargetCardId] = useState('');
  const draggedCardIdRef = useRef('');
  const suppressNextClickRef = useRef(false);
  const canReorder = Boolean(onReorder);

  function handleDragStart(event, card) {
    if (!canReorder) return;

    draggedCardIdRef.current = card.id;
    setDraggedCardId(card.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.id);
  }

  function handleDragOver(event, card) {
    const sourceCardId = draggedCardIdRef.current || draggedCardId;

    if (!canReorder || !sourceCardId || sourceCardId === card.id) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetCardId(card.id);
  }

  function getDropPlacement(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const afterHorizontalMiddle = event.clientX >= rect.left + (rect.width / 2);
    const afterVerticalMiddle = event.clientY >= rect.top + (rect.height / 2);

    return afterHorizontalMiddle || afterVerticalMiddle ? 'after' : 'before';
  }

  function handleDrop(event, targetCard) {
    if (!canReorder) return;

    event.preventDefault();
    const sourceCardId = event.dataTransfer.getData('text/plain') || draggedCardIdRef.current || draggedCardId;
    const sourceCard = cards.find((card) => card.id === sourceCardId);
    const placement = getDropPlacement(event);

    draggedCardIdRef.current = '';
    setDraggedCardId('');
    setDropTargetCardId('');

    if (!sourceCard || sourceCard.id === targetCard.id) return;

    suppressNextClickRef.current = true;
    onReorder(sourceCard, targetCard, placement);
  }

  function handleDragEnd() {
    draggedCardIdRef.current = '';
    setDraggedCardId('');
    setDropTargetCardId('');
    setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 150);
  }

  function handleClick(card) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    onCardClick?.(card);
  }

  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <button
          type="button"
          className={`dashboard-card dashboard-card--${variant}${draggedCardId === card.id ? ' dashboard-card--dragging' : ''}${dropTargetCardId === card.id ? ' dashboard-card--drop-target' : ''}`}
          draggable={canReorder}
          key={card.id}
          onClick={() => handleClick(card)}
          onDragStart={(event) => handleDragStart(event, card)}
          onDragOver={(event) => handleDragOver(event, card)}
          onDragLeave={() => {
            if (dropTargetCardId === card.id) {
              setDropTargetCardId('');
            }
          }}
          onDrop={(event) => handleDrop(event, card)}
          onDragEnd={handleDragEnd}
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
