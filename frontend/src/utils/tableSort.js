const tableTextSorter = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

export function getTableDefaultSortDirection(column) {
  return column.type === 'number' || column.type === 'date' ? 'desc' : 'asc';
}

export function getTableSortLabel(column, direction) {
  if (column.type === 'number' || column.type === 'date') {
    return direction === 'asc' ? '1-9' : '9-1';
  }

  return direction === 'asc' ? 'A-Z' : 'Z-A';
}

export function getNextTableSort(currentSort, column) {
  if (currentSort.key === column.key) {
    return {
      key: column.key,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
    };
  }

  return {
    key: column.key,
    direction: getTableDefaultSortDirection(column),
  };
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function compareValues(firstValue, secondValue, column) {
  if (column.type === 'number') {
    return numberValue(firstValue) - numberValue(secondValue);
  }

  if (column.type === 'date') {
    return tableTextSorter.compare(String(firstValue || ''), String(secondValue || ''));
  }

  return tableTextSorter.compare(String(firstValue || ''), String(secondValue || ''));
}

export function sortTableRows(rows, columns, sort, fallbackCompare) {
  const column = columns.find((option) => option.key === sort.key && option.sortable !== false)
    || columns.find((option) => option.sortable !== false)
    || columns[0];
  const direction = sort.direction === 'desc' ? 'desc' : 'asc';

  return [...rows].sort((first, second) => {
    const result = compareValues(column.getValue(first), column.getValue(second), column);

    if (result !== 0) {
      return direction === 'asc' ? result : -result;
    }

    return fallbackCompare ? fallbackCompare(first, second) : 0;
  });
}
