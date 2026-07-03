import type { WorkbookElementData } from '@sigmacomputing/plugin';

/** Row count of an element data payload (columns can arrive ragged). */
export function getRowCount(data: WorkbookElementData | undefined): number {
  if (!data) return 0;
  let count = 0;
  for (const values of Object.values(data)) {
    if (Array.isArray(values) && values.length > count) count = values.length;
  }
  return count;
}

/** The row indexes `[0, 1, …, n-1]` for a data payload. */
export function allRowIndexes(data: WorkbookElementData | undefined): number[] {
  const count = getRowCount(data);
  return Array.from({ length: count }, (_, index) => index);
}
