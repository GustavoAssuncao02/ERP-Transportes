import { useState } from 'react';
import AccountsPayablePage from './AccountsPayablePage.jsx';
import AccountsPayableReportPage from './AccountsPayableReportPage.jsx';
import AccountsPayableSettlementPage from './AccountsPayableSettlementPage.jsx';
import OneOffPaymentPage from './OneOffPaymentPage.jsx';
import RegisteredLaunchesPage from './RegisteredLaunchesPage.jsx';
import CardGrid from '../components/CardGrid.jsx';
import DashboardSection from '../components/DashboardSection.jsx';
import Navbar from '../components/Navbar.jsx';
import SidebarBrand from '../components/SidebarBrand.jsx';
import TabBar from '../components/TabBar.jsx';
import UserBar from '../components/UserBar.jsx';
import { quickAccessCards, quickQueryCards, tabs as initialTabs } from '../data/siteData.js';

export default function DashboardPage() {
  const [openTabs, setOpenTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState('home');

  function openPage(item) {
    if (!item.pageId) return;

    setOpenTabs((currentTabs) => {
      if (currentTabs.some((tab) => tab.id === item.pageId)) {
        return currentTabs;
      }

      return [
        ...currentTabs,
        {
          id: item.pageId,
          label: item.label,
          closable: true,
        },
      ];
    });
    setActiveTabId(item.pageId);
  }

  function closeTab(tabId) {
    setOpenTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));

    if (activeTabId === tabId) {
      setActiveTabId('home');
    }
  }

  function reorderTabs(draggedTabId, targetTabId, placement) {
    setOpenTabs((currentTabs) => {
      const draggedTab = currentTabs.find((tab) => tab.id === draggedTabId);
      const targetIndex = currentTabs.findIndex((tab) => tab.id === targetTabId);

      if (!draggedTab || targetIndex === -1 || draggedTabId === targetTabId) {
        return currentTabs;
      }

      const reorderedTabs = currentTabs.filter((tab) => tab.id !== draggedTabId);
      const targetIndexAfterRemoval = reorderedTabs.findIndex((tab) => tab.id === targetTabId);
      const insertIndex = placement === 'after' ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;

      reorderedTabs.splice(insertIndex, 0, draggedTab);
      return reorderedTabs;
    });
  }

  function renderContent() {
    if (activeTabId === 'one-off-payment') {
      return <OneOffPaymentPage />;
    }

    if (activeTabId === 'registered-launches') {
      return <RegisteredLaunchesPage />;
    }

    if (activeTabId === 'accounts-payable') {
      return <AccountsPayablePage />;
    }

    if (activeTabId === 'accounts-payable-report') {
      return <AccountsPayableReportPage />;
    }

    if (activeTabId === 'accounts-payable-settlement') {
      return <AccountsPayableSettlementPage />;
    }

    return (
      <>
        <DashboardSection title="Acesso rápido">
          <CardGrid cards={quickAccessCards} variant="tall" />
        </DashboardSection>

        <DashboardSection title="Consultas rápidas">
          <CardGrid cards={quickQueryCards} variant="short" />
        </DashboardSection>
      </>
    );
  }

  return (
    <div className="app-shell">
      <UserBar />
      <Navbar onNavigate={openPage} />
      <TabBar
        tabs={openTabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTab}
        onReorderTabs={reorderTabs}
      />

      <main className="main-layout">
        <div className="content-area">
          {renderContent()}
        </div>

        {activeTabId === 'home' && <SidebarBrand />}
      </main>
    </div>
  );
}
