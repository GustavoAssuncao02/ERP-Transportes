import { useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, ChevronRight, PackagePlus, Plus, Search, Warehouse, X } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';

const cargoStorageKey = 'warehouseManagementCargoItems';
const blueprintViewBox = '0 0 441 138';

const statusOptions = [
  'Aguardando roteirização',
  'Aguardando expedição',
  'Aguardando coleta',
  'Conferido',
  'Separação',
  'Roteirizado',
  'Bloqueio fiscal',
];

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

const warehouseWalls = [
  { id: 'upper-right-block', type: 'rect', x: 228.628, y: 17.5, width: 96, height: 5 },
  { id: 'outer-shell', type: 'rect', x: 1.50095, y: 22.5, width: 437.772, height: 114 },
  { id: 'upper-shell', type: 'rect', x: 45.6279, y: 1.5, width: 334, height: 21 },
  { id: 'upper-center-block', type: 'rect', x: 157.628, y: 17.5, width: 56, height: 5 },
  { id: 'upper-left-block', type: 'rect', x: 55.6279, y: 17.5, width: 56, height: 5 },
  { id: 'central-corridor-divider', type: 'line', x1: 226.14, y1: 138.003, x2: 226.14, y2: 23.9986 },
  { id: 'side-access', type: 'rect', x: 435.128, y: 97, width: 15, height: 4, transform: 'rotate(-90 435.128 97)', strokeWidth: 2 },
];

const rawStorageSectors = [
  { x: 412.628, y: 22.5, width: 21, height: 19 },
  { x: 385.628, y: 22.5, width: 21, height: 19 },
  { x: 358.628, y: 22.5, width: 21, height: 19 },
  { x: 331.628, y: 23.5, width: 21, height: 19 },
  { x: 306.628, y: 22.5, width: 18, height: 16 },
  { x: 281.628, y: 22.5, width: 18, height: 16 },
  { x: 306.628, y: 39.5, width: 18, height: 16 },
  { x: 281.628, y: 39.5, width: 18, height: 16 },
  { x: 188.628, y: 59.5, width: 18, height: 16 },
  { x: 181.628, y: 22.5, width: 18, height: 16 },
  { x: 157.628, y: 22.5, width: 18, height: 16 },
  { x: 133.628, y: 22.5, width: 18, height: 16 },
  { x: 109.628, y: 22.5, width: 18, height: 16 },
  { x: 85.6279, y: 22.5, width: 18, height: 16 },
  { x: 45.6279, y: 22.5, width: 18, height: 16 },
  { x: 36.6279, y: 59.5, width: 17, height: 16 },
  { x: 11.6279, y: 59.5, width: 17, height: 16 },
  { x: 11.6279, y: 81.5, width: 17, height: 16 },
  { x: 11.6279, y: 97.5, width: 17, height: 16 },
  { x: 36.6279, y: 81.5, width: 17, height: 16 },
  { x: 36.6279, y: 97.5, width: 17, height: 16 },
  { x: 86.6279, y: 96.5, width: 17, height: 16 },
  { x: 61.6279, y: 81.5, width: 17, height: 16 },
  { x: 61.6279, y: 97.5, width: 17, height: 16 },
  { x: 111.628, y: 96.5, width: 17, height: 16 },
  { x: 111.628, y: 120.5, width: 17, height: 16 },
  { x: 136.628, y: 120.5, width: 17, height: 16 },
  { x: 87.6279, y: 120.5, width: 17, height: 16 },
  { x: 36.6279, y: 120.5, width: 17, height: 16 },
  { x: 61.6279, y: 120.5, width: 17, height: 16 },
  { x: 11.6279, y: 120.5, width: 17, height: 16 },
  { x: 136.628, y: 97.5, width: 17, height: 16 },
  { x: 86.6279, y: 81.5, width: 17, height: 16 },
  { x: 111.628, y: 81.5, width: 17, height: 16 },
  { x: 136.628, y: 81.5, width: 17, height: 16 },
  { x: 161.628, y: 81.5, width: 13, height: 16 },
  { x: 61.6279, y: 59.5, width: 17, height: 16 },
  { x: 87.6279, y: 59.5, width: 16, height: 16 },
  { x: 111.628, y: 59.5, width: 17, height: 16 },
  { x: 136.628, y: 59.5, width: 18, height: 16 },
  { x: 23.6279, y: 22.5, width: 15, height: 16 },
  { x: 5.6279, y: 22.5, width: 12, height: 16 },
  { x: 161.628, y: 59.5, width: 18, height: 16 },
  { x: 174.628, y: 75.5, width: 52, height: 60 },
  { x: 412.628, y: 42.5, width: 21, height: 18 },
  { x: 385.628, y: 42.5, width: 21, height: 18 },
  { x: 358.628, y: 42.5, width: 21, height: 18 },
  { x: 331.628, y: 43.5, width: 21, height: 18 },
  { x: 331.628, y: 61.5, width: 21, height: 18 },
  { x: 385.628, y: 61.5, width: 21, height: 18 },
  { x: 412.628, y: 60.5, width: 21, height: 18 },
  { x: 358.628, y: 61.5, width: 21, height: 18 },
  { x: 411.628, y: 100.5, width: 21, height: 19 },
  { x: 385.628, y: 100.5, width: 21, height: 19 },
  { x: 358.628, y: 100.5, width: 21, height: 19 },
  { x: 333.628, y: 100.5, width: 19, height: 19 },
  { x: 308.628, y: 100.5, width: 19, height: 19 },
  { x: 282.628, y: 97.5, width: 21, height: 22 },
  { x: 254.628, y: 97.5, width: 21, height: 22 },
  { x: 226.628, y: 97.5, width: 21, height: 22 },
  { x: 282.628, y: 75.5, width: 21, height: 22 },
  { x: 254.628, y: 75.5, width: 21, height: 22 },
  { x: 226.628, y: 75.5, width: 21, height: 22 },
  { x: 411.628, y: 119.5, width: 21, height: 17 },
  { x: 385.628, y: 119.5, width: 21, height: 17 },
  { x: 358.628, y: 119.5, width: 21, height: 17 },
  { x: 333.628, y: 119.5, width: 19, height: 17 },
  { x: 308.628, y: 119.5, width: 19, height: 17 },
  { x: 282.628, y: 119.5, width: 21, height: 17 },
  { x: 254.628, y: 119.5, width: 21, height: 17 },
  { x: 226.628, y: 119.5, width: 21, height: 17 },
];

