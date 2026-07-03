import type { MetaEntry } from './metadata';

export interface SourceColumn {
  id: string;
  name: string;
}

/** Column id → row values, matching the Sigma element data hooks. */
export type ColumnData = Record<string, readonly unknown[]>;

export const DEFAULT_MAX_ROWS = 1000;

/** A section resolved against its data source, ready to serialize. */
export interface ResolvedSection {
  elementName: string;
  isTable: boolean;
  /** Row objects (tables) keyed by the required column names. */
  rows: Array<Record<string, unknown>>;
  /** Scalar value (named ranges). */
  value: unknown;
}

export const normalize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Whether a metadata entry serializes as a table (array) or a scalar value. */
export function isTableSection(meta: MetaEntry): boolean {
  const type = meta.elementType.toUpperCase();
  if (type.includes('TABLE')) return true;
  if (type.includes('NAMED')) return false;
  // Unknown type: treat "has required columns" as a table, else a scalar.
  return Boolean(meta.columnsRequired && meta.columnsRequired.length > 0);
}

/**
 * Resolves one section against a data source.
 *
 * Tables: every required column becomes a key on each row object (in the
 * required order); the value is pulled from the source column whose name
 * matches (case/space/underscore-insensitive), or null when the source lacks
 * that column or the cell is empty. When no columns are required, all of the
 * source's columns are used.
 *
 * Named ranges: the scalar is the first value of the source column matching the
 * element name (or the sole column of a single-column source), else null.
 */
export function resolveSection(
  meta: MetaEntry,
  sourceColumns: readonly SourceColumn[],
  data: ColumnData | undefined,
  rowIndexes: readonly number[],
  maxRows: number = DEFAULT_MAX_ROWS,
): ResolvedSection {
  const byName = new Map<string, SourceColumn>();
  for (const column of sourceColumns) byName.set(normalize(column.name), column);

  if (!isTableSection(meta)) {
    const target =
      byName.get(normalize(meta.elementName)) ??
      (sourceColumns.length === 1 ? sourceColumns[0] : undefined);
    const firstRow = rowIndexes[0];
    const raw =
      target && firstRow !== undefined ? data?.[target.id]?.[firstRow] : undefined;
    return {
      elementName: meta.elementName,
      isTable: false,
      rows: [],
      value: raw === undefined ? null : raw,
    };
  }

  const wanted =
    meta.columnsRequired && meta.columnsRequired.length > 0
      ? meta.columnsRequired
      : sourceColumns.map((column) => column.name);

  const cap = Math.max(0, Math.floor(maxRows));
  const included =
    rowIndexes.length > cap ? rowIndexes.slice(0, cap) : rowIndexes;
  const rows = included.map((rowIndex) => {
    const row: Record<string, unknown> = {};
    for (const name of wanted) {
      const column = byName.get(normalize(name));
      const raw = column ? data?.[column.id]?.[rowIndex] : undefined;
      row[name] = raw === undefined ? null : raw;
    }
    return row;
  });

  return { elementName: meta.elementName, isTable: true, rows, value: null };
}

/**
 * Serializes resolved sections into the flat, element-name-keyed JSON the
 * downstream stored procedure expects: named ranges map to a scalar, tables to
 * an array of row objects.
 *
 *   { "FundName": "Janus…", "TopHoldings": [ { "ISIN": "…", … } ] }
 */
export function buildReportPayload(sections: readonly ResolvedSection[]): string {
  const out: Record<string, unknown> = {};
  for (const section of sections) {
    out[section.elementName] = section.isTable ? section.rows : section.value;
  }
  return JSON.stringify(out);
}
