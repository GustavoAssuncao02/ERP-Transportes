import { useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, ChevronRight, PackagePlus, Plus, Search, Warehouse, X } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  blueprintSectors,
  blueprintViewBox,
  defaultSectorId,
  getSectorWeightLimit,
  readWarehouseWeightSettings,
  sectorDepotMap,
  validSectorIds,
  warehouseCargoStorageKey,
  warehouseColumnCount,
  warehouseDepots,
  warehouseRowCount,
  warehouseWalls,
} from '../data/warehouseRegistry.js';

const warehouseExitStatus = 'Concluído';

const statusOptions = [
  'Aguardando roteirização',
  'Aguardando expedição',
  'Aguardando coleta',
  'Conferido',
  'Separação',
  'Roteirizado',
  'Bloqueio fiscal',
];

const invoiceStatusOptions = [...statusOptions, warehouseExitStatus];

const customerOptions = [
  'Atlas Equipamentos',
  'Transportadora Nordeste',
  'Embalagens Costa',
  'Rede Litoral',
  'Construtora Ponte Alta',
  'Mercantil São Jorge',
  'Distribuidora Bahia Sul',
  'Cliente não informado',
];

function createCargoFormItem() {
  return {
    id: `form-item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: '',
    quantity: '1',
    weight: '',
  };
}

function createCargoForm() {
  return {
    invoice: '',
    customer: '',
    status: statusOptions[0],
    items: [createCargoFormItem()],
  };
}

const demoWarehouseSectors = [
  'A1', 'C1', 'E1', 'G1', 'H1', 'I1', 'J1', 'K1', 'O1', 'P1',
  'Q1', 'R1', 'S1', 'T1', 'O2', 'P2', 'Q2', 'R2', 'S2', 'T2',
  'B3', 'D3', 'F3', 'G3', 'H3', 'I3', 'J3', 'L3', 'Q3', 'R3',
  'S3', 'T3', 'B4', 'D4', 'F4', 'G4', 'H4', 'I4', 'J4', 'M4',
  'N4', 'O4', 'B5', 'D5', 'F5', 'G5', 'H5', 'I5', 'L5', 'T5',
];

const demoWarehouseCustomers = [
  'Atlas Equipamentos',
  'Transportadora Nordeste',
  'Embalagens Costa',
  'Rede Litoral',
  'Construtora Ponte Alta',
  'Mercantil São Jorge',
  'Distribuidora Bahia Sul',
  'Supermercados Recôncavo',
  'Farmalog Nordeste',
  'Auto Peças Camaçari',
];

const demoWarehouseProducts = [
  'Motor elétrico WEG 5CV',
  'Kit sensores industriais',
  'Bobina plástica stretch',
  'Caixa de autopeças',
  'Eletrodoméstico pequeno',
  'Ferramentas manuais',
  'Medicamentos lacrados',
  'Alimentos não perecíveis',
  'Peças de reposição',
  'Componentes eletrônicos',
  'Tintas embaladas',
  'Materiais de construção',
  'Cabos elétricos',
  'Produtos de higiene',
  'Equipamentos de proteção',
];

const extraDemoEmptySectorInvoices = [
  { sectorId: 'O5', invoice: 'NF-3001', customer: 'Atlas Equipamentos', description: 'Inversores industriais', quantity: 2, weight: 180, status: 'Conferido' },
  { sectorId: 'O6', invoice: 'NF-3002', customer: 'Transportadora Nordeste', description: 'Caixas de rolamentos', quantity: 4, weight: 96, status: 'Aguardando coleta' },
  { sectorId: 'P5', invoice: 'NF-3003', customer: 'Embalagens Costa', description: 'Filmes termoencolhíveis', quantity: 6, weight: 220, status: 'Separação' },
  { sectorId: 'P6', invoice: 'NF-3004', customer: 'Rede Litoral', description: 'Peças de linha branca', quantity: 3, weight: 145, status: 'Roteirizado' },
  { sectorId: 'Q5', invoice: 'NF-3005', customer: 'Construtora Ponte Alta', description: 'Discos de corte', quantity: 8, weight: 74, status: 'Aguardando expedição' },
  { sectorId: 'Q6', invoice: 'NF-3006', customer: 'Mercantil São Jorge', description: 'Fardos de higiene', quantity: 10, weight: 310, status: 'Conferido' },
  { sectorId: 'R5', invoice: 'NF-3007', customer: 'Distribuidora Bahia Sul', description: 'Cabos flexíveis', quantity: 5, weight: 265, status: 'Aguardando roteirização' },
  { sectorId: 'R6', invoice: 'NF-3008', customer: 'Supermercados Recôncavo', description: 'Alimentos embalados', quantity: 12, weight: 430, status: 'Aguardando coleta' },
  { sectorId: 'S5', invoice: 'NF-3009', customer: 'Farmalog Nordeste', description: 'Medicamentos lacrados', quantity: 7, weight: 88, status: 'Bloqueio fiscal' },
  { sectorId: 'S6', invoice: 'NF-3010', customer: 'Auto Peças Camaçari', description: 'Kits de amortecedores', quantity: 4, weight: 240, status: 'Separação' },
];

const demoCompletedInvoiceSectors = [
  'H4', 'H4', 'H4', 'A1', 'C1', 'E1', 'G1', 'I1', 'J1', 'K1',
  'O1', 'P1', 'Q1', 'R1', 'S1', 'T1', 'O2', 'P2', 'Q2', 'R2',
  'S2', 'T2', 'B3', 'D3', 'F3', 'G3', 'H3', 'I3', 'J3', 'L3',
  'Q3', 'R3', 'S3', 'T3', 'B4', 'D4', 'F4', 'G4', 'I4', 'J4',
];
const demoCompletedInvoiceCount = 160;

function getSectorOrDefault(sectorId) {
  return validSectorIds.has(sectorId) ? sectorId : defaultSectorId;
}

function createDemoWarehouseInvoices() {
  return Array.from({ length: 150 }, (_, index) => {
    const invoiceIndex = index + 1;
    const itemCount = (index % 5 === 0) ? 3 : (index % 3 === 0) ? 2 : 1;
    const customer = demoWarehouseCustomers[index % demoWarehouseCustomers.length];

    return {
      invoice: `NF-${String(1000 + invoiceIndex).padStart(4, '0')}`,
      sectorId: getSectorOrDefault(demoWarehouseSectors[index % demoWarehouseSectors.length]),
      customer,
      status: statusOptions[index % statusOptions.length],
      items: Array.from({ length: itemCount }, (_, itemIndex) => ({
        description: demoWarehouseProducts[(index + itemIndex) % demoWarehouseProducts.length],
        quantity: ((index + itemIndex) % 8) + 1,
        weight: 35 + ((index * 17) + (itemIndex * 29)) % 620,
      })),
    };
  });
}

function createDemoCompletedInvoices() {
  return Array.from({ length: demoCompletedInvoiceCount }, (_, index) => {
    const sectorId = demoCompletedInvoiceSectors[index % demoCompletedInvoiceSectors.length];

    return {
      invoice: `NF-${String(9001 + index).padStart(4, '0')}`,
      sectorId: getSectorOrDefault(sectorId),
      customer: demoWarehouseCustomers[(index + 2) % demoWarehouseCustomers.length],
      status: warehouseExitStatus,
      items: [{
        description: demoWarehouseProducts[(index + 5) % demoWarehouseProducts.length],
        quantity: (index % 4) + 1,
        weight: Number((0.6 + (((index * 7) % 22) / 10)).toFixed(1)),
      }],
    };
  });
}

const demoWarehouseInvoices = [
  ...createDemoWarehouseInvoices(),
  ...createDemoCompletedInvoices(),
  ...extraDemoEmptySectorInvoices.map((invoice) => ({
    ...invoice,
    sectorId: getSectorOrDefault(invoice.sectorId),
    items: [{
      description: invoice.description,
      quantity: invoice.quantity,
      weight: invoice.weight,
    }],
  })),
];

const initialCargoItems = demoWarehouseInvoices.flatMap((invoice) => (
  invoice.items.map((item, itemIndex) => ({
    id: `demo-${invoice.invoice.toLowerCase()}-${itemIndex + 1}`,
    sectorId: invoice.sectorId,
    invoice: invoice.invoice,
    description: item.description,
    customer: invoice.customer,
    quantity: item.quantity,
    weight: item.weight,
    status: invoice.status,
  }))
));

const weightFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const reportTextSorter = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

const reportSortColumns = [
  { key: 'sectorId', label: 'Setor', type: 'text', getValue: (item) => item.sectorId },
  { key: 'invoice', label: 'NF', type: 'text', getValue: (item) => item.invoice },
  { key: 'customer', label: 'Cliente', type: 'text', getValue: (item) => item.customer },
  { key: 'description', label: 'Item', type: 'text', getValue: (item) => item.description },
  { key: 'quantity', label: 'Quantidade', type: 'number', getValue: (item) => item.quantity },
  { key: 'weight', label: 'Peso', type: 'number', getValue: (item) => item.weight },
  { key: 'status', label: 'Status', type: 'text', getValue: (item) => item.status },
];

const inventorySortColumns = [
  { key: 'name', label: 'Produto', type: 'text', getValue: (item) => item.name },
  { key: 'quantity', label: 'Quantidade', type: 'number', getValue: (item) => item.quantity },
  { key: 'itemCount', label: 'Itens', type: 'number', getValue: (item) => item.itemCount },
  { key: 'weight', label: 'Peso', type: 'number', getValue: (item) => item.weight },
  { key: 'invoiceCount', label: 'NFs', type: 'number', getValue: (item) => item.invoiceCount },
  { key: 'sectorCount', label: 'Setores', type: 'number', getValue: (item) => item.sectorCount },
];

function getReportDefaultDirection(column) {
  return column.type === 'number' ? 'desc' : 'asc';
}

function getReportSortLabel(column, direction) {
  if (column.type === 'number') {
    return direction === 'asc' ? '1-9' : '9-1';
  }

  return direction === 'asc' ? 'A-Z' : 'Z-A';
}

function compareReportFallback(first, second) {
  return reportTextSorter.compare(first.sectorId, second.sectorId)
    || reportTextSorter.compare(first.invoice, second.invoice)
    || reportTextSorter.compare(first.description, second.description);
}

function compareInventoryFallback(first, second) {
  return reportTextSorter.compare(first.name, second.name);
}

function compareReportItems(first, second, column) {
  const firstValue = column.getValue(first);
  const secondValue = column.getValue(second);

  if (column.type === 'number') {
    return (Number(firstValue) || 0) - (Number(secondValue) || 0);
  }

  return reportTextSorter.compare(String(firstValue || ''), String(secondValue || ''));
}

function sortReportItems(items, sort) {
  const column = reportSortColumns.find((option) => option.key === sort.key) || reportSortColumns[0];
  const direction = sort.direction === 'desc' ? 'desc' : 'asc';

  return [...items].sort((first, second) => {
    const result = compareReportItems(first, second, column);

    if (result !== 0) {
      return direction === 'asc' ? result : -result;
    }

    return compareReportFallback(first, second);
  });
}

function sortInventoryItems(items, sort) {
  const column = inventorySortColumns.find((option) => option.key === sort.key) || inventorySortColumns[0];
  const direction = sort.direction === 'desc' ? 'desc' : 'asc';

  return [...items].sort((first, second) => {
    const result = compareReportItems(first, second, column);

    if (result !== 0) {
      return direction === 'asc' ? result : -result;
    }

    return compareInventoryFallback(first, second);
  });
}

function normalizeStoredItems(items) {
  if (!Array.isArray(items)) return initialCargoItems;

  const normalizedItems = items.filter((item) => (
    item?.id && item?.sectorId && item?.invoice
  )).map((item) => ({
    ...item,
    sectorId: validSectorIds.has(item.sectorId) ? item.sectorId : defaultSectorId,
    quantity: Number(item.quantity) || 1,
    weight: Number(item.weight) || 0,
  }));

  if (!normalizedItems.length) return initialCargoItems;

  const storedInvoices = new Set(normalizedItems.map((item) => item.invoice));
  const missingDemoItems = initialCargoItems.filter((item) => !storedInvoices.has(item.invoice));

  return [...normalizedItems, ...missingDemoItems];
}

function loadCargoItems() {
  if (typeof window === 'undefined') return initialCargoItems;

  try {
    const storedCargoItems = window.localStorage.getItem(warehouseCargoStorageKey);
    return storedCargoItems ? normalizeStoredItems(JSON.parse(storedCargoItems)) : initialCargoItems;
  } catch {
    return initialCargoItems;
  }
}

function parseDecimal(value) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}

function normalizeStatusKey(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isWarehouseExitStatus(status) {
  return normalizeStatusKey(status) === 'concluido';
}

function getInvoiceStatus(items) {
  const statuses = [...new Set(items.map((item) => item.status).filter(Boolean))];
  return statuses.length === 1 ? statuses[0] : 'Status misto';
}

function getSectorStats(items) {
  const invoices = new Set(items.map((item) => item.invoice));
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const weight = items.reduce((sum, item) => sum + item.weight, 0);

  return {
    invoiceCount: invoices.size,
    itemCount: items.length,
    quantity,
    weight,
  };
}

function getDepotUsageStats(items, sectorItemsMap) {
  return warehouseDepots.map((depot) => {
    const sectors = blueprintSectors.filter((sector) => sectorDepotMap.get(sector.id) === depot.id);
    const depotItems = items.filter((item) => sectorDepotMap.get(item.sectorId) === depot.id);
    const occupiedSectors = sectors.filter((sector) => (sectorItemsMap.get(sector.id) || []).length > 0).length;
    const quantity = depotItems.reduce((sum, item) => sum + item.quantity, 0);
    const weight = depotItems.reduce((sum, item) => sum + item.weight, 0);
    const invoices = new Set(depotItems.map((item) => item.invoice));

    return {
      ...depot,
      sectors: sectors.length,
      occupiedSectors,
      occupancyPercent: sectors.length ? Math.round((occupiedSectors / sectors.length) * 100) : 0,
      itemCount: depotItems.length,
      invoiceCount: invoices.size,
      quantity,
      weight,
    };
  });
}

function groupItemsByInvoice(items) {
  const groups = items.reduce((accumulator, item) => {
    if (!accumulator[item.invoice]) {
      accumulator[item.invoice] = {
        invoice: item.invoice,
        customer: item.customer,
        items: [],
        quantity: 0,
        weight: 0,
      };
    }

    accumulator[item.invoice].items.push(item);
    accumulator[item.invoice].quantity += item.quantity;
    accumulator[item.invoice].weight += item.weight;
    return accumulator;
  }, {});

  return Object.values(groups).sort((first, second) => first.invoice.localeCompare(second.invoice));
}

function groupItemsByCustomer(items) {
  const groups = items.reduce((accumulator, item) => {
    const customer = item.customer || 'Cliente não informado';

    if (!accumulator[customer]) {
      accumulator[customer] = {
        customer,
        items: [],
        quantity: 0,
        weight: 0,
        invoiceCount: 0,
      };
    }

    accumulator[customer].items.push(item);
    accumulator[customer].quantity += item.quantity;
    accumulator[customer].weight += item.weight;
    return accumulator;
  }, {});

  return Object.values(groups)
    .map((group) => ({
      ...group,
      invoices: groupItemsByInvoice(group.items),
      invoiceCount: new Set(group.items.map((item) => item.invoice)).size,
    }))
    .sort((first, second) => first.customer.localeCompare(second.customer));
}

function groupDashboardItems(items, getKey) {
  return Object.values(items.reduce((groups, item) => {
    const key = getKey(item) || 'Não informado';

    if (!groups[key]) {
      groups[key] = {
        name: key,
        itemCount: 0,
        quantity: 0,
        weight: 0,
      };
    }

    groups[key].itemCount += 1;
    groups[key].quantity += item.quantity;
    groups[key].weight += item.weight;
    return groups;
  }, {})).sort((first, second) => second.itemCount - first.itemCount || second.weight - first.weight);
}

function groupInventoryItems(items) {
  return Object.values(items.reduce((groups, item) => {
    const key = item.description || 'Não informado';

    if (!groups[key]) {
      groups[key] = {
        name: key,
        itemCount: 0,
        quantity: 0,
        weight: 0,
        invoices: new Set(),
        sectors: new Set(),
      };
    }

    groups[key].itemCount += 1;
    groups[key].quantity += item.quantity;
    groups[key].weight += item.weight;
    groups[key].invoices.add(item.invoice);
    groups[key].sectors.add(item.sectorId);
    return groups;
  }, {})).map((product) => ({
    name: product.name,
    itemCount: product.itemCount,
    quantity: product.quantity,
    weight: product.weight,
    invoiceCount: product.invoices.size,
    sectorCount: product.sectors.size,
  })).sort((first, second) => (
    second.quantity - first.quantity
    || second.weight - first.weight
    || first.name.localeCompare(second.name)
  ));
}

function getWarehouseDashboards(items) {
  const clientGroups = groupDashboardItems(items, (item) => item.customer);
  const productGroups = groupDashboardItems(items, (item) => item.description);
  const inventoryItems = groupInventoryItems(items);
  const topClients = [...clientGroups]
    .sort((first, second) => second.itemCount - first.itemCount || second.quantity - first.quantity)
    .slice(0, 5);
  const topProducts = [...productGroups]
    .sort((first, second) => second.quantity - first.quantity || second.itemCount - first.itemCount)
    .slice(0, 5);
  const totalWeight = Math.max(1, items.reduce((sum, item) => sum + item.weight, 0));
  const clientDistribution = [...clientGroups]
    .sort((first, second) => second.weight - first.weight)
    .slice(0, 5)
    .map((client) => ({
      ...client,
      percentage: Math.round((client.weight / totalWeight) * 100),
    }));
  const inventoryQuantityMax = Math.max(1, ...inventoryItems.map((item) => item.quantity));
  const inventoryWeightMax = Math.max(1, ...inventoryItems.map((item) => item.weight));
  const inventoryQuantityChart = inventoryItems.slice(0, 6).map((item) => ({
    ...item,
    percentage: Math.round((item.quantity / inventoryQuantityMax) * 100),
  }));
  const inventoryWeightChart = [...inventoryItems]
    .sort((first, second) => second.weight - first.weight || second.quantity - first.quantity)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      percentage: Math.round((item.weight / inventoryWeightMax) * 100),
    }));
  const reportItems = [...items].sort((first, second) => (
    first.sectorId.localeCompare(second.sectorId)
    || first.invoice.localeCompare(second.invoice)
    || first.description.localeCompare(second.description)
  ));

  return {
    topClients,
    topProducts,
    clientDistribution,
    mainInventoryItem: inventoryItems[0] || null,
    inventoryItems,
    inventoryQuantityChart,
    inventoryWeightChart,
    reportItems,
  };
}

function handleSectorKeyDown(event, sectorId, onSelect) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  event.preventDefault();
  onSelect(sectorId);
}

export default function WarehouseManagementPage() {
  const [cargoItems, setCargoItems] = useState(loadCargoItems);
  const [selectedSectorId, setSelectedSectorId] = useState(defaultSectorId);
  const [sectorGroupingMode, setSectorGroupingMode] = useState('invoice');
  const [showCompletedInvoices, setShowCompletedInvoices] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState({ 'NF-2': true });
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [cargoForm, setCargoForm] = useState(createCargoForm);
  const [weightSettings, setWeightSettings] = useState(readWarehouseWeightSettings);
  const [reportSort, setReportSort] = useState({ key: 'sectorId', direction: 'asc' });
  const [inventorySort, setInventorySort] = useState({ key: 'quantity', direction: 'desc' });
  const [status, setStatus] = useAutoClearMessage();

  useEffect(() => {
    try {
      window.localStorage.setItem(warehouseCargoStorageKey, JSON.stringify(cargoItems));
    } catch {
      // Storage is optional; the screen still works during the current session.
    }
  }, [cargoItems]);

  useEffect(() => {
    function syncWeightSettings() {
      setWeightSettings(readWarehouseWeightSettings());
    }

    window.addEventListener('focus', syncWeightSettings);
    window.addEventListener('storage', syncWeightSettings);

    return () => {
      window.removeEventListener('focus', syncWeightSettings);
      window.removeEventListener('storage', syncWeightSettings);
    };
  }, []);

  const activeCargoItems = useMemo(
    () => cargoItems.filter((item) => !isWarehouseExitStatus(item.status)),
    [cargoItems],
  );
  const completedSectorInvoices = useMemo(() => (
    groupItemsByInvoice(cargoItems.filter((item) => (
      item.sectorId === selectedSectorId && isWarehouseExitStatus(item.status)
    )))
  ), [cargoItems, selectedSectorId]);

  const sectorItemsMap = useMemo(() => activeCargoItems.reduce((map, item) => {
    const currentItems = map.get(item.sectorId) || [];
    map.set(item.sectorId, [...currentItems, item]);
    return map;
  }, new Map()), [activeCargoItems]);

  const selectedItems = useMemo(
    () => sectorItemsMap.get(selectedSectorId) || [],
    [sectorItemsMap, selectedSectorId],
  );

  const selectedStats = useMemo(() => getSectorStats(selectedItems), [selectedItems]);
  const groupedInvoices = useMemo(() => groupItemsByInvoice(selectedItems), [selectedItems]);
  const groupedCustomers = useMemo(() => groupItemsByCustomer(selectedItems), [selectedItems]);
  const depotUsageStats = useMemo(
    () => getDepotUsageStats(activeCargoItems, sectorItemsMap),
    [activeCargoItems, sectorItemsMap],
  );
  const totalDepotQuantity = Math.max(1, depotUsageStats.reduce((sum, depot) => sum + depot.quantity, 0));
  const totalDepotWeight = Math.max(1, depotUsageStats.reduce((sum, depot) => sum + depot.weight, 0));
  const maxDepotWeight = Math.max(1, ...depotUsageStats.map((depot) => depot.weight));
  const maxDepotQuantity = Math.max(1, ...depotUsageStats.map((depot) => depot.quantity));
  const sectorWeightStats = useMemo(() => (
    blueprintSectors.map((sector) => {
      const sectorItems = sectorItemsMap.get(sector.id) || [];
      const stats = getSectorStats(sectorItems);
      const limit = getSectorWeightLimit(weightSettings, sector.id);

      return {
        ...sector,
        ...stats,
        limit,
        isOccupied: stats.itemCount > 0,
        isOverLimit: stats.itemCount > 0 && stats.weight > limit,
      };
    })
  ), [sectorItemsMap, weightSettings]);

  const warehouseDashboards = useMemo(() => getWarehouseDashboards(activeCargoItems), [activeCargoItems]);
  const sortedReportItems = useMemo(
    () => sortReportItems(warehouseDashboards.reportItems, reportSort),
    [warehouseDashboards.reportItems, reportSort],
  );
  const sortedInventoryItems = useMemo(
    () => sortInventoryItems(warehouseDashboards.inventoryItems, inventorySort),
    [inventorySort, warehouseDashboards.inventoryItems],
  );
  const clientSelectOptions = useMemo(() => (
    [...new Set([...customerOptions, ...cargoItems.map((item) => item.customer).filter(Boolean)])]
      .sort((first, second) => first.localeCompare(second))
  ), [cargoItems]);
  const occupiedSectors = sectorItemsMap.size;
  const totalWeight = activeCargoItems.reduce((sum, item) => sum + item.weight, 0);
  const overweightSectors = sectorWeightStats.filter((sector) => sector.isOverLimit).length;
  const compliantSectors = sectorWeightStats.length - overweightSectors;
  const customLimitCount = Object.keys(weightSettings.sectorLimits || {}).length;
  const selectedSectorLimit = getSectorWeightLimit(weightSettings, selectedSectorId);
  const selectedSectorOverLimit = selectedStats.itemCount > 0 && selectedStats.weight > selectedSectorLimit;
  const selectedSectorUsagePercent = selectedSectorLimit
    ? Math.round((selectedStats.weight / selectedSectorLimit) * 100)
    : 0;
  const selectedSectorMeterWidth = Math.min(100, selectedSectorUsagePercent);

  function selectSector(sectorId) {
    setSelectedSectorId(sectorId);
    setExpandedInvoices({});
    setExpandedCustomers({});
    setShowCompletedInvoices(false);
    setIsAddFormOpen(false);
    setCargoForm(createCargoForm());
    setStatus(`Setor ${sectorId} selecionado`);
  }

  function updateCargoForm(field, value) {
    setCargoForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateCargoFormItem(itemId, field, value) {
    setCargoForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item) => (
        item.id === itemId ? { ...item, [field]: value } : item
      )),
    }));
  }

  function addCargoFormItem() {
    setCargoForm((currentForm) => ({
      ...currentForm,
      items: [...currentForm.items, createCargoFormItem()],
    }));
    setStatus('Novo item incluído na NF');
  }

  function removeCargoFormItem(itemId) {
    setCargoForm((currentForm) => {
      if (currentForm.items.length === 1) {
        return {
          ...currentForm,
          items: [createCargoFormItem()],
        };
      }

      return {
        ...currentForm,
        items: currentForm.items.filter((item) => item.id !== itemId),
      };
    });
    setStatus('Item removido da NF');
  }

  function searchCustomerByInvoice() {
    const invoice = cargoForm.invoice.trim();

    if (!invoice) {
      setStatus('Informe a NF para pesquisar o cliente');
      return;
    }

    const invoiceCargo = cargoItems.find((item) => item.invoice.toLowerCase() === invoice.toLowerCase());

    if (!invoiceCargo) {
      setStatus('Nenhum cliente encontrado para essa NF');
      return;
    }

    updateCargoForm('customer', invoiceCargo.customer);
    setStatus(`Cliente ${invoiceCargo.customer} localizado para ${invoiceCargo.invoice}`);
  }

  function toggleInvoice(invoice) {
    setExpandedInvoices((currentExpanded) => ({
      ...currentExpanded,
      [invoice]: !currentExpanded[invoice],
    }));
  }

  function toggleCustomer(customer) {
    setExpandedCustomers((currentExpanded) => ({
      ...currentExpanded,
      [customer]: !currentExpanded[customer],
    }));
  }

  function changeGroupingMode(mode) {
    setSectorGroupingMode(mode);

    if (mode === 'customer') {
      setExpandedCustomers({});
    }
  }

  function changeReportSort(column) {
    setReportSort((currentSort) => {
      if (currentSort.key === column.key) {
        return {
          key: column.key,
          direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key: column.key,
        direction: getReportDefaultDirection(column),
      };
    });
  }

  function changeInventorySort(column) {
    setInventorySort((currentSort) => {
      if (currentSort.key === column.key) {
        return {
          key: column.key,
          direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key: column.key,
        direction: getReportDefaultDirection(column),
      };
    });
  }

  function renderReportHeader(column) {
    const isActive = reportSort.key === column.key;
    const direction = isActive ? reportSort.direction : getReportDefaultDirection(column);
    const nextDirection = isActive
      ? reportSort.direction === 'asc' ? 'desc' : 'asc'
      : getReportDefaultDirection(column);
    const ariaSort = isActive
      ? reportSort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none';

    return (
      <th key={column.key} aria-sort={ariaSort}>
        <span className="warehouse-sort-header">
          <span>{column.label}</span>
          <button
            type="button"
            className={isActive ? 'warehouse-sort-button warehouse-sort-button--active' : 'warehouse-sort-button'}
            title={`Ordenar ${column.label} ${getReportSortLabel(column, nextDirection)}`}
            aria-label={`Ordenar ${column.label} ${getReportSortLabel(column, nextDirection)}`}
            onClick={() => changeReportSort(column)}
          >
            {getReportSortLabel(column, direction)}
          </button>
        </span>
      </th>
    );
  }

  function renderInventoryHeader(column) {
    const isActive = inventorySort.key === column.key;
    const direction = isActive ? inventorySort.direction : getReportDefaultDirection(column);
    const nextDirection = isActive
      ? inventorySort.direction === 'asc' ? 'desc' : 'asc'
      : getReportDefaultDirection(column);
    const ariaSort = isActive
      ? inventorySort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none';

    return (
      <th key={column.key} aria-sort={ariaSort}>
        <span className="warehouse-sort-header">
          <span>{column.label}</span>
          <button
            type="button"
            className={isActive ? 'warehouse-sort-button warehouse-sort-button--active' : 'warehouse-sort-button'}
            title={`Ordenar ${column.label} ${getReportSortLabel(column, nextDirection)}`}
            aria-label={`Ordenar ${column.label} ${getReportSortLabel(column, nextDirection)}`}
            onClick={() => changeInventorySort(column)}
          >
            {getReportSortLabel(column, direction)}
          </button>
        </span>
      </th>
    );
  }

  function renderCompletedInvoiceRow(group) {
    const invoiceStatus = getInvoiceStatus(group.items);
    const invoiceStatusValue = invoiceStatusOptions.includes(invoiceStatus) ? invoiceStatus : warehouseExitStatus;

    return (
      <div className="warehouse-completed-row" key={group.invoice}>
        <div>
          <strong>{group.invoice}</strong>
          <span>{group.customer} - {group.items.length} item(s) - {weightFormatter.format(group.weight)} kg</span>
        </div>
        <label className="field">
          <span>Status</span>
          <select
            value={invoiceStatusValue}
            onChange={(event) => changeInvoiceStatus(group.invoice, event.target.value)}
          >
            {invoiceStatusOptions.map((statusOption) => (
              <option value={statusOption} key={statusOption}>{statusOption}</option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  function changeInvoiceStatus(invoice, nextStatus) {
    if (!nextStatus) return;

    setCargoItems((currentItems) => (
      currentItems.map((item) => (
        item.invoice === invoice ? { ...item, status: nextStatus } : item
      ))
    ));

    if (isWarehouseExitStatus(nextStatus)) {
      setExpandedInvoices((currentExpanded) => {
        const { [invoice]: _removedInvoice, ...nextExpanded } = currentExpanded;
        return nextExpanded;
      });
      setStatus(`${invoice} concluída e retirada da gestão ativa do galpão`);
      return;
    }

    setStatus(`Status da ${invoice} atualizado para ${nextStatus}`);
  }

  function renderInvoiceGroup(group) {
    const expanded = Boolean(expandedInvoices[group.invoice]);
    const invoiceStatus = getInvoiceStatus(group.items);
    const invoiceStatusValue = invoiceStatusOptions.includes(invoiceStatus) ? invoiceStatus : '';

    return (
      <article className="warehouse-invoice-card" key={group.invoice}>
        <button
          type="button"
          className="warehouse-invoice-header"
          aria-expanded={expanded}
          onClick={() => toggleInvoice(group.invoice)}
        >
          <span aria-hidden="true">
            {expanded ? (
              <ChevronDown size={16} strokeWidth={2.3} />
            ) : (
              <ChevronRight size={16} strokeWidth={2.3} />
            )}
          </span>
          <div>
            <strong>{group.invoice}</strong>
            <small>{group.customer}</small>
          </div>
          <em>{group.items.length} item(s)</em>
        </button>

        {expanded && (
          <div className="warehouse-invoice-items">
            <div className="warehouse-invoice-status-row">
              <label className="field">
                <span>Status da NF</span>
                <select
                  value={invoiceStatusValue}
                  onChange={(event) => changeInvoiceStatus(group.invoice, event.target.value)}
                >
                  {!invoiceStatusValue && <option value="">{invoiceStatus}</option>}
                  {invoiceStatusOptions.map((statusOption) => (
                    <option value={statusOption} key={statusOption}>{statusOption}</option>
                  ))}
                </select>
              </label>
            </div>

            {group.items.map((item) => (
              <div className="warehouse-cargo-row" key={item.id}>
                <Box size={16} strokeWidth={2.2} aria-hidden="true" />
                <div>
                  <strong>{item.description}</strong>
                  <span>Quantidade: {item.quantity} - Peso: {weightFormatter.format(item.weight)} kg - {item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    );
  }

  function addCargoItem(event) {
    event.preventDefault();

    const invoice = cargoForm.invoice.trim();
    const customer = cargoForm.customer.trim();
    const validFormItems = cargoForm.items
      .map((item) => ({
        ...item,
        description: item.description.trim(),
      }))
      .filter((item) => item.description);

    if (!invoice || !customer || !validFormItems.length) {
      setStatus('Informe NF, cliente e pelo menos um item para adicionar ao setor');
      return;
    }

    const newItemsWeight = validFormItems.reduce((sum, item) => sum + parseDecimal(item.weight), 0);
    const projectedSectorWeight = selectedStats.weight + newItemsWeight;

    if (projectedSectorWeight > selectedSectorLimit) {
      setStatus(`Setor ${selectedSectorId} excede o limite de ${weightFormatter.format(selectedSectorLimit)} kg`);
      return;
    }

    const timestamp = Date.now();
    const nextCargoItems = validFormItems.map((item, index) => ({
      id: `cargo-${timestamp}-${index}`,
      sectorId: selectedSectorId,
      invoice,
      description: item.description,
      customer,
      quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
      weight: parseDecimal(item.weight),
      status: cargoForm.status,
    }));

    setCargoItems((currentItems) => [...currentItems, ...nextCargoItems]);
    setExpandedInvoices((currentExpanded) => ({ ...currentExpanded, [invoice]: true }));
    setExpandedCustomers((currentExpanded) => ({ ...currentExpanded, [customer]: true }));
    setCargoForm(createCargoForm());
    setIsAddFormOpen(false);
    setStatus(`${nextCargoItems.length} item(s) da ${invoice} adicionados ao setor ${selectedSectorId}`);
  }

  return (
    <section className="warehouse-management-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gestão de Galpão</h1>
          <p className="page-kicker">Controle operacional das áreas de armazenagem por setor, NF e itens</p>
        </div>
      </header>

      <div className="warehouse-metrics-grid" aria-label="Resumo do galpão">
        <div>
          <span>Setores</span>
          <strong>{blueprintSectors.length}</strong>
        </div>
        <div>
          <span>Setores ocupados</span>
          <strong>{occupiedSectors}</strong>
        </div>
        <div>
          <span>Itens no galpão</span>
          <strong>{activeCargoItems.length}</strong>
        </div>
        <div>
          <span>Peso total</span>
          <strong>{weightFormatter.format(totalWeight)} kg</strong>
        </div>
      </div>

      <section className="warehouse-weight-dashboard" aria-label="Controle de peso por setor">
        <article className="warehouse-weight-card warehouse-weight-card--danger">
          <span>Acima do peso</span>
          <strong>{overweightSectors}</strong>
          <small>de {sectorWeightStats.length} setor(es)</small>
        </article>
        <article className="warehouse-weight-card warehouse-weight-card--success">
          <span>Dentro da métrica</span>
          <strong>{compliantSectors}</strong>
          <small>de {sectorWeightStats.length} setor(es)</small>
        </article>
        <article className="warehouse-weight-card">
          <span>Limite global</span>
          <strong>{weightFormatter.format(weightSettings.globalLimitKg)} kg</strong>
          <small>{customLimitCount} ajuste(s)</small>
        </article>
      </section>

      <div className="warehouse-management-layout">
        <section className="registered-launches-panel warehouse-map-panel" aria-labelledby="warehouse-map-title">
          <div className="registered-launches-header">
            <h2 id="warehouse-map-title">
              <Warehouse size={17} strokeWidth={2.2} aria-hidden="true" />
              Planta funcional do galpão
            </h2>
            <div>
              <span>{warehouseColumnCount} colunas</span>
              <strong>{warehouseRowCount} linhas</strong>
            </div>
          </div>

          <div className="warehouse-map-scroll">
            <div className="warehouse-blueprint-shell">
              <svg className="warehouse-blueprint" viewBox={blueprintViewBox} role="img" aria-labelledby="warehouse-blueprint-title">
                <title id="warehouse-blueprint-title">Planta do galpão com setores de armazenagem clicáveis</title>
                <g className="warehouse-blueprint-walls" aria-hidden="true">
                  {warehouseWalls.map((shape) => (
                    shape.type === 'line' ? (
                      <line
                        key={shape.id}
                        x1={shape.x1}
                        y1={shape.y1}
                        x2={shape.x2}
                        y2={shape.y2}
                      />
                    ) : (
                      <rect
                        key={shape.id}
                        x={shape.x}
                        y={shape.y}
                        width={shape.width}
                        height={shape.height}
                        transform={shape.transform}
                        strokeWidth={shape.strokeWidth}
                      />
                    )
                  ))}
                </g>

                <g className="warehouse-blueprint-sectors">
                  {blueprintSectors.map((sector) => {
                    const sectorItems = sectorItemsMap.get(sector.id) || [];
                    const stats = getSectorStats(sectorItems);
                    const limit = getSectorWeightLimit(weightSettings, sector.id);
                    const selected = selectedSectorId === sector.id;
                    const occupied = stats.itemCount > 0;
                    const overLimit = occupied && stats.weight > limit;

                    return (
                      <g
                        key={sector.id}
                        className={`warehouse-blueprint-sector${selected ? ' warehouse-blueprint-sector--selected' : ''}${occupied ? ' warehouse-blueprint-sector--occupied' : ''}${overLimit ? ' warehouse-blueprint-sector--over-limit' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Setor ${sector.id}, ${stats.itemCount} item(s), ${stats.invoiceCount} NF(s), ${weightFormatter.format(stats.weight)} de ${weightFormatter.format(limit)} kg`}
                        aria-pressed={selected}
                        onClick={() => selectSector(sector.id)}
                        onKeyDown={(event) => handleSectorKeyDown(event, sector.id, selectSector)}
                      >
                        <rect
                          x={sector.x}
                          y={sector.y}
                          width={sector.width}
                          height={sector.height}
                        />
                        <text
                          x={sector.centerX}
                          y={sector.centerY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {sector.id}
                        </text>
                        {occupied && (
                          <circle
                            cx={sector.x + sector.width - 3.4}
                            cy={sector.y + 3.4}
                            r="2.4"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              <div className="warehouse-depot-labels" aria-label="Divisão dos depósitos">
                <div>
                  <strong>Depósito 2</strong>
                  <span></span>
                </div>
                <div>
                  <strong>Depósito 1</strong>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="selection-panel warehouse-sector-panel" aria-labelledby="warehouse-sector-title">
          <div className="selection-panel-header">
            <h2 id="warehouse-sector-title">Setor {selectedSectorId}</h2>
            <strong>{selectedStats.itemCount} item(s)</strong>
          </div>

          <div className="warehouse-sector-summary">
            <div>
              <span>NFs</span>
              <strong>{selectedStats.invoiceCount}</strong>
            </div>
            <div>
              <span>Quantidade</span>
              <strong>{selectedStats.quantity}</strong>
            </div>
            <div>
              <span>Peso</span>
              <strong>{weightFormatter.format(selectedStats.weight)} kg</strong>
            </div>
            <div className={selectedSectorOverLimit ? 'warehouse-sector-limit-card warehouse-sector-limit-card--danger' : 'warehouse-sector-limit-card'}>
              <span>Limite</span>
              <strong>{weightFormatter.format(selectedSectorLimit)} kg</strong>
            </div>
          </div>

          <div className="warehouse-limit-meter">
            <header>
              <span>{selectedSectorOverLimit ? 'Acima do limite' : 'Dentro da métrica'}</span>
              <strong>{selectedSectorUsagePercent}%</strong>
            </header>
            <div>
              <span
                className={selectedSectorOverLimit ? 'warehouse-limit-meter-fill warehouse-limit-meter-fill--danger' : 'warehouse-limit-meter-fill'}
                style={{ width: `${selectedSectorMeterWidth}%` }}
              />
            </div>
          </div>

          <div className="warehouse-group-mode" aria-label="Agrupamento das cargas do setor">
            <span>Agrupar por</span>
            <div>
              <button
                type="button"
                className={sectorGroupingMode === 'invoice' ? 'active' : ''}
                aria-pressed={sectorGroupingMode === 'invoice'}
                onClick={() => changeGroupingMode('invoice')}
              >
                NF
              </button>
              <button
                type="button"
                className={sectorGroupingMode === 'customer' ? 'active' : ''}
                aria-pressed={sectorGroupingMode === 'customer'}
                onClick={() => changeGroupingMode('customer')}
              >
                Fornecedor
              </button>
            </div>
          </div>

          <section className="warehouse-completed-invoices" aria-label={`NF's concluídas do setor ${selectedSectorId}`}>
            <button
              type="button"
              className="warehouse-completed-toggle"
              aria-expanded={showCompletedInvoices}
              onClick={() => setShowCompletedInvoices((currentValue) => !currentValue)}
            >
              <span aria-hidden="true">
                {showCompletedInvoices ? (
                  <ChevronDown size={16} strokeWidth={2.3} />
                ) : (
                  <ChevronRight size={16} strokeWidth={2.3} />
                )}
              </span>
              <strong>NF's concluídas</strong>
              <em>{completedSectorInvoices.length}</em>
            </button>

            {showCompletedInvoices && (
              <div className="warehouse-completed-list">
                {completedSectorInvoices.map((group) => renderCompletedInvoiceRow(group))}
                {!completedSectorInvoices.length && (
                  <div className="empty-list">Nenhuma NF concluída neste setor</div>
                )}
              </div>
            )}
          </section>

          <div className="warehouse-invoice-list" aria-label={`Cargas do setor ${selectedSectorId}`}>
            {sectorGroupingMode === 'invoice' && groupedInvoices.map((group) => renderInvoiceGroup(group))}

            {sectorGroupingMode === 'customer' && groupedCustomers.map((group) => {
              const expanded = Boolean(expandedCustomers[group.customer]);

              return (
                <article className="warehouse-customer-card" key={group.customer}>
                  <button
                    type="button"
                    className="warehouse-customer-header"
                    aria-expanded={expanded}
                    onClick={() => toggleCustomer(group.customer)}
                  >
                    <span aria-hidden="true">
                      {expanded ? (
                        <ChevronDown size={16} strokeWidth={2.3} />
                      ) : (
                        <ChevronRight size={16} strokeWidth={2.3} />
                      )}
                    </span>
                    <div>
                      <strong>{group.customer}</strong>
                      <small>{group.invoiceCount} NF(s) - Quantidade {group.quantity} - {weightFormatter.format(group.weight)} kg</small>
                    </div>
                    <em>{group.items.length} item(s)</em>
                  </button>

                  {expanded && (
                    <div className="warehouse-customer-invoices">
                      {group.invoices.map((invoiceGroup) => renderInvoiceGroup(invoiceGroup))}
                    </div>
                  )}
                </article>
              );
            })}

            {!groupedInvoices.length && (
              <div className="empty-list">Nenhuma carga neste setor</div>
            )}
          </div>

          <form className="warehouse-add-form" onSubmit={addCargoItem}>
            <button
              type="button"
              className="warehouse-add-title"
              aria-expanded={isAddFormOpen}
              aria-controls="warehouse-add-form-body"
              onClick={() => setIsAddFormOpen((currentOpen) => !currentOpen)}
            >
              <span aria-hidden="true">
                {isAddFormOpen ? (
                  <ChevronDown size={16} strokeWidth={2.3} />
                ) : (
                  <ChevronRight size={16} strokeWidth={2.3} />
                )}
              </span>
              <PackagePlus size={17} strokeWidth={2.2} aria-hidden="true" />
              <strong>Adicionar item ao setor {selectedSectorId}</strong>
            </button>

            {isAddFormOpen && (
              <div id="warehouse-add-form-body" className="warehouse-add-body">
                <div className="warehouse-add-grid">
              <label className="field">
                <span>NF</span>
                <input
                  type="text"
                  placeholder="Ex.: NF-2"
                  value={cargoForm.invoice}
                  onChange={(event) => updateCargoForm('invoice', event.target.value)}
                />
              </label>

              <label className="field warehouse-client-field">
                <span>Cliente</span>
                <div className="warehouse-client-lookup">
                  <select
                    value={cargoForm.customer}
                    onChange={(event) => updateCargoForm('customer', event.target.value)}
                  >
                    <option value="">Selecionar cliente</option>
                    {clientSelectOptions.map((customer) => (
                      <option value={customer} key={customer}>{customer}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-button"
                    title="Pesquisar cliente pela NF"
                    aria-label="Pesquisar cliente pela NF"
                    onClick={searchCustomerByInvoice}
                  >
                    <Search size={16} strokeWidth={2.2} />
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={cargoForm.status}
                  onChange={(event) => updateCargoForm('status', event.target.value)}
                >
                  {statusOptions.map((statusOption) => (
                    <option value={statusOption} key={statusOption}>{statusOption}</option>
                  ))}
                </select>
              </label>

              <div className="warehouse-items-editor">
                <div className="warehouse-items-editor-header">
                  <span>Itens da NF</span>
                  <button type="button" className="secondary-button" onClick={addCargoFormItem}>
                    <Plus size={15} strokeWidth={2.2} />
                    Adicionar novo item
                  </button>
                </div>

                {cargoForm.items.map((item, index) => (
                  <div className="warehouse-item-form-row" key={item.id}>
                    <label className="field">
                      <span>Item {index + 1}</span>
                      <input
                        type="text"
                        placeholder="Descrição ou código do produto"
                        value={item.description}
                        onChange={(event) => updateCargoFormItem(item.id, 'description', event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Quantidade</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateCargoFormItem(item.id, 'quantity', event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Peso kg</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,0"
                        value={item.weight}
                        onChange={(event) => updateCargoFormItem(item.id, 'weight', event.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="icon-button warehouse-item-remove"
                      title="Remover item"
                      aria-label={`Remover item ${index + 1}`}
                      onClick={() => removeCargoFormItem(item.id)}
                    >
                      <X size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="warehouse-add-actions">
              <button type="submit" className="primary-button">
                <PackagePlus size={15} strokeWidth={2.2} />
                Guardar item(s)
              </button>
            </div>
              </div>
            )}
            {status && <span className="status-line warehouse-add-status" aria-live="polite">{status}</span>}
          </form>
        </aside>
      </div>

      <section className="warehouse-depot-dashboard" aria-label="Comparativo de uso dos depósitos">
        <div className="registered-launches-header warehouse-depot-dashboard-header">
          <h2>Comparativo dos depósitos</h2>
          <div><span>Depósito 2 A-L</span><strong>Depósito 1 M-T</strong></div>
        </div>

        <div className="warehouse-depot-cards">
          {depotUsageStats.map((depot) => (
            <article className="warehouse-depot-card" key={depot.id}>
              <header>
                <div>
                  <h3>{depot.label}</h3>
                  <span>{depot.columns}</span>
                </div>
                <strong>{depot.occupancyPercent}%</strong>
              </header>

              <div className="warehouse-depot-stat-grid">
                <div>
                  <span>Setores usados</span>
                  <strong>{depot.occupiedSectors}/{depot.sectors}</strong>
                </div>
                <div>
                  <span>NFs</span>
                  <strong>{depot.invoiceCount}</strong>
                </div>
                <div>
                  <span>Itens</span>
                  <strong>{depot.itemCount}</strong>
                </div>
                <div>
                  <span>Quantidade</span>
                  <strong>{depot.quantity}</strong>
                </div>
              </div>

              <div className="warehouse-depot-bars">
                <div>
                  <span>Uso dos setores</span>
                  <strong>{depot.occupancyPercent}%</strong>
                  <em><span style={{ width: `${depot.occupancyPercent}%` }} /></em>
                </div>
                <div>
                  <span>Quantidade</span>
                  <strong>{depot.quantity}</strong>
                  <em><span style={{ width: `${Math.round((depot.quantity / maxDepotQuantity) * 100)}%` }} /></em>
                </div>
                <div>
                  <span>Peso</span>
                  <strong>{weightFormatter.format(depot.weight)} kg</strong>
                  <em><span style={{ width: `${Math.round((depot.weight / maxDepotWeight) * 100)}%` }} /></em>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="warehouse-depot-distribution">
          <section aria-label="Distribuição por quantidade">
            <header>
              <h3>Distribuição por quantidade</h3>
              <span>{depotUsageStats.reduce((sum, depot) => sum + depot.quantity, 0)} unidades</span>
            </header>
            <div className="warehouse-depot-stacked-bar">
              {depotUsageStats.map((depot) => (
                <span
                  key={depot.id}
                  className={`warehouse-depot-stacked-segment warehouse-depot-stacked-segment--${depot.id}`}
                  style={{ width: `${Math.round((depot.quantity / totalDepotQuantity) * 100)}%` }}
                  title={`${depot.label}: ${depot.quantity}`}
                />
              ))}
            </div>
            <div className="warehouse-depot-distribution-legend">
              {depotUsageStats.map((depot) => (
                <div key={depot.id}>
                  <span className={`warehouse-depot-dot warehouse-depot-dot--${depot.id}`} />
                  <strong>{depot.label}</strong>
                  <em>{Math.round((depot.quantity / totalDepotQuantity) * 100)}%</em>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Distribuição por peso">
            <header>
              <h3>Distribuição por peso</h3>
              <span>{weightFormatter.format(depotUsageStats.reduce((sum, depot) => sum + depot.weight, 0))} kg</span>
            </header>
            <div className="warehouse-depot-stacked-bar">
              {depotUsageStats.map((depot) => (
                <span
                  key={depot.id}
                  className={`warehouse-depot-stacked-segment warehouse-depot-stacked-segment--${depot.id}`}
                  style={{ width: `${Math.round((depot.weight / totalDepotWeight) * 100)}%` }}
                  title={`${depot.label}: ${weightFormatter.format(depot.weight)} kg`}
                />
              ))}
            </div>
            <div className="warehouse-depot-distribution-legend">
              {depotUsageStats.map((depot) => (
                <div key={depot.id}>
                  <span className={`warehouse-depot-dot warehouse-depot-dot--${depot.id}`} />
                  <strong>{depot.label}</strong>
                  <em>{Math.round((depot.weight / totalDepotWeight) * 100)}%</em>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="warehouse-dashboard-grid" aria-label="Indicadores do galpão">
        <article className="registered-launches-panel warehouse-dashboard-card">
          <div className="registered-launches-header">
            <h2>Clientes com mais itens</h2>
            <div><span>ranking por item</span></div>
          </div>
          <div className="warehouse-ranking-list">
            {warehouseDashboards.topClients.map((client) => (
              <div className="warehouse-ranking-row" key={client.name}>
                <div>
                  <strong>{client.name}</strong>
                  <span>Itens: {client.itemCount} - Quantidade: {client.quantity} - Peso: {weightFormatter.format(client.weight)} kg</span>
                </div>
                <em>{client.itemCount}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="registered-launches-panel warehouse-dashboard-card">
          <div className="registered-launches-header">
            <h2>Produtos por quantidade</h2>
            <div><span>soma da quantidade</span></div>
          </div>
          <div className="warehouse-ranking-list">
            {warehouseDashboards.topProducts.map((product) => (
              <div className="warehouse-ranking-row" key={product.name}>
                <div>
                  <strong>{product.name}</strong>
                  <span>Quantidade: {product.quantity} - Itens: {product.itemCount} - Peso: {weightFormatter.format(product.weight)} kg</span>
                </div>
                <em>{product.quantity}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="registered-launches-panel warehouse-dashboard-card">
          <div className="registered-launches-header">
            <h2>Peso por cliente (kg)</h2>
            <div><span>Total {weightFormatter.format(totalWeight)} kg</span></div>
          </div>
          <div className="warehouse-distribution-list">
            {warehouseDashboards.clientDistribution.map((client) => (
              <div className="warehouse-distribution-row" key={client.name}>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.percentage}%</span>
                </div>
                <small>Peso: {weightFormatter.format(client.weight)} kg - Itens: {client.itemCount} - Quantidade: {client.quantity}</small>
                <span className="warehouse-distribution-track">
                  <span style={{ width: `${client.percentage}%` }} />
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="registered-launches-panel warehouse-dashboard-card warehouse-dashboard-card--report">
          <div className="registered-launches-header">
            <h2>Relatório de itens guardados</h2>
            <div><span>{sortedReportItems.length} item(s)</span></div>
          </div>
          <div className="registered-launches-table-wrap warehouse-report-wrap">
            <table className="registered-launches-table warehouse-report-table">
              <thead>
                <tr>
                  {reportSortColumns.map((column) => renderReportHeader(column))}
                </tr>
              </thead>
              <tbody>
                {sortedReportItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.sectorId}</strong></td>
                    <td>{item.invoice}</td>
                    <td>{item.customer}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{weightFormatter.format(item.weight)} kg</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!sortedReportItems.length && <div className="empty-list">Nenhum item guardado</div>}
          </div>
        </article>

        <article className="registered-launches-panel warehouse-dashboard-card warehouse-dashboard-card--stock">
          <div className="registered-launches-header">
            <h2>Relatório de estoque por produto</h2>
            <div><span>{sortedInventoryItems.length} produto(s)</span></div>
          </div>

          {warehouseDashboards.mainInventoryItem ? (
            <div className="warehouse-stock-highlight">
              <span>Principal item no estoque</span>
              <strong>{warehouseDashboards.mainInventoryItem.name}</strong>
              <small>
                Quantidade: {warehouseDashboards.mainInventoryItem.quantity}
                {' - '}
                Itens: {warehouseDashboards.mainInventoryItem.itemCount}
                {' - '}
                Peso: {weightFormatter.format(warehouseDashboards.mainInventoryItem.weight)} kg
                {' - '}
                NFs: {warehouseDashboards.mainInventoryItem.invoiceCount}
                {' - '}
                Setores: {warehouseDashboards.mainInventoryItem.sectorCount}
              </small>
            </div>
          ) : (
            <div className="empty-list">Nenhum produto em estoque</div>
          )}

          <div className="warehouse-stock-analytics">
            <section className="warehouse-stock-chart" aria-label="Top produtos por quantidade">
              <h3>Top produtos por quantidade</h3>
              <div>
                {warehouseDashboards.inventoryQuantityChart.map((item) => (
                  <div className="warehouse-stock-bar-row" key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>Quantidade: {item.quantity} - Itens: {item.itemCount}</span>
                    </div>
                    <span className="warehouse-stock-bar-track">
                      <span style={{ width: `${item.percentage}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="warehouse-stock-chart" aria-label="Top produtos por peso">
              <h3>Top produtos por peso</h3>
              <div>
                {warehouseDashboards.inventoryWeightChart.map((item) => (
                  <div className="warehouse-stock-bar-row" key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>Peso: {weightFormatter.format(item.weight)} kg - Quantidade: {item.quantity}</span>
                    </div>
                    <span className="warehouse-stock-bar-track warehouse-stock-bar-track--weight">
                      <span style={{ width: `${item.percentage}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="registered-launches-table-wrap warehouse-stock-table-wrap">
            <table className="registered-launches-table warehouse-stock-table">
              <thead>
                <tr>
                  {inventorySortColumns.map((column) => renderInventoryHeader(column))}
                </tr>
              </thead>
              <tbody>
                {sortedInventoryItems.map((item) => (
                  <tr key={item.name}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.quantity}</td>
                    <td>{item.itemCount}</td>
                    <td>{weightFormatter.format(item.weight)} kg</td>
                    <td>{item.invoiceCount}</td>
                    <td>{item.sectorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!sortedInventoryItems.length && <div className="empty-list">Nenhum produto em estoque</div>}
          </div>
        </article>
      </section>
    </section>
  );
}
