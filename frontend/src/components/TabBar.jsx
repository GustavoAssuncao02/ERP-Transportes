import { Home, X } from 'lucide-react';
import { tabs } from '../data/siteData.js';

export default function TabBar() {
  return (
    <div className="tab-bar" role="tablist" aria-label="Abas abertas">
      {tabs.map((tab) => (
        <button
          type="button"
          className={`tab ${tab.active ? 'tab--active' : 'tab--inactive'}`}
          role="tab"
          aria-selected={tab.active}
          key={tab.id}
        >
          {tab.icon === 'home' && <Home className="tab-icon" size={14} strokeWidth={2.2} aria-hidden="true" />}
          <span>{tab.label}</span>
          {tab.closable && (
            <span className="tab-close" aria-hidden="true">
              <X size={12} strokeWidth={2.4} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
