import { useCallback, useMemo, useState } from 'react';
import {
  usePlugin,
  type WorkbookElementColumn,
  type WorkbookElementColumns,
  type WorkbookElementData,
} from '@sigmacomputing/plugin';
import type { ExplorerConfig } from '../config';
import {
  deriveDistinctValues,
  mergeSelectedIntoValues,
  type FilterValue,
} from '../lib/distinct';
import { reconcileFilters, type StoredFilter } from '../lib/filters';
import type { RowFilter } from '../lib/filterRows';

export interface ActiveFilter {
  columnId: string;
  column: WorkbookElementColumn;
  selected: FilterValue[];
  selectedKeys: ReadonlySet<string>;
  /** Distinct values to offer, capped and with the selection merged in. */
  options: FilterValue[];
  totalDistinct: number;
  truncated: boolean;
}

export interface FilterManager {
  filters: ActiveFilter[];
  /** Columns that don't yet have a filter, in element order. */
  availableColumns: WorkbookElementColumn[];
  addFilter(columnId: string): void;
  removeFilter(columnId: string): void;
  setValues(columnId: string, values: FilterValue[]): void;
  clearAll(): void;
  /** Filters with a non-empty selection, for in-memory row filtering. */
  rowFilters: RowFilter[];
}

/**
 * Manages the plugin's in-memory filters. Filter columns are chosen inside the
 * plugin (not the editor panel) and persisted into the plugin config, so they
 * survive reloads. No workbook controls are involved: the selected values feed
 * the in-plugin row filtering and, through it, the JSON payload.
 */
export function useFilters(
  config: ExplorerConfig | undefined,
  columnsById: WorkbookElementColumns | undefined,
  data: WorkbookElementData | undefined,
  maxValues: number,
): FilterManager {
  const plugin = usePlugin();
  const [local, setLocal] = useState<StoredFilter[] | undefined>();

  const columns = useMemo(
    () => (columnsById ? Object.values(columnsById) : []),
    [columnsById],
  );
  const validColumnIds = useMemo(
    () => new Set(columns.map((column) => column.id)),
    [columns],
  );

  // Local edits win over the persisted list; both are reconciled against the
  // element's current columns.
  const stored = useMemo(
    () => reconcileFilters(local ?? config?.filters, validColumnIds),
    [local, config?.filters, validColumnIds],
  );

  const commit = useCallback(
    (next: StoredFilter[]) => {
      setLocal(next);
      plugin.config.set({ filters: next });
    },
    [plugin],
  );

  const addFilter = useCallback(
    (columnId: string) => {
      if (stored.some((filter) => filter.columnId === columnId)) return;
      commit([...stored, { columnId, values: [] }]);
    },
    [stored, commit],
  );

  const removeFilter = useCallback(
    (columnId: string) => {
      commit(stored.filter((filter) => filter.columnId !== columnId));
    },
    [stored, commit],
  );

  const setValues = useCallback(
    (columnId: string, values: FilterValue[]) => {
      commit(
        stored.map((filter) =>
          filter.columnId === columnId ? { ...filter, values } : filter,
        ),
      );
    },
    [stored, commit],
  );

  const clearAll = useCallback(() => {
    if (stored.length === 0) return;
    commit(stored.map((filter) => ({ ...filter, values: [] })));
  }, [stored, commit]);

  const filters = useMemo<ActiveFilter[]>(() => {
    return stored.flatMap((filter) => {
      const column = columnsById?.[filter.columnId];
      if (!column) return [];
      const distinct = deriveDistinctValues(data?.[filter.columnId], maxValues);
      return [
        {
          columnId: filter.columnId,
          column,
          selected: filter.values,
          selectedKeys: new Set(filter.values.map((value) => String(value))),
          options: mergeSelectedIntoValues(distinct.values, filter.values),
          totalDistinct: distinct.totalDistinct,
          truncated: distinct.truncated,
        },
      ];
    });
  }, [stored, columnsById, data, maxValues]);

  const availableColumns = useMemo(() => {
    const filtered = new Set(stored.map((filter) => filter.columnId));
    return columns.filter((column) => !filtered.has(column.id));
  }, [columns, stored]);

  const rowFilters = useMemo<RowFilter[]>(
    () =>
      filters
        .filter((filter) => filter.selected.length > 0)
        .map((filter) => ({
          columnId: filter.columnId,
          selectedKeys: filter.selectedKeys,
        })),
    [filters],
  );

  return {
    filters,
    availableColumns,
    addFilter,
    removeFilter,
    setValues,
    clearAll,
    rowFilters,
  };
}
