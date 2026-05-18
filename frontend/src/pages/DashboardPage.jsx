import { useMemo, useState } from 'react';
import AccountsPayableSchedulePage from './AccountsPayableSchedulePage.jsx';
import AccountsPayableDeletionPage from './AccountsPayableDeletionPage.jsx';
import AccountsPayablePage from './AccountsPayablePage.jsx';
import AccountsPayableReportPage from './AccountsPayableReportPage.jsx';
import AccountsPayableSettlementPage from './AccountsPayableSettlementPage.jsx';
import BusinessIntelligencePage from './BusinessIntelligencePage.jsx';
import CollectionOrderPage from './CollectionOrderPage.jsx';
import DriverRegistrationPage from './DriverRegistrationPage.jsx';
import GenerateManifestPage from './GenerateManifestPage.jsx';
import HomeShortcutsPage from './HomeShortcutsPage.jsx';
import IssueCtePage from './IssueCtePage.jsx';
import OneOffPaymentPage from './OneOffPaymentPage.jsx';
import RegisteredLaunchesPage from './RegisteredLaunchesPage.jsx';
import SettlementReversalPage from './SettlementReversalPage.jsx';
import SupplierRegistrationPage from './SupplierRegistrationPage.jsx';
import SystemUpdatesPage from './SystemUpdatesPage.jsx';
import UnitRegistrationPage from './UnitRegistrationPage.jsx';
import VehicleRegistrationPage from './VehicleRegistrationPage.jsx';
import CardGrid from '../components/CardGrid.jsx';
import DashboardSection from '../components/DashboardSection.jsx';
import Navbar from '../components/Navbar.jsx';
import SidebarBrand from '../components/SidebarBrand.jsx';
import TabBar from '../components/TabBar.jsx';
import UserBar from '../components/UserBar.jsx';
import {
  getHomeShortcutCards,
  readHomeShortcutIds,
  saveHomeShortcutIds,
} from '../data/homeShortcuts.js';
import { quickQueryCards, tabs as initialTabs } from '../data/siteData.js';

export default function DashboardPage() {
  const [openTabs, setOpenTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState('home');
  const [editingLaunch, setEditingLaunch] = useState(null);
  const [homeShortcutIds, setHomeShortcutIds] = useState(readHomeShortcutIds);
  const homeShortcutCards = useMemo(() => getHomeShortcutCards(homeShortcutIds), [homeShortcutIds]);

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
    if (item.pageId === 'accounts-payable') {
      setEditingLaunch(null);
    }
    setActiveTabId(item.pageId);
  }

  function openLaunchEditor(launch) {
    const pageId = 'accounts-payable';

    setOpenTabs((currentTabs) => {
      if (currentTabs.some((tab) => tab.id === pageId)) {
        return currentTabs;
      }

      return [
        ...currentTabs,
        {
          id: pageId,
          label: 'Cadastro de Contas a Pagar',
          closable: true,
        },
      ];
    });
    setEditingLaunch(launch);
    setActiveTabId(pageId);
  }

  function closeTab(tabId) {
    setOpenTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));

    if (activeTabId === tabId) {
      setActiveTabId('home');
    }
  }

  function closeAllTabs() {
    setOpenTabs((currentTabs) => {
      const fixedTabs = currentTabs.filter((tab) => !tab.closable);
      return fixedTabs.length ? fixedTabs : initialTabs;
    });
    setActiveTabId('home');
    setEditingLaunch(null);
  }

  function saveHomeShortcuts(nextShortcutIds) {
    const savedShortcutIds = saveHomeShortcutIds(nextShortcutIds);
    setHomeShortcutIds(savedShortcutIds);
    return savedShortcutIds;
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

    if (activeTabId === 'generate-manifest') {
      return <GenerateManifestPage />;
    }

    if (activeTabId === 'issue-cte') {
      return <IssueCtePage onNavigate={openPage} />;
    }

    if (activeTabId === 'collection-order') {
      return <CollectionOrderPage />;
    }

    if (activeTabId === 'vehicle-registration') {
      return <VehicleRegistrationPage />;
    }

    if (activeTabId === 'driver-registration') {
      return <DriverRegistrationPage />;
    }

    if (activeTabId === 'supplier-registration') {
      return <SupplierRegistrationPage />;
    }

    if (activeTabId === 'unit-registration') {
      return <UnitRegistrationPage />;
    }

    if (activeTabId === 'registered-launches') {
      return <RegisteredLaunchesPage onEditLaunch={openLaunchEditor} />;
    }

    if (activeTabId === 'accounts-payable') {
      return <AccountsPayablePage initialLaunch={editingLaunch} />;
    }

    if (activeTabId === 'accounts-payable-report') {
      return <AccountsPayableReportPage />;
    }

    if (activeTabId === 'accounts-payable-settlement') {
      return <AccountsPayableSettlementPage />;
    }

    if (activeTabId === 'accounts-payable-deletion') {
      return <AccountsPayableDeletionPage onOpenLaunchDetails={openLaunchEditor} />;
    }

    if (activeTabId === 'accounts-payable-schedule') {
      return <AccountsPayableSchedulePage onOpenLaunchDetails={openLaunchEditor} />;
    }

    if (activeTabId === 'business-intelligence') {
      return <BusinessIntelligencePage />;
    }

    if (activeTabId === 'settlement-reversal') {
      return <SettlementReversalPage onOpenLaunchDetails={openLaunchEditor} />;
    }

    if (activeTabId === 'home-shortcuts') {
      return <HomeShortcutsPage selectedShortcutIds={homeShortcutIds} onSave={saveHomeShortcuts} />;
    }

    if (activeTabId === 'system-updates') {
      return <SystemUpdatesPage />;
    }

    return (
      <>
        <DashboardSection title="Acesso rápido">
          <CardGrid cards={homeShortcutCards} variant="tall" onCardClick={openPage} />
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
        onCloseAllTabs={closeAllTabs}
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

