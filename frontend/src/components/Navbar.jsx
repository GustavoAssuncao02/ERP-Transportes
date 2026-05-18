import { useState } from 'react';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import vexoIconUrl from '../assets/brand/vexo-icon-only.svg';
import { navigationItems } from '../data/siteData.js';

export default function Navbar({ onNavigate }) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState(null);

  function handleMenuClick(item) {
    if (!item.children) {
      setActiveMenuId(null);
      setActiveSubmenuId(null);
      return;
    }

    setActiveSubmenuId(null);
    setActiveMenuId((currentMenuId) => (currentMenuId === item.id ? null : item.id));
  }

  function navigateTo(item) {
    setActiveMenuId(null);
    setActiveSubmenuId(null);
    onNavigate?.(item);
  }

  function renderDropdownItem(item) {
    if (item.children) {
      const isOpen = activeSubmenuId === item.id;

      return (
        <div
          className="nav-dropdown-group"
          key={item.id}
          onMouseEnter={() => setActiveSubmenuId(item.id)}
          onFocus={() => setActiveSubmenuId(item.id)}
        >
          <button
            type="button"
            className="nav-dropdown-item nav-dropdown-item--parent"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => setActiveSubmenuId((currentId) => (currentId === item.id ? null : item.id))}
          >
            <span>{item.label}</span>
            <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </button>

          <div
            className={`nav-subdropdown ${isOpen ? 'nav-subdropdown--open' : ''}`}
            role="menu"
            aria-label={`Opções de ${item.label}`}
          >
            {item.children.map((child) => (
              <button
                type="button"
                className="nav-dropdown-item"
                role="menuitem"
                key={child.id}
                onClick={() => navigateTo(child)}
              >
                {child.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        className="nav-dropdown-item"
        role="menuitem"
        key={item.id}
        onClick={() => navigateTo(item)}
      >
        {item.label}
      </button>
    );
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
                setActiveSubmenuId(null);
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
                {item.children.map((child) => renderDropdownItem(child))}
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
