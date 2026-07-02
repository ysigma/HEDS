export interface ColumnRef {
  id: string;
  name: string;
}

/**
 * Builds the JSON string written to the selected-columns control. The shape is
 * part of the plugin's contract with workbook action sequences and must stay
 * exactly `{"columns":["Column A","Column B"]}` — display names, ordered by
 * the element's column order.
 */
export function buildSelectedColumnsPayload(
  orderedColumns: readonly ColumnRef[],
  selectedIds: ReadonlySet<string>,
): string {
  const columns = orderedColumns
    .filter((column) => selectedIds.has(column.id))
    .map((column) => column.name);
  return JSON.stringify({ columns });
}
