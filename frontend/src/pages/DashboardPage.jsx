import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CardGrid from '../components/CardGrid.jsx';
import DashboardSection from '../components/DashboardSection.jsx';
import { PageLoadingFallback } from '../components/LoadingStates.jsx';
import Navbar from '../components/Navbar.jsx';
import SidebarBrand from '../components/SidebarBrand.jsx';
import TabBar from '../components/TabBar.jsx';
import UserBar from '../components/UserBar.jsx';
import {
  getHomeShortcutCards,
  readHomeShortcutIds,
  saveHomeShortcutIds,
} from '../data/homeShortcuts.js';
import { getPageTitle } from '../data/pageCatalog.js';
import { getQuickQueryCards, quickQueryUpdatedEventName, saveQuickQueryOrder } from '../data/quickQueries.js';
import { tabs as initialTabs } from '../data/siteData.js';

const AccountsPayableDeletionPage = lazy(() => import('./AccountsPayableDeletionPage.jsx'));
const AccountsPayablePage = lazy(() => import('./AccountsPayablePage.jsx'));
const AccountsPayableReportPage = lazy(() => import('./AccountsPayableReportPage.jsx'));
const AccountsPayableSchedulePage = lazy(() => import('./AccountsPayableSchedulePage.jsx'));
const AccountsPayableSettlementPage = lazy(() => import('./AccountsPayableSettlementPage.jsx'));
const AccountsReceivableDashboardPage = lazy(() => import('./AccountsReceivableDashboardPage.jsx'));
const AccountsReceivablePage = lazy(() => import('./AccountsReceivablePage.jsx'));
const AccountsReceivableReportPage = lazy(() => import('./AccountsReceivableReportPage.jsx'));
const AccountsReceivableSettlementPage = lazy(() => import('./AccountsReceivableSettlementPage.jsx'));
const BankManagementPage = lazy(() => import('./BankManagementPage.jsx'));
const BusinessIntelligencePage = lazy(() => import('./BusinessIntelligencePage.jsx'));
const CollectionOrderPage = lazy(() => import('./CollectionOrderPage.jsx'));
const CreateMinutaPage = lazy(() => import('./CreateMinutaPage.jsx'));
const DriverRegistrationPage = lazy(() => import('./DriverRegistrationPage.jsx'));
const DriverAccountabilityPage = lazy(() => import('./DriverAccountabilityPage.jsx'));
const FleetManagementPage = lazy(() => import('./FleetManagementPage.jsx'));
const GenerateManifestPage = lazy(() => import('./GenerateManifestPage.jsx'));
const HomeShortcutsPage = lazy(() => import('./HomeShortcutsPage.jsx'));
const InsuranceRegistrationPage = lazy(() => import('./InsuranceRegistrationPage.jsx'));
const IssueCtePage = lazy(() => import('./IssueCtePage.jsx'));
const OneOffPaymentPage = lazy(() => import('./OneOffPaymentPage.jsx'));
const RegisteredLaunchesPage = lazy(() => import('./RegisteredLaunchesPage.jsx'));
const SettlementReversalPage = lazy(() => import('./SettlementReversalPage.jsx'));
const SupplierRegistrationPage = lazy(() => import('./SupplierRegistrationPage.jsx'));
const SystemUpdatesPage = lazy(() => import('./SystemUpdatesPage.jsx'));
const UnitRegistrationPage = lazy(() => import('./UnitRegistrationPage.jsx'));
const UserManagementPage = lazy(() => import('./UserManagementPage.jsx'));
const VehicleRegistrationPage = lazy(() => import('./VehicleRegistrationPage.jsx'));
const WarehouseManagementPage = lazy(() => import('./WarehouseManagementPage.jsx'));
const WarehouseSettingsPage = lazy(() => import('./WarehouseSettingsPage.jsx'));

