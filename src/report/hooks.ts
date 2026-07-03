import { useEffect, useMemo } from 'react';
import {
  usePlugin,
  useElementColumns,
  usePaginatedElementData,
  type WorkbookElementData,
} from '@sigmacomputing/plugin';
import { dataSlotColumnsKey, dataSlotKey, type ReportConfig } from './config';
import type { SourceColumn } from './payload';

export interface DataSlot {
  slot: number;
  sourceId: string;
  attached: boolean;
  columns: SourceColumn[];
  data: WorkbookElementData | undefined;
}

/**
 * Resolves one data-source slot. Streams the source's data by writing all of
 * its column ids into the slot's `data{n}Columns` config (Sigma only sends data
 * for declared columns); the report payload then picks the columns each section
 * needs by name.
 */
export function useDataSlot(slot: number, config: ReportConfig | undefined): DataSlot {
  const plugin = usePlugin();
  const sourceId =
    typeof config?.[dataSlotKey(slot)] === 'string'
      ? (config[dataSlotKey(slot)] as string)
      : '';

  const columnsById = useElementColumns(sourceId);
  const [data] = usePaginatedElementData(sourceId);

  const columns = useMemo<SourceColumn[]>(
    () =>
      columnsById
        ? Object.values(columnsById).map((column) => ({
            id: column.id,
            name: column.name,
          }))
        : [],
    [columnsById],
  );

  const allIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const currentCols = config?.[dataSlotColumnsKey(slot)];

  useEffect(() => {
    if (!sourceId || allIds.length === 0) return;
    const current = Array.isArray(currentCols) ? (currentCols as string[]) : [];
    const same =
      current.length === allIds.length &&
      allIds.every((id) => current.includes(id));
    if (!same) plugin.config.set({ [dataSlotColumnsKey(slot)]: allIds });
  }, [sourceId, allIds, currentCols, plugin, slot]);

  return {
    slot,
    sourceId,
    attached: sourceId !== '',
    columns,
    data,
  };
}
