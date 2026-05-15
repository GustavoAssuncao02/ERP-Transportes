import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import vexoIconUrl from '../assets/brand/vexo-icon-only.svg';
import { navigationItems } from '../data/siteData.js';

export default function Navbar({ onNavigate }) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  function handleMenuClick(item) {
    if (!item.children) {
      setActiveMenuId(null);
      return;
    }

    setActiveMenuId((currentMenuId) => (currentMenuId === item.id ? null : item.id));
  }

  return (
    <nav className="navbar" aria-label="Menu principal">
      <img className="nav-logo" src={vexoIconUrl} alt="Vexo" />

      <div className="nav-items">
        {navigationItems.map((item) => (
          <div
            className="nav-menu"
            key={item.id}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setActiveMenuId(null);
              }
            }}
          >
            <button
              type="button"
              className="nav-item"
              aria-haspopup={item.children ? 'menu' : undefined}
              aria-expanded={item.children ? activeMenuId === item.id : undefined}
              onClick={() => handleMenuClick(item)}
            >
              <span>{item.label}</span>
              <ChevronDown size={13} strokeWidth={2.4} aria-hidden="true" />
            </button>

            {item.children && (
              <div
                className={`nav-dropdown ${activeMenuId === item.id ? 'nav-dropdown--open' : ''}`}
                role="menu"
                aria-label={`Opções de ${item.label}`}
              >
                {item.children.map((child) => (
                  <button
                    type="button"
                    className="nav-dropdown-item"
                    role="menuitem"
                    key={child.id}
                    onClick={() => {
                      setActiveMenuId(null);
                      onNavigate?.(child);
                    }}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="nav-right">
        <button type="button" className="nav-logout" aria-label="Sair">
          <LogOut size={20} strokeWidth={2.1} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
