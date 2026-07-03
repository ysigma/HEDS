import { useCallback, useMemo, useState } from 'react';
import {
  usePlugin,
  type WorkbookElementColumn,
  type WorkbookElementColumns,
} from '@sigmacomputing/plugin';

export interface ColumnPicker {
  /** Every column of the attached element, in element order. */
  columns: WorkbookElementColumn[];
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  isSelected(columnId: string): boolean;
  setColumnSelected(columnId: string, selected: boolean): void;
  setManySelected(columnIds: readonly string[], selected: boolean): void;
  clearSelection(): void;
}

/**
 * Column selection for the picker. Every element column is available (from
 * `useElementColumns`); ticking one writes it into the `columns` config field
 * via `client.config.set`, which is what makes Sigma stream that column's data
 * to the plugin. So the selection is the data request: pick a column and its
 * data flows in for the preview and the JSON. The choice lives in the config,
 * so it survives reloads.
 */
export function useColumnPicker(
  columnsById: WorkbookElementColumns | undefined,
  selectedColumnIds: readonly string[] | undefined,
): ColumnPicker {
  const plugin = usePlugin();
  const [localIds, setLocalIds] = useState<ReadonlySet<string> | undefined>();

  const columns = useMemo(
    () => (columnsById ? Object.values(columnsById) : []),
    [columnsById],
  );

  // Local edits win over the config value; ids whose columns no longer exist
  // are pruned (but not before columns have loaded).
  const selectedIds = useMemo<ReadonlySet<string>>(() => {
    const base = localIds ?? new Set(selectedColumnIds ?? []);
    if (columns.length === 0) return base;
    const valid = new Set(columns.map((column) => column.id));
    return new Set([...base].filter((id) => valid.has(id)));
  }, [localIds, selectedColumnIds, columns]);

  // Write the selection into the `columns` config field — this both persists
  // the choice and tells Sigma which columns' data to stream to the plugin.
  const commit = useCallback(
    (next: ReadonlySet<string>) => {
      setLocalIds(next);
      plugin.config.set({ columns: [...next] });
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
