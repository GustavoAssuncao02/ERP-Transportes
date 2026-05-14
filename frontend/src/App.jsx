import CardGrid from './components/CardGrid.jsx';
import DashboardSection from './components/DashboardSection.jsx';
import Navbar from './components/Navbar.jsx';
import SidebarBrand from './components/SidebarBrand.jsx';
import TabBar from './components/TabBar.jsx';
import UserBar from './components/UserBar.jsx';
import { quickAccessCards, quickQueryCards } from './data/siteData.js';

export default function App() {
  return (
    <div className="app-shell">
      <UserBar />
      <Navbar />
      <TabBar />

      <main className="main-layout">
        <div className="content-area">
          <DashboardSection title="Acesso rápido">
            <CardGrid cards={quickAccessCards} variant="tall" />
          </DashboardSection>

          <DashboardSection title="Consultas rápidas">
            <CardGrid cards={quickQueryCards} variant="short" />
          </DashboardSection>
        </div>

        <SidebarBrand />
      </main>
    </div>
  );
}
