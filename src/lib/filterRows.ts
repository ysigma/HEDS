import type { WorkbookElementData } from '@sigmacomputing/plugin';

export interface RowFilter {
  columnId: string;
  /** Stringified selected values; an empty set means the filter is inactive. */
  selectedKeys: ReadonlySet<string>;
}

/** Row count of an element data payload (columns can arrive ragged). */
export function getRowCount(data: WorkbookElementData | undefined): number {
  if (!data) return 0;
  let count = 0;
  for (const values of Object.values(data)) {
    if (Array.isArray(values) && values.length > count) count = values.length;
  }
  return count;
}

/**
 * In-plugin filtering (Mode B): returns the indexes of rows that match every
 * filter with a non-empty selection. Values are compared by their string
 * representation, mirroring how selections are keyed in the dropdowns.
 */
export function filterRowIndexes(
  data: WorkbookElementData | undefined,
  filters: readonly RowFilter[],
): number[] {
  const rowCount = getRowCount(data);
  const active = filters.filter(
    (filter) =>
      filter.selectedKeys.size > 0 && Array.isArray(data?.[filter.columnId]),
  );
  const indexes: number[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    let matches = true;
    for (const filter of active) {
      const value = data?.[filter.columnId]?.[row];
      if (
        value === null ||
        value === undefined ||
        !filter.selectedKeys.has(String(value))
      ) {
        matches = false;
        break;
      }
    }
    if (matches) indexes.push(row);
  }
  return indexes;
}
