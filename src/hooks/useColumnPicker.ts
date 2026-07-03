import { useCallback, useMemo, useState } from 'react';
import {
  usePlugin,
  type WorkbookElementColumn,
  type WorkbookElementColumns,
} from '@sigmacomputing/plugin';

export interface ColumnPicker {
  /** The columns exposed to the plugin, in element order. */
  columns: WorkbookElementColumn[];
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  isSelected(columnId: string): boolean;
  setColumnSelected(columnId: string, selected: boolean): void;
  setManySelected(columnIds: readonly string[], selected: boolean): void;
  clearSelection(): void;
}

/**
 * Column selection for the picker. The available columns are those the data
 * source exposes to the plugin (the `columns` config); everything is selected
 * by default until the user narrows it. The selection is kept locally and
 * persisted into the plugin config so it survives reloads. The JSON payload is
 * derived and written by the caller, which holds the row data.
 */
export function useColumnPicker(
  columnsById: WorkbookElementColumns | undefined,
  availableColumnIds: readonly string[] | undefined,
  persistedIds: readonly string[] | undefined,
): ColumnPicker {
  const plugin = usePlugin();
  const [localIds, setLocalIds] = useState<ReadonlySet<string> | undefined>();

  // Only expose columns the source has declared to the plugin, in element order.
  const columns = useMemo(() => {
    if (!columnsById || !availableColumnIds) return [];
    const available = new Set(availableColumnIds);
    return Object.values(columnsById).filter((column) =>
      available.has(column.id),
    );
  }, [columnsById, availableColumnIds]);

  // Default to every available column selected; once the user edits, their
  // persisted choice takes over. Local edits win and ids are pruned to what's
  // still available.
  const selectedIds = useMemo<ReadonlySet<string>>(() => {
    const base =
      localIds ??
      (persistedIds != null
        ? new Set(persistedIds)
        : new Set(columns.map((column) => column.id)));
    if (columns.length === 0) return base;
    const valid = new Set(columns.map((column) => column.id));
    return new Set([...base].filter((id) => valid.has(id)));
  }, [localIds, persistedIds, columns]);

  const commit = useCallback(
    (next: ReadonlySet<string>) => {
      setLocalIds(next);
      plugin.config.set({ selectedColumnIds: [...next] });
    },
    [plugin],
  );

  const isSelected = useCallback(
    (columnId: string) => selectedIds.has(columnId),
    [selectedIds],
  );

  const setColumnSelected = useCallback(
    (columnId: string, selected: boolean) => {
      const next = new Set(selectedIds);
      if (selected) next.add(columnId);
      else next.delete(columnId);
      commit(next);
    },
    [selectedIds, commit],
  );

  const setManySelected = useCallback(
    (columnIds: readonly string[], selected: boolean) => {
      const next = new Set(selectedIds);
      for (const id of columnIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      commit(next);
    },
    [selectedIds, commit],
  );

  const clearSelection = useCallback(() => {
    commit(new Set());
  }, [commit]);

  return {
    columns,
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    setColumnSelected,
    setManySelected,
    clearSelection,
  };
}
