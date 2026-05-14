import vexoLogoVerticalUrl from '../assets/brand/vexo-logo-vertical.svg';

export default function SidebarBrand() {
  return (
    <aside className="sidebar" aria-label="Marca Vexo ERP">
      <div className="sidebar-inner">
        <img className="sidebar-logo" src={vexoLogoVerticalUrl} alt="Vexo ERP Logístico" />
      </div>
    </aside>
  );
}