function createAxisClusters(values, tolerance) {
  return [...values].sort((first, second) => first - second).reduce((clusters, value) => {
    const previousCluster = clusters[clusters.length - 1];

    if (previousCluster && Math.abs(value - previousCluster.center) <= tolerance) {
      previousCluster.values.push(value);
      previousCluster.center = previousCluster.values.reduce((sum, clusterValue) => sum + clusterValue, 0) / previousCluster.values.length;
      return clusters;
    }

    clusters.push({ center: value, values: [value] });
    return clusters;
  }, []);
}

function columnLabel(index) {
  let label = '';
  let currentIndex = index + 1;

  while (currentIndex > 0) {
    const remainder = (currentIndex - 1) % 26;
    label = `${String.fromCharCode(65 + remainder)}${label}`;
    currentIndex = Math.floor((currentIndex - 1) / 26);
  }

  return label;
}

function closestClusterIndex(clusters, value) {
  return clusters.reduce((closestIndex, cluster, index) => {
    const closestDistance = Math.abs(value - clusters[closestIndex].center);
    const currentDistance = Math.abs(value - cluster.center);
    return currentDistance < closestDistance ? index : closestIndex;
  }, 0);
}

function createBlueprintSectors(sectors) {
  const xClusters = createAxisClusters(sectors.map((sector) => sector.x + (sector.width / 2)), 6);
  const yClusters = createAxisClusters(sectors.map((sector) => sector.y + (sector.height / 2)), 6);

  return sectors.map((sector) => {
    const centerX = sector.x + (sector.width / 2);
    const centerY = sector.y + (sector.height / 2);
    const columnIndex = closestClusterIndex(xClusters, centerX);
    const rowIndex = closestClusterIndex(yClusters, centerY);
    const id = `${columnLabel(columnIndex)}${rowIndex + 1}`;

    return {
      ...sector,
      id,
      centerX,
      centerY,
      row: rowIndex + 1,
      column: columnLabel(columnIndex),
    };
  }).sort((first, second) => first.centerY - second.centerY || first.centerX - second.centerX);
}

const blueprintSectors = createBlueprintSectors(rawStorageSectors);
const validSectorIds = new Set(blueprintSectors.map((sector) => sector.id));
const defaultSectorId = validSectorIds.has('H4') ? 'H4' : blueprintSectors[0].id;
const warehouseColumnCount = new Set(blueprintSectors.map((sector) => sector.column)).size;
const warehouseRowCount = new Set(blueprintSectors.map((sector) => sector.row)).size;

