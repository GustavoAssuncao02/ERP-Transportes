import { useMemo, useState } from 'react';
import { RotateCcw, Save, Search } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { normalizeText } from '../data/financeData.js';
import {
  defaultHomeShortcutIds,
  getHomeShortcutOptions,
} from '../data/homeShortcuts.js';

export default function HomeShortcutsPage({ selectedShortcutIds, onSave }) {
  const [selectedIds, setSelectedIds] = useState(selectedShortcutIds);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useAutoClearMessage();

  const shortcutOptions = useMemo(() => getHomeShortcutOptions(), []);
  const filteredOptions = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return shortcutOptions;

    return shortcutOptions.filter((option) => (
      normalizeText(`${option.label} ${option.menuPath}`).includes(query)
    ));
  }, [search, shortcutOptions]);

  function toggleShortcut(pageId) {
    setSelectedIds((currentIds) => (
      currentIds.includes(pageId)
        ? currentIds.filter((currentId) => currentId !== pageId)
        : [...currentIds, pageId]
    ));
    setMessage('');
  }

  function restoreDefaultShortcuts() {
    setSelectedIds(defaultHomeShortcutIds);
    setMessage('Atalhos padrão restaurados. Salve para aplicar na tela inicial.');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const savedIds = onSave?.(selectedIds) || selectedIds;
    setSelectedIds(savedIds);
    setMessage(`${savedIds.length} atalho(s) salvo(s) para a tela inicial`);
  }

  return (
    <section className="home-shortcuts-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Gerenciar Atalhos de Início</h1>
          <p className="page-kicker">Escolha quais opções dos menus aparecem no Acesso rápido da tela principal</p>
        </div>
      </header>

      <form className="shortcut-manager-layout" onSubmit={handleSubmit}>
        <section className="registered-launches-panel shortcut-options-panel" aria-labelledby="shortcut-options-title">
          <div className="registered-launches-header">
            <h2 id="shortcut-options-title">Opções disponíveis</h2>
            <div>
              <span>{filteredOptions.length} opção(ões)</span>
              <strong>{selectedIds.length} selecionado(s)</strong>
            </div>
          </div>

          <div className="lookup-modal-toolbar shortcut-searchbar">
            <div className="lookup-field">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar por opção ou menu"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="shortcut-search-icon" aria-hidden="true">
                <Search size={16} strokeWidth={2.2} />
              </span>
            </div>
          </div>

          <div className="registered-launches-table-wrap">
            <table className="registered-launches-table shortcut-options-table">
              <thead>
                <tr>
                  <th>Usar</th>
                  <th>Opção</th>
                  <th>Menu</th>
                </tr>
              </thead>
              <tbody>
                {filteredOptions.map((option) => {
                  const checked = selectedIds.includes(option.pageId);

                  return (
                    <tr key={option.pageId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          aria-label={`Usar ${option.label} como atalho`}
                          onChange={() => toggleShortcut(option.pageId)}
                        />
                      </td>
                      <td><strong>{option.label}</strong></td>
                      <td>{option.menuPath}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filteredOptions.length && <div className="empty-list">Nenhuma opção encontrada</div>}
          </div>

          <div className="shortcut-manager-actions">
            <button type="submit" className="primary-button">
              <Save size={15} strokeWidth={2.2} />
              Salvar atalhos
            </button>
            <button type="button" className="secondary-button" onClick={restoreDefaultShortcuts}>
              <RotateCcw size={15} strokeWidth={2.2} />
              Restaurar padrão
            </button>
          </div>

          <div className="shortcut-manager-status" aria-live="polite">{message}</div>
        </section>
      </form>
    </section>
  );
}
