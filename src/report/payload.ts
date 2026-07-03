import type { MetaEntry } from './metadata';

export interface SourceColumn {
  id: string;
  name: string;
}

/** Column id → row values, matching the Sigma element data hooks. */
export type ColumnData = Record<string, readonly unknown[]>;

export const DEFAULT_MAX_ROWS = 1000;

/** A section resolved to its data, ready to serialize. */
export interface ResolvedSection {
  elementName: string;
  elementType: string;
  sheetName: string | null;
  cellRef: string | null;
  tableRef: string | null;
  isTable: boolean;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  value: unknown;
}

const normalize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Whether a metadata entry should serialize as a table or a scalar value. */
export function isTableSection(
  meta: MetaEntry,
  rowCount: number,
  columnCount: number,
): boolean {
  const type = meta.elementType.toUpperCase();
  if (type.includes('TABLE')) return true;
  if (type.includes('NAMED_RANGE') || type.includes('NAMEDRANGE')) return false;
  if (meta.columnsRequired && meta.columnsRequired.length > 0) return true;
  // Infer from shape: a single cell is a scalar, anything wider is a table.
  return rowCount > 1 || columnCount > 1;
}

/**
 * Resolves one section against a data source: pairs the required columns (or,
 * when none are specified, all of the source's columns) to the source by name,
 * and produces either a row array (tables) or a scalar value (named ranges).
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

  const wanted =
    meta.columnsRequired && meta.columnsRequired.length > 0
      ? meta.columnsRequired
      : sourceColumns.map((column) => column.name);

  const resolvedCols = wanted
    .map((name) => ({ name, column: byName.get(normalize(name)) }))
    .filter((entry): entry is { name: string; column: SourceColumn } =>
      Boolean(entry.column),
    );

  const table = isTableSection(meta, rowIndexes.length, resolvedCols.length);

  const base = {
    elementName: meta.elementName,
    elementType: meta.elementType,
    sheetName: meta.sheetName,
    cellRef: meta.cellRef,
    tableRef: meta.tableRef,
  };

  if (!table) {
    // Named range: read the source column matching the element name (so one
    // source can feed several named ranges), falling back to the first
    // required/available column.
    const target =
      byName.get(normalize(meta.elementName)) ??
      resolvedCols[0]?.column ??
      sourceColumns[0];
    const firstRow = rowIndexes[0];
    const raw =
      target && firstRow !== undefined
        ? data?.[target.id]?.[firstRow]
        : undefined;
    return {
      ...base,
      isTable: false,
      columns: [],
      rows: [],
      value: raw === undefined ? null : raw,
    };
  }

  const cap = Math.max(0, Math.floor(maxRows));
  const included =
    rowIndexes.length > cap ? rowIndexes.slice(0, cap) : rowIndexes;
  const rows = included.map((rowIndex) => {
    const row: Record<string, unknown> = {};
    for (const { name, column } of resolvedCols) {
      const raw = data?.[column.id]?.[rowIndex];
      row[name] = raw === undefined ? null : raw;
    }
    return row;
  });

  return {
    ...base,
    isTable: true,
    columns: resolvedCols.map((entry) => entry.name),
    rows,
    value: null,
  };
}

/** Serializes resolved sections into the flat, element-name-keyed report JSON. */
export function buildReportPayload(sections: readonly ResolvedSection[]): string {
  const out: Record<string, unknown> = {};
  for (const section of sections) {
    const common = {
      elementType: section.elementType,
      sheetName: section.sheetName,
      cellRef: section.cellRef,
      tableRef: section.tableRef,
    };
    out[section.elementName] = section.isTable
      ? { ...common, columns: section.columns, rows: section.rows }
      : { ...common, value: section.value };
  }
  return JSON.stringify(out);
}
