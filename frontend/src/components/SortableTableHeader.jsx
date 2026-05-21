import {
  getNextTableSort,
  getTableDefaultSortDirection,
  getTableSortLabel,
} from '../utils/tableSort.js';

export default function SortableTableHeader({ columns, sort, onSortChange }) {
  function changeSort(column) {
    onSortChange(getNextTableSort(sort, column));
  }

  return columns.map((column) => {
    if (column.sortable === false) {
      return <th key={column.key}>{column.label}</th>;
    }

    const isActive = sort.key === column.key;
    const direction = isActive ? sort.direction : getTableDefaultSortDirection(column);
    const nextDirection = isActive
      ? sort.direction === 'asc' ? 'desc' : 'asc'
      : getTableDefaultSortDirection(column);
    const ariaSort = isActive
      ? sort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none';

    return (
      <th key={column.key} aria-sort={ariaSort}>
        <span className="warehouse-sort-header">
          <span>{column.label}</span>
          <button
            type="button"
            className={isActive ? 'warehouse-sort-button warehouse-sort-button--active' : 'warehouse-sort-button'}
            title={`Ordenar ${column.label} ${getTableSortLabel(column, nextDirection)}`}
            aria-label={`Ordenar ${column.label} ${getTableSortLabel(column, nextDirection)}`}
            onClick={() => changeSort(column)}
          >
            {getTableSortLabel(column, direction)}
          </button>
        </span>
      </th>
    );
  });
}
