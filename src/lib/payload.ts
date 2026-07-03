export interface ColumnRef {
  id: string;
  name: string;
}

/** Column id → row values, matching the shape of the Sigma element data hooks. */
export type ColumnData = Record<string, readonly unknown[]>;

/** Default cap on rows serialized into the control, to bound the payload size. */
export const DEFAULT_MAX_ROWS = 1000;

export interface TablePayloadOptions {
  maxRows?: number;
}

/**
 * Serializes the filtered table — the selected columns and their row values —
 * into the JSON written to the workbook control, for an action sequence to
 * hand onward (e.g. as a VARCHAR argument to a warehouse stored procedure).
 *
 * Each row is an object keyed by column display name, in the element's column
 * order. Rows are capped at `maxRows` to stay within a workbook control's size
 * limit: `rowCount` reports the full (pre-cap) filtered count and `truncated`
 * flags when the cap dropped rows. Missing values serialize as null.
 *
 *   {"columns":["Region","Sales"],
 *    "rows":[{"Region":"East","Sales":10}],
 *    "rowCount":1,"truncated":false}
 */
export function buildTablePayload(
  columns: readonly ColumnRef[],
  data: ColumnData | undefined,
  rowIndexes: readonly number[],
  { maxRows = DEFAULT_MAX_ROWS }: TablePayloadOptions = {},
): string {
  if (columns.length === 0) {
    return JSON.stringify({
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
    });
  }
  const cap = Math.max(0, Math.floor(maxRows));
  const included =
    rowIndexes.length > cap ? rowIndexes.slice(0, cap) : rowIndexes;
  const rows = included.map((rowIndex) => {
    const row: Record<string, unknown> = {};
    for (const column of columns) {
      const value = data?.[column.id]?.[rowIndex];
      row[column.name] = value === undefined ? null : value;
    }
    return row;
  });
  return JSON.stringify({
    columns: columns.map((column) => column.name),
    rows,
    rowCount: rowIndexes.length,
    truncated: included.length < rowIndexes.length,
  });
}
