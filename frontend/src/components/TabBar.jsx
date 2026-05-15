import { useState } from 'react';
import { Home, X } from 'lucide-react';

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onReorderTabs }) {
  const [draggingTabId, setDraggingTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);

  return (
    <div className="tab-bar" role="tablist" aria-label="Abas abertas">
      {tabs.map((tab) => (
        <button
          type="button"
          className={[
            'tab',
            tab.id === activeTabId ? 'tab--active' : 'tab--inactive',
            tab.id === draggingTabId ? 'tab--dragging' : '',
            tab.id === dragOverTabId && tab.id !== draggingTabId ? 'tab--drag-over' : '',
          ].filter(Boolean).join(' ')}
          role="tab"
          aria-selected={tab.id === activeTabId}
          key={tab.id}
          draggable
          onClick={() => onSelectTab(tab.id)}
          onDragStart={(event) => {
            setDraggingTabId(tab.id);
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', tab.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOverTabId(tab.id);
          }}
          onDragLeave={() => {
            if (dragOverTabId === tab.id) {
              setDragOverTabId(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const draggedTabId = event.dataTransfer.getData('text/plain') || draggingTabId;
            const rect = event.currentTarget.getBoundingClientRect();
            const placement = event.clientX > rect.left + rect.width / 2 ? 'after' : 'before';

            if (draggedTabId && draggedTabId !== tab.id) {
              onReorderTabs(draggedTabId, tab.id, placement);
            }

            setDraggingTabId(null);
            setDragOverTabId(null);
          }}
          onDragEnd={() => {
            setDraggingTabId(null);
            setDragOverTabId(null);
          }}
        >
          {tab.icon === 'home' && <Home className="tab-icon" size={14} strokeWidth={2.2} aria-hidden="true" />}
          <span>{tab.label}</span>
          {tab.closable && (
            <span
              className="tab-close"
              aria-hidden="true"
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              <X size={12} strokeWidth={2.4} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
