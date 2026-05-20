import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import {
  blueprintSectors,
  blueprintViewBox,
  defaultSectorId,
  getSectorWeightLimit,
  hasCustomSectorWeightLimit,
  readWarehouseWeightSettings,
  saveWarehouseWeightSettings,
  warehouseWalls,
} from '../data/warehouseRegistry.js';

const weightFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

function inputValue(value) {
  return String(value ?? '').replace(',', '.');
}

function parsePositiveLimit(value) {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function handleSectorKeyDown(event, sectorId, onSelect) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  event.preventDefault();
  onSelect(sectorId);
}

export default function WarehouseSettingsPage() {
  const [settings, setSettings] = useState(readWarehouseWeightSettings);
  const [selectedSectorId, setSelectedSectorId] = useState(defaultSectorId);
  const [globalLimitInput, setGlobalLimitInput] = useState(() => inputValue(settings.globalLimitKg));
  const [sectorLimitInput, setSectorLimitInput] = useState('');
  const [message, setMessage] = useAutoClearMessage();

  const selectedLimit = getSectorWeightLimit(settings, selectedSectorId);
  const selectedHasCustomLimit = hasCustomSectorWeightLimit(settings, selectedSectorId);
  const customLimitEntries = useMemo(() => (
    blueprintSectors
      .filter((sector) => hasCustomSectorWeightLimit(settings, sector.id))
      .map((sector) => ({
        ...sector,
        limit: getSectorWeightLimit(settings, sector.id),
      }))
  ), [settings]);

  useEffect(() => {
    setGlobalLimitInput(inputValue(settings.globalLimitKg));
  }, [settings.globalLimitKg]);

  useEffect(() => {
    setSectorLimitInput(selectedHasCustomLimit ? inputValue(settings.sectorLimits[selectedSectorId]) : '');
  }, [selectedHasCustomLimit, selectedSectorId, settings.sectorLimits]);

  function persistSettings(nextSettings, nextMessage) {
    try {
      const savedSettings = saveWarehouseWeightSettings(nextSettings);
      setSettings(savedSettings);
      setMessage(nextMessage);
    } catch {
      setMessage('Não foi possível salvar a configuração');
    }
  }

  function saveGlobalLimit(event) {
    event.preventDefault();
    const nextLimit = parsePositiveLimit(globalLimitInput);

    if (!nextLimit) {
      setMessage('Informe um limite global maior que zero');
      return;
    }

    persistSettings(
      { ...settings, globalLimitKg: nextLimit },
      `Limite global salvo: ${weightFormatter.format(nextLimit)} kg`,
    );
  }

  function saveSectorLimit(event) {
    event.preventDefault();
    const nextLimit = parsePositiveLimit(sectorLimitInput);

    if (!nextLimit) {
      setMessage('Informe um limite maior que zero para o setor');
      return;
    }

    persistSettings(
      {
        ...settings,
        sectorLimits: {
          ...settings.sectorLimits,
          [selectedSectorId]: nextLimit,
        },
      },
      `Limite do setor ${selectedSectorId} salvo`,
    );
  }

  function clearSectorLimit() {
    const { [selectedSectorId]: _removed, ...nextSectorLimits } = settings.sectorLimits;

    persistSettings(
      { ...settings, sectorLimits: nextSectorLimits },
      `Setor ${selectedSectorId} voltou ao limite global`,
    );
  }

  function clearAllSectorLimits() {
    persistSettings(
      { ...settings, sectorLimits: {} },
      'Ajustes individuais removidos',
    );
  }

  return (
    <section className="warehouse-settings-page registry-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Configuração de Galpão</h1>
          <p className="page-kicker">Limites de peso por setor do galpão</p>
        </div>
      </header>

      <form className="warehouse-settings-global-panel" onSubmit={saveGlobalLimit}>
        <label className="field">
          <span>Limite global por setor (kg)</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={globalLimitInput}
            onChange={(event) => setGlobalLimitInput(event.target.value)}
          />
        </label>
        <button type="submit" className="primary-button">
          <Save size={15} strokeWidth={2.2} />
          Salvar global
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={clearAllSectorLimits}
          disabled={!customLimitEntries.length}
        >
          <RotateCcw size={15} strokeWidth={2.2} />
          Limpar individuais
        </button>
        <span className="status-line" aria-live="polite">{message}</span>
      </form>

      <div className="warehouse-settings-layout">
        <section className="registered-launches-panel warehouse-map-panel" aria-labelledby="warehouse-settings-map-title">
          <div className="registered-launches-header">
            <h2 id="warehouse-settings-map-title">
              <SlidersHorizontal size={17} strokeWidth={2.2} aria-hidden="true" />
              Limites por setor
            </h2>
            <div>
              <span>Global {weightFormatter.format(settings.globalLimitKg)} kg</span>
              <strong>{customLimitEntries.length} individual(is)</strong>
            </div>
          </div>

          <div className="warehouse-map-scroll">
            <div className="warehouse-blueprint-shell">
              <svg className="warehouse-blueprint" viewBox={blueprintViewBox} role="img" aria-labelledby="warehouse-settings-blueprint-title">
                <title id="warehouse-settings-blueprint-title">Planta do galpão para configuração de limites por setor</title>
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
                    const selected = selectedSectorId === sector.id;
                    const customLimit = hasCustomSectorWeightLimit(settings, sector.id);
                    const limit = getSectorWeightLimit(settings, sector.id);

                    return (
                      <g
                        key={sector.id}
                        className={`warehouse-blueprint-sector${selected ? ' warehouse-blueprint-sector--selected' : ''}${customLimit ? ' warehouse-blueprint-sector--custom-limit' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Setor ${sector.id}, limite ${weightFormatter.format(limit)} kg`}
                        aria-pressed={selected}
                        onClick={() => setSelectedSectorId(sector.id)}
                        onKeyDown={(event) => handleSectorKeyDown(event, sector.id, setSelectedSectorId)}
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

        <aside className="selection-panel warehouse-settings-panel" aria-labelledby="warehouse-settings-sector-title">
          <div className="selection-panel-header">
            <h2 id="warehouse-settings-sector-title">Setor {selectedSectorId}</h2>
            <strong>{selectedHasCustomLimit ? 'Individual' : 'Global'}</strong>
          </div>

          <div className="warehouse-sector-summary warehouse-settings-summary">
            <div>
              <span>Limite efetivo</span>
              <strong>{weightFormatter.format(selectedLimit)} kg</strong>
            </div>
            <div>
              <span>Limite global</span>
              <strong>{weightFormatter.format(settings.globalLimitKg)} kg</strong>
            </div>
          </div>

          <form className="warehouse-sector-limit-form" onSubmit={saveSectorLimit}>
            <label className="field">
              <span>Limite individual (kg)</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder={weightFormatter.format(settings.globalLimitKg)}
                value={sectorLimitInput}
                onChange={(event) => setSectorLimitInput(event.target.value)}
              />
            </label>
            <div className="warehouse-sector-limit-actions">
              <button type="submit" className="primary-button">
                <Save size={15} strokeWidth={2.2} />
                Salvar setor
              </button>
              <button type="button" className="secondary-button" onClick={clearSectorLimit} disabled={!selectedHasCustomLimit}>
                Usar global
              </button>
            </div>
          </form>

          <section className="warehouse-custom-limits" aria-labelledby="warehouse-custom-limits-title">
            <header>
              <strong id="warehouse-custom-limits-title">Ajustes individuais</strong>
              <span>{customLimitEntries.length}</span>
            </header>
            <div>
              {customLimitEntries.map((sector) => (
                <button
                  type="button"
                  key={sector.id}
                  className={sector.id === selectedSectorId ? 'warehouse-custom-limit-row active' : 'warehouse-custom-limit-row'}
                  onClick={() => setSelectedSectorId(sector.id)}
                >
                  <strong>{sector.id}</strong>
                  <span>{weightFormatter.format(sector.limit)} kg</span>
                </button>
              ))}
              {!customLimitEntries.length && <div className="empty-list">Nenhum ajuste individual</div>}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
