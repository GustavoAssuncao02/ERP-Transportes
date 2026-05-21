import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { TableSkeleton } from './LoadingStates.jsx';
import {
  getNextTableSort,
  getTableDefaultSortDirection,
  getTableSortLabel,
} from '../utils/tableSort.js';

function optionValue(option) {
  return typeof option === 'object' ? option.value : option;
}

function optionLabel(option) {
  return typeof option === 'object' ? option.label : option;
}

function renderActionIcon(icon) {
  if (!icon) return null;

  if (typeof icon === 'function') {
    const Icon = icon;
    return <Icon size={15} strokeWidth={2.2} aria-hidden="true" />;
  }

  return icon;
}

function renderCell(row, column) {
  if (column.render) {
    return column.render(row);
  }

  const value = column.getValue ? column.getValue(row) : row[column.key];

  if (column.status) {
    return <span className="launch-status-pill">{value || '-'}</span>;
  }

  return value || value === 0 ? value : '-';
}

export default function DataTable({
  title,
  titleId,
  rows = [],
  columns = [],
  getRowKey,
  onRowClick,
  rowClassName,
  rowActions = [],
  sort,
  onSortChange,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Pesquisar',
  filters = [],
  summary,
  panelClassName = '',
  tableClassName = '',
  minWidth,
  pagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const hasSearch = typeof onSearchChange === 'function';
  const hasToolbar = hasSearch || filters.length > 0;
  const hasActions = rowActions.length > 0;
  const columnCount = columns.length + (hasActions ? 1 : 0);
  const pageCount = pagination ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize, searchValue]);

  const visibleRows = useMemo(() => {
    if (!pagination) {
      return rows;
    }

    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [currentPage, pageSize, pagination, rows]);

  function changeSort(column) {
    if (!sort || !onSortChange || column.sortable === false) {
      return;
    }

    onSortChange(getNextTableSort(sort, column));
  }

  function renderHeaderCell(column) {
    const sortable = Boolean(sort && onSortChange && column.sortable !== false);

    if (!sortable) {
      return (
        <th key={column.key} className={column.headerClassName}>
          {column.label}
        </th>
      );
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
      <th key={column.key} className={column.headerClassName} aria-sort={ariaSort}>
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
  }

  return (
    <section className={`registered-launches-panel standard-data-table-panel ${panelClassName}`.trim()} aria-labelledby={titleId}>
      {(title || summary) && (
        <div className="registered-launches-header standard-data-table-header">
          {title && <h2 id={titleId}>{title}</h2>}
          {summary && <div>{summary}</div>}
        </div>
      )}

      {hasToolbar && (
        <div className="standard-data-table-toolbar">
          {hasSearch && (
            <label className="standard-data-table-search">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search size={16} strokeWidth={2.2} aria-hidden="true" />
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
          )}

          {filters.map((filter) => (
            <label className="standard-data-table-filter" key={filter.id}>
              <span>{filter.label}</span>
              <select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                {filter.options.map((option) => (
                  <option value={optionValue(option)} key={optionValue(option)}>
                    {optionLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      <div className="registered-launches-table-wrap standard-data-table-wrap">
        {loading ? (
          <TableSkeleton rows={Math.min(pageSize, 8)} columns={columnCount} />
        ) : (
          <table
            className={`registered-launches-table standard-data-table ${tableClassName}`.trim()}
            style={minWidth ? { minWidth } : undefined}
          >
            <thead>
              <tr>
                {columns.map((column) => renderHeaderCell(column))}
                {hasActions && <th className="standard-data-table-actions-heading">Acoes</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const key = getRowKey ? getRowKey(row, index) : row.id || index;
                const nextRowClassName = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;

                return (
                  <tr
                    key={key}
                    className={nextRowClassName}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        {renderCell(row, column)}
                      </td>
                    ))}

                    {hasActions && (
                      <td className="standard-data-table-actions">
                        {rowActions
                          .filter((action) => {
                            if (typeof action.hidden === 'function') {
                              return !action.hidden(row);
                            }

                            return !action.hidden;
                          })
                          .map((action) => (
                            <button
                              type="button"
                              className={`icon-button ${action.className || ''}`.trim()}
                              aria-label={action.label}
                              title={action.label}
                              key={action.key}
                              disabled={typeof action.disabled === 'function' ? action.disabled(row) : Boolean(action.disabled)}
                              onClick={(event) => {
                                event.stopPropagation();
                                action.onClick?.(row);
                              }}
                            >
                              {renderActionIcon(action.icon)}
                            </button>
                          ))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && rows.length === 0 && <div className="empty-list">{emptyMessage}</div>}
      </div>

      {pagination && !loading && rows.length > 0 && (
        <div className="standard-data-table-pagination" aria-label="Paginacao da tabela">
          <span>
            {rows.length} registro(s)
          </span>

          <label>
            <span>Linhas</span>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {pageSizeOptions.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>

          <div>
            <button
              type="button"
              className="icon-button"
              aria-label="Pagina anterior"
              title="Pagina anterior"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={16} strokeWidth={2.3} />
            </button>
            <span>Pagina {currentPage} de {pageCount}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Proxima pagina"
              title="Proxima pagina"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              <ChevronRight size={16} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