export default function DashboardPage() {
  const [openTabs, setOpenTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState('home');
  const [editingLaunch, setEditingLaunch] = useState(null);
  const [activeQuickQuery, setActiveQuickQuery] = useState(null);
  const [homeShortcutIds, setHomeShortcutIds] = useState(readHomeShortcutIds);
  const [quickQueryCards, setQuickQueryCards] = useState(getQuickQueryCards);
  const contentAreaRef = useRef(null);
  const scrollPositionsRef = useRef(new Map());
  const resetScrollTabsRef = useRef(new Set(['home']));
  const homeShortcutCards = useMemo(() => getHomeShortcutCards(homeShortcutIds), [homeShortcutIds]);

  useEffect(() => {
    function refreshQuickQueries() {
      setQuickQueryCards(getQuickQueryCards());
    }

    window.addEventListener(quickQueryUpdatedEventName, refreshQuickQueries);
    window.addEventListener('storage', refreshQuickQueries);
    return () => {
      window.removeEventListener(quickQueryUpdatedEventName, refreshQuickQueries);
      window.removeEventListener('storage', refreshQuickQueries);
    };
  }, []);

  useLayoutEffect(() => {
    const contentArea = contentAreaRef.current;
    if (!contentArea) return;

    const shouldReset = resetScrollTabsRef.current.delete(activeTabId);
    const nextTop = shouldReset ? 0 : scrollPositionsRef.current.get(activeTabId) || 0;

    contentArea.scrollTo({ top: nextTop, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [activeTabId]);

  function rememberActiveScroll() {
    const contentArea = contentAreaRef.current;
    if (!contentArea) return;

    scrollPositionsRef.current.set(activeTabId, contentArea.scrollTop);
  }

  function selectTab(tabId, { resetScroll = false } = {}) {
    if (!tabId) return;

    if (tabId === activeTabId) {
      if (resetScroll) {
        contentAreaRef.current?.scrollTo({ top: 0, left: 0 });
        scrollPositionsRef.current.set(tabId, 0);
      }
      return;
    }

    rememberActiveScroll();
    if (resetScroll) {
      resetScrollTabsRef.current.add(tabId);
    }

    setActiveTabId(tabId);
  }

  function openPage(item) {
    if (!item.pageId) return;

    if (item.quickQuery) {
      setActiveQuickQuery({
        ...item.quickQuery,
        appliedAt: Date.now(),
      });
    } else {
      setActiveQuickQuery((currentQuery) => (
        currentQuery?.pageId === item.pageId ? null : currentQuery
      ));
    }

    setOpenTabs((currentTabs) => {
      if (currentTabs.some((tab) => tab.id === item.pageId)) {
        return currentTabs;
      }

      return [
        ...currentTabs,
        {
          id: item.pageId,
          label: getPageTitle(item.pageId, item.label),
          closable: true,
        },
      ];
    });
    if (item.pageId === 'accounts-payable') {
      setEditingLaunch(null);
    }
    selectTab(item.pageId, { resetScroll: true });
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
          label: getPageTitle(pageId, 'Cadastro de Contas a Pagar'),
          closable: true,
        },
      ];
    });
    setEditingLaunch(launch);
    selectTab(pageId, { resetScroll: true });
  }

  function closeTab(tabId) {
    scrollPositionsRef.current.delete(tabId);
    setOpenTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));

    if (activeTabId === tabId) {
      selectTab('home');
    }
  }

  function closeAllTabs() {
    scrollPositionsRef.current.clear();
    setOpenTabs((currentTabs) => {
      const fixedTabs = currentTabs.filter((tab) => !tab.closable);
      return fixedTabs.length ? fixedTabs : initialTabs;
    });
    selectTab('home', { resetScroll: true });
    setEditingLaunch(null);
  }

  function saveHomeShortcuts(nextShortcutIds) {
    const savedShortcutIds = saveHomeShortcutIds(nextShortcutIds);
    setHomeShortcutIds(savedShortcutIds);
    return savedShortcutIds;
  }

  function reorderIds(ids, draggedId, targetId, placement = 'before') {
    if (!draggedId || !targetId || draggedId === targetId) return ids;

    const nextIds = ids.filter((id) => id !== draggedId);
    const targetIndex = nextIds.indexOf(targetId);

    if (targetIndex < 0) return ids;

    nextIds.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, draggedId);
    return nextIds;
  }

  function reorderHomeShortcutCards(draggedCard, targetCard, placement) {
    const nextShortcutIds = reorderIds(homeShortcutIds, draggedCard.pageId, targetCard.pageId, placement);

    if (nextShortcutIds === homeShortcutIds) return;

    saveHomeShortcuts(nextShortcutIds);
  }

  function reorderQuickQueryCards(draggedCard, targetCard, placement) {
    const currentQueryIds = quickQueryCards.map((card) => card.id);
    const nextQueryIds = reorderIds(
      currentQueryIds,
      draggedCard.id,
      targetCard.id,
      placement,
    );

    if (nextQueryIds === currentQueryIds) return;

    saveQuickQueryOrder(nextQueryIds);
    setQuickQueryCards(getQuickQueryCards());
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

    if (activeTabId === 'bank-management') {
      return <BankManagementPage />;
    }

    if (activeTabId === 'generate-manifest') {
      return (
        <GenerateManifestPage
          initialSavedQuery={activeQuickQuery?.pageId === 'generate-manifest' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'fleet-management') {
      return (
        <FleetManagementPage
          onNavigate={openPage}
          initialSavedQuery={activeQuickQuery?.pageId === 'fleet-management' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'issue-cte') {
      return (
        <IssueCtePage
          onNavigate={openPage}
          initialSavedQuery={activeQuickQuery?.pageId === 'issue-cte' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'collection-order') {
      return (
        <CollectionOrderPage
          initialSavedQuery={activeQuickQuery?.pageId === 'collection-order' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'create-minuta') {
      return (
        <CreateMinutaPage
          initialSavedQuery={activeQuickQuery?.pageId === 'create-minuta' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'vehicle-registration') {
      return (
        <VehicleRegistrationPage
          initialSavedQuery={activeQuickQuery?.pageId === 'vehicle-registration' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'warehouse-management') {
      return (
        <WarehouseManagementPage
          initialSavedQuery={activeQuickQuery?.pageId === 'warehouse-management' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'warehouse-settings') {
      return <WarehouseSettingsPage />;
    }

    if (activeTabId === 'driver-registration') {
      return (
        <DriverRegistrationPage
          initialSavedQuery={activeQuickQuery?.pageId === 'driver-registration' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'supplier-registration') {
      return (
        <SupplierRegistrationPage
          initialSavedQuery={activeQuickQuery?.pageId === 'supplier-registration' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'insurance-registration') {
      return (
        <InsuranceRegistrationPage
          initialSavedQuery={activeQuickQuery?.pageId === 'insurance-registration' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'unit-registration') {
      return <UnitRegistrationPage />;
    }

    if (activeTabId === 'registered-launches') {
      return <RegisteredLaunchesPage onEditLaunch={openLaunchEditor} />;
    }

    if (activeTabId === 'driver-accountability') {
      return <DriverAccountabilityPage />;
    }

    if (activeTabId === 'accounts-payable') {
      return <AccountsPayablePage initialLaunch={editingLaunch} />;
    }

    if (activeTabId === 'accounts-receivable') {
      return <AccountsReceivablePage />;
    }

    if (activeTabId === 'accounts-receivable-report') {
      return (
        <AccountsReceivableReportPage
          initialSavedQuery={activeQuickQuery?.pageId === 'accounts-receivable-report' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
    }

    if (activeTabId === 'accounts-receivable-dashboard') {
      return <AccountsReceivableDashboardPage />;
    }

    if (activeTabId === 'accounts-receivable-settlement') {
      return <AccountsReceivableSettlementPage />;
    }

    if (activeTabId === 'accounts-payable-report') {
      return (
        <AccountsPayableReportPage
          initialSavedQuery={activeQuickQuery?.pageId === 'accounts-payable-report' ? activeQuickQuery : null}
          onSavedQueriesChange={() => setQuickQueryCards(getQuickQueryCards())}
        />
      );
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

    if (activeTabId === 'user-management') {
      return <UserManagementPage />;
    }

    return (
      <>
        <DashboardSection title="Acesso rápido">
          <CardGrid cards={homeShortcutCards} variant="tall" onCardClick={openPage} onReorder={reorderHomeShortcutCards} />
        </DashboardSection>

        <DashboardSection title="Consultas rápidas">
          {quickQueryCards.length ? (
            <CardGrid cards={quickQueryCards} variant="short" onCardClick={openPage} onReorder={reorderQuickQueryCards} />
          ) : (
            <div className="empty-list">Nenhuma consulta rapida salva para este usuario</div>
          )}
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
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onCloseAllTabs={closeAllTabs}
        onReorderTabs={reorderTabs}
      />

      <main className="main-layout">
        <div className="content-area" ref={contentAreaRef}>
          <Suspense fallback={<PageLoadingFallback />}>
            {renderContent()}
          </Suspense>
        </div>

        {activeTabId === 'home' && <SidebarBrand />}
      </main>
    </div>
  );
}

