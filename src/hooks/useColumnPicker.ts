import { useCallback, useMemo, useState } from 'react';
import {
  usePlugin,
  type WorkbookElementColumn,
  type WorkbookElementColumns,
} from '@sigmacomputing/plugin';
import { buildSelectedColumnsPayload } from '../lib/payload';

export interface ColumnPicker {
  /** All columns of the attached element, in element order. */
  columns: WorkbookElementColumn[];
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  isSelected(columnId: string): boolean;
  setColumnSelected(columnId: string, selected: boolean): void;
  setManySelected(columnIds: readonly string[], selected: boolean): void;
  clearSelection(): void;
  /** The exact JSON string for the selected-columns control. */
  payload: string;
}

/**
 * Column selection state for the right pane. The list itself always comes from
 * `useElementColumns`; the selection is kept locally, persisted into the
 * plugin config (so it survives reloads), and pushed to the mapped workbook
 * control as a JSON payload on every change.
 */
export function useColumnPicker(
  columnsById: WorkbookElementColumns | undefined,
  persistedIds: readonly string[] | undefined,
): ColumnPicker {
  const plugin = usePlugin();
  const [localIds, setLocalIds] = useState<ReadonlySet<string> | undefined>();

  const columns = useMemo(
    () => (columnsById ? Object.values(columnsById) : []),
    [columnsById],
  );

  // Local edits win over the persisted selection. Ids whose columns no longer
  // exist on the source element are dropped silently.
  const selectedIds = useMemo<ReadonlySet<string>>(() => {
    const base = localIds ?? new Set(persistedIds ?? []);
    if (columns.length === 0) return base; // don't prune before columns arrive
    const valid = new Set(columns.map((column) => column.id));
    return new Set([...base].filter((id) => valid.has(id)));
  }, [localIds, persistedIds, columns]);

  const payload = useMemo(
    () => buildSelectedColumnsPayload(columns, selectedIds),
    [columns, selectedIds],
  );

  // Persist the selected ids so the picker restores after a reload. The JSON
  // payload is written to the workbook control by the caller, keyed on the
  // derived `payload` value, so there is a single writer for that control.
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
    payload,
  };
}
