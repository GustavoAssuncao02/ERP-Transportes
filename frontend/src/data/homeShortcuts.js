import { navigationItems, quickAccessCards } from './siteData.js';

export const homeShortcutStorageKey = 'homeShortcutPageIds';

export const defaultHomeShortcutIds = quickAccessCards
  .map((card) => card.pageId)
  .filter(Boolean);

const rootIcons = {
  financeiro: 'finance',
  fiscal: 'fiscal',
  gestao: 'system',
  operacao: 'operation',
  sistema: 'system',
};

function collectShortcutOptions(items, rootId = '', parents = []) {
  return items.flatMap((item) => {
    const nextRootId = rootId || item.id;

    if (item.children?.length) {
      return collectShortcutOptions(item.children, nextRootId, [...parents, item.label]);
    }

    if (!item.pageId) return [];

    return {
      id: `shortcut-${item.pageId}`,
      label: item.label,
      menuPath: parents.join(' / '),
      pageId: item.pageId,
      icon: rootIcons[nextRootId] || 'system',
    };
  });
}

export function getHomeShortcutOptions() {
  const options = collectShortcutOptions(navigationItems);
  const seenPageIds = new Set();

  return options.filter((option) => {
    if (seenPageIds.has(option.pageId)) return false;
    seenPageIds.add(option.pageId);
    return true;
  });
}

export function normalizeHomeShortcutIds(ids) {
  const validPageIds = new Set(getHomeShortcutOptions().map((option) => option.pageId));
  const seenPageIds = new Set();

  return ids.filter((pageId) => {
    if (!validPageIds.has(pageId) || seenPageIds.has(pageId)) return false;
    seenPageIds.add(pageId);
    return true;
  });
}

export function readHomeShortcutIds() {
  try {
    const storedIds = JSON.parse(localStorage.getItem(homeShortcutStorageKey) || '[]');
    const normalizedIds = Array.isArray(storedIds) ? normalizeHomeShortcutIds(storedIds) : [];
    return normalizedIds.length ? normalizedIds : defaultHomeShortcutIds;
  } catch {
    return defaultHomeShortcutIds;
  }
}

export function saveHomeShortcutIds(ids) {
  const normalizedIds = normalizeHomeShortcutIds(ids);
  localStorage.setItem(homeShortcutStorageKey, JSON.stringify(normalizedIds));
  return normalizedIds;
}

export function getHomeShortcutCards(ids = readHomeShortcutIds()) {
  const optionsByPageId = new Map(getHomeShortcutOptions().map((option) => [option.pageId, option]));

  return normalizeHomeShortcutIds(ids)
    .map((pageId) => optionsByPageId.get(pageId))
    .filter(Boolean)
    .map((option) => ({
      ...option,
      id: `quick-${option.pageId}`,
    }));
}