const initialCargoItems = [
  {
    id: 'cargo-001',
    sectorId: defaultSectorId,
    invoice: 'NF-2',
    description: 'Motor elétrico paletizado',
    customer: 'Atlas Equipamentos',
    quantity: 1,
    weight: 320,
    status: 'Aguardando expedição',
  },
  {
    id: 'cargo-002',
    sectorId: defaultSectorId,
    invoice: 'NF-2',
    description: 'Caixa de acionadores industriais',
    customer: 'Atlas Equipamentos',
    quantity: 2,
    weight: 86,
    status: 'Conferido',
  },
  {
    id: 'cargo-003',
    sectorId: defaultSectorId,
    invoice: 'NF-2',
    description: 'Kit de sensores embalado',
    customer: 'Atlas Equipamentos',
    quantity: 3,
    weight: 42,
    status: 'Conferido',
  },
  {
    id: 'cargo-004',
    sectorId: defaultSectorId,
    invoice: 'NF-8742',
    description: 'Volumes de autopeças',
    customer: 'Transportadora Nordeste',
    quantity: 4,
    weight: 155,
    status: 'Separação',
  },
  {
    id: 'cargo-005',
    sectorId: validSectorIds.has('B3') ? 'B3' : defaultSectorId,
    invoice: 'NF-5518',
    description: 'Bobinas plásticas',
    customer: 'Embalagens Costa',
    quantity: 6,
    weight: 480,
    status: 'Aguardando coleta',
  },
  {
    id: 'cargo-006',
    sectorId: validSectorIds.has('T5') ? 'T5' : defaultSectorId,
    invoice: 'NF-9081',
    description: 'Eletrodomésticos pequenos',
    customer: 'Rede Litoral',
    quantity: 8,
    weight: 210,
    status: 'Roteirizado',
  },
  {
    id: 'cargo-007',
    sectorId: validSectorIds.has('T5') ? 'T5' : defaultSectorId,
    invoice: 'NF-9081',
    description: 'Caixas de reposição',
    customer: 'Rede Litoral',
    quantity: 2,
    weight: 58,
    status: 'Roteirizado',
  },
  {
    id: 'cargo-008',
    sectorId: validSectorIds.has('P1') ? 'P1' : defaultSectorId,
    invoice: 'NF-3407',
    description: 'Palete de ferramentas',
    customer: 'Construtora Ponte Alta',
    quantity: 1,
    weight: 390,
    status: 'Bloqueio fiscal',
  },
];

const weightFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

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

  return normalizedItems.length ? normalizedItems : initialCargoItems;
}

function loadCargoItems() {
  if (typeof window === 'undefined') return initialCargoItems;

  try {
    const storedCargoItems = window.localStorage.getItem(cargoStorageKey);
    return storedCargoItems ? normalizeStoredItems(JSON.parse(storedCargoItems)) : initialCargoItems;
  } catch {
    return initialCargoItems;
  }
}

function parseDecimal(value) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
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

