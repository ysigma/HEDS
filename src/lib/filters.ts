import type { FilterValue } from './distinct';

export interface StoredFilter {
  columnId: string;
  values: FilterValue[];
}

export const isFilterValue = (value: unknown): value is FilterValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/**
 * Normalizes the persisted filter list against the element's current columns:
 * drops filters whose column no longer exists, de-duplicates by column, and
 * coerces the stored values. Pruning is skipped until columns have loaded so a
 * restored filter set isn't discarded before the element's columns arrive.
 */
export function reconcileFilters(
  stored: unknown,
  validColumnIds: ReadonlySet<string>,
): StoredFilter[] {
  if (!Array.isArray(stored)) return [];
  const prune = validColumnIds.size > 0;
  const seen = new Set<string>();
  const result: StoredFilter[] = [];
  for (const entry of stored) {
    if (!entry || typeof entry.columnId !== 'string') continue;
    if (prune && !validColumnIds.has(entry.columnId)) continue;
    if (seen.has(entry.columnId)) continue;
    seen.add(entry.columnId);
    result.push({
      columnId: entry.columnId,
      values: Array.isArray(entry.values)
        ? entry.values.filter(isFilterValue)
        : [],
    });
  }
  return result;
}
