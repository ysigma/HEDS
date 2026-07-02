export type FilterValue = string | number | boolean;

export interface DistinctResult {
  values: FilterValue[];
  totalDistinct: number;
  truncated: boolean;
}

export const MAX_DISTINCT_FALLBACK = 1000;
export const MAX_DISTINCT_CEILING = 25000;

const typeRank = (value: FilterValue): number => {
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return 1;
  return 2;
};

/** Ascending order: numbers, then booleans (false first), then strings. */
export function compareValues(a: FilterValue, b: FilterValue): number {
  const rank = typeRank(a) - typeRank(b);
  if (rank !== 0) return rank;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  const first = String(a);
  const second = String(b);
  return (
    first.localeCompare(second, undefined, {
      numeric: true,
      sensitivity: 'base',
    }) || first.localeCompare(second)
  );
}

/**
 * Derives the sorted list of distinct values for a filter dropdown from a raw
 * column of element data. Nulls and NaNs are dropped; the result is capped at
 * `max` values with `truncated` flagging that the cap was hit.
 */
export function deriveDistinctValues(
  raw: readonly unknown[] | undefined,
  max: number,
): DistinctResult {
  if (!raw || raw.length === 0) {
    return { values: [], totalDistinct: 0, truncated: false };
  }
  const seen = new Set<FilterValue>();
  for (const value of raw) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'number') {
      if (!Number.isNaN(value)) seen.add(value);
    } else if (typeof value === 'string' || typeof value === 'boolean') {
      seen.add(value);
    } else {
      seen.add(String(value));
    }
  }
  const sorted = [...seen].sort(compareValues);
  const cap = Math.max(0, Math.floor(max));
  const values = sorted.length > cap ? sorted.slice(0, cap) : sorted;
  return {
    values,
    totalDistinct: sorted.length,
    truncated: sorted.length > values.length,
  };
}

/**
 * Keeps values the user already selected visible in a dropdown even when the
 * (possibly narrowed or truncated) data no longer contains them.
 */
export function mergeSelectedIntoValues(
  values: readonly FilterValue[],
  selected: readonly FilterValue[],
): FilterValue[] {
  if (selected.length === 0) return [...values];
  const present = new Set(values.map((value) => String(value)));
  const missing = selected.filter((value) => !present.has(String(value)));
  if (missing.length === 0) return [...values];
  return [...values, ...missing].sort(compareValues);
}

/**
 * Parses the "max distinct values per dropdown" editor panel text field.
 * Blank or invalid input falls back to the default; the result is clamped to
 * the SDK's 25,000-value data window.
 */
export function parseMaxDistinctValues(
  text: string | undefined,
  fallback: number = MAX_DISTINCT_FALLBACK,
): number {
  if (text === undefined || text.trim() === '') return fallback;
  const parsed = Number.parseInt(text.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, MAX_DISTINCT_CEILING);
}