function getWarehouseDashboards(items) {
  const topClients = groupDashboardItems(items, (item) => item.customer).slice(0, 5);
  const topProducts = groupDashboardItems(items, (item) => item.description).slice(0, 5);
  const totalItems = Math.max(1, items.length);
  const clientDistribution = topClients.map((client) => ({
    ...client,
    percentage: Math.round((client.itemCount / totalItems) * 100),
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
  const [expandedInvoices, setExpandedInvoices] = useState({ 'NF-2': true });
  const [cargoForm, setCargoForm] = useState(createCargoForm);
  const [status, setStatus] = useAutoClearMessage();

  useEffect(() => {
    try {
      window.localStorage.setItem(cargoStorageKey, JSON.stringify(cargoItems));
    } catch {
      // Storage is optional; the screen still works during the current session.
    }
  }, [cargoItems]);

  const sectorItemsMap = useMemo(() => cargoItems.reduce((map, item) => {
    const currentItems = map.get(item.sectorId) || [];
    map.set(item.sectorId, [...currentItems, item]);
    return map;
  }, new Map()), [cargoItems]);

  const selectedItems = useMemo(
    () => sectorItemsMap.get(selectedSectorId) || [],
    [sectorItemsMap, selectedSectorId],
  );

  const selectedStats = useMemo(() => getSectorStats(selectedItems), [selectedItems]);
  const groupedInvoices = useMemo(() => groupItemsByInvoice(selectedItems), [selectedItems]);
  const warehouseDashboards = useMemo(() => getWarehouseDashboards(cargoItems), [cargoItems]);
  const clientSelectOptions = useMemo(() => (
    [...new Set([...customerOptions, ...cargoItems.map((item) => item.customer).filter(Boolean)])]
      .sort((first, second) => first.localeCompare(second))
  ), [cargoItems]);
  const occupiedSectors = sectorItemsMap.size;
  const totalWeight = cargoItems.reduce((sum, item) => sum + item.weight, 0);

  function selectSector(sectorId) {
    setSelectedSectorId(sectorId);
    setExpandedInvoices({});
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
    setCargoForm(createCargoForm());
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
          <strong>{cargoItems.length}</strong>
        </div>
        <div>
          <span>Peso total</span>
          <strong>{weightFormatter.format(totalWeight)} kg</strong>
        </div>
      </div>

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
                    const selected = selectedSectorId === sector.id;
                    const occupied = stats.itemCount > 0;

                    return (
                      <g
                        key={sector.id}
                        className={`warehouse-blueprint-sector${selected ? ' warehouse-blueprint-sector--selected' : ''}${occupied ? ' warehouse-blueprint-sector--occupied' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Setor ${sector.id}, ${stats.itemCount} item(s), ${stats.invoiceCount} NF(s)`}
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
              <span>Volumes</span>
              <strong>{selectedStats.quantity}</strong>
            </div>
            <div>
              <span>Peso</span>
              <strong>{weightFormatter.format(selectedStats.weight)} kg</strong>
            </div>
          </div>

          <div className="warehouse-invoice-list" aria-label={`Cargas do setor ${selectedSectorId}`}>
            {groupedInvoices.map((group) => {
              const expanded = Boolean(expandedInvoices[group.invoice]);

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
                      {group.items.map((item) => (
                        <div className="warehouse-cargo-row" key={item.id}>
                          <Box size={16} strokeWidth={2.2} aria-hidden="true" />
                          <div>
                            <strong>{item.description}</strong>
                            <span>{item.quantity} volume(s) - {weightFormatter.format(item.weight)} kg - {item.status}</span>
                          </div>
                        </div>
                      ))}
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
            <div className="warehouse-add-title">
              <PackagePlus size={17} strokeWidth={2.2} aria-hidden="true" />
              <strong>Adicionar item ao setor {selectedSectorId}</strong>
            </div>

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
                        placeholder="Descrição da carga"
                        value={item.description}
                        onChange={(event) => updateCargoFormItem(item.id, 'description', event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Volumes</span>
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
              <span className="status-line" aria-live="polite">{status}</span>
            </div>
          </form>
        </aside>
      </div>

      <section className="warehouse-dashboard-grid" aria-label="Dashboards do galpão">
        <article className="registered-launches-panel warehouse-dashboard-card">
          <div className="registered-launches-header">
            <h2>Principais clientes</h2>
            <div><span>{warehouseDashboards.topClients.length} cliente(s)</span></div>
          </div>
          <div className="warehouse-ranking-list">
            {warehouseDashboards.topClients.map((client) => (
              <div className="warehouse-ranking-row" key={client.name}>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.quantity} volume(s) - {weightFormatter.format(client.weight)} kg</span>
                </div>
                <em>{client.itemCount}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="registered-launches-panel warehouse-dashboard-card">
          <div className="registered-launches-header">
            <h2>Principais produtos</h2>
            <div><span>{warehouseDashboards.topProducts.length} produto(s)</span></div>
          </div>
          <div className="warehouse-ranking-list">
            {warehouseDashboards.topProducts.map((product) => (
              <div className="warehouse-ranking-row" key={product.name}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.quantity} volume(s) - {weightFormatter.format(product.weight)} kg</span>
                </div>
                <em>{product.itemCount}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="registered-launches-panel warehouse-dashboard-card">
          <div className="registered-launches-header">
            <h2>Distribuição por cliente</h2>
            <div><span>{cargoItems.length} item(s)</span></div>
          </div>
          <div className="warehouse-distribution-list">
            {warehouseDashboards.clientDistribution.map((client) => (
              <div className="warehouse-distribution-row" key={client.name}>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.percentage}%</span>
                </div>
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
            <div><span>{warehouseDashboards.reportItems.length} item(s)</span></div>
          </div>
          <div className="registered-launches-table-wrap warehouse-report-wrap">
            <table className="registered-launches-table warehouse-report-table">
              <thead>
                <tr>
                  <th>Setor</th>
                  <th>NF</th>
                  <th>Cliente</th>
                  <th>Item</th>
                  <th>Volumes</th>
                  <th>Peso</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {warehouseDashboards.reportItems.map((item) => (
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

            {!warehouseDashboards.reportItems.length && <div className="empty-list">Nenhum item guardado</div>}
          </div>
        </article>
      </section>
    </section>
  );
}
