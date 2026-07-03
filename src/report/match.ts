import type { MetaEntry } from './metadata';
import { isTableSection, normalize, type SourceColumn } from './payload';

export interface MatchableSource {
  key: string;
  columns: readonly SourceColumn[];
}

/**
 * Picks the data source that best fits a metadata section, so mapping is
 * automatic and context-aware (the SDK doesn't expose element names, so we
 * match on columns):
 *
 * - Tables prefer the source containing the most required columns (ties broken
 *   by fewest extra columns, then order); a source with no required column is
 *   never chosen.
 * - Named ranges prefer the source with a column matching the element name; a
 *   single-column source counts as a weak match.
 *
 * Returns the source key, or null when nothing fits.
 */
export function autoMatchSource(
  meta: MetaEntry,
  sources: readonly MatchableSource[],
): string | null {
  if (sources.length === 0) return null;

  if (!isTableSection(meta)) {
    const wanted = normalize(meta.elementName);
    const named = sources.find((source) =>
      source.columns.some((column) => normalize(column.name) === wanted),
    );
    if (named) return named.key;
    const single = sources.find((source) => source.columns.length === 1);
    return single ? single.key : null;
  }

  const required = (meta.columnsRequired ?? []).map(normalize);
  if (required.length === 0) return sources[0]?.key ?? null;

  let best: { key: string; hits: number; extra: number } | null = null;
  for (const source of sources) {
    const names = new Set(source.columns.map((column) => normalize(column.name)));
    const hits = required.filter((name) => names.has(name)).length;
    if (hits === 0) continue;
    const extra = source.columns.length - hits;
    if (
      !best ||
      hits > best.hits ||
      (hits === best.hits && extra < best.extra)
    ) {
      best = { key: source.key, hits, extra };
    }
  }
  return best ? best.key : null;
}
