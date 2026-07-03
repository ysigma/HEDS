import type {
  WorkbookElementColumns,
  WorkbookElementData,
} from '@sigmacomputing/plugin';

/** One row of the template metadata table. */
export interface MetaEntry {
  elementName: string;
  elementType: string;
  sheetName: string | null;
  cellRef: string | null;
  tableRef: string | null;
  columnsRequired: string[] | null;
}

type Role =
  | 'elementType'
  | 'elementName'
  | 'sheetName'
  | 'cellRef'
  | 'tableRef'
  | 'columnsRequired';

const normalize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Best-effort match of a metadata column's display name to a known role. */
function roleFor(name: string): Role | null {
  const n = normalize(name);
  if (n.includes('sheet')) return 'sheetName';
  if (n.includes('elementtype') || (n.includes('type') && !n.includes('name')))
    return 'elementType';
  if (n.includes('elementname') || (n.includes('name') && !n.includes('type')))
    return 'elementName';
  if (n.includes('cell')) return 'cellRef';
  if (n.includes('tableref') || (n.includes('table') && n.includes('ref')))
    return 'tableRef';
  if (n.includes('column')) return 'columnsRequired';
  return null;
}

const asText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' || text.toLowerCase() === 'null' ? null : text;
};

/** Parses a "Columns Required" cell — a JSON array, or a loose comma list. */
export function parseColumnsRequired(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const list = value.map((entry) => String(entry).trim()).filter(Boolean);
    return list.length ? list : null;
  }
  const text = asText(value);
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const list = parsed.map((entry) => String(entry).trim()).filter(Boolean);
      return list.length ? list : null;
    }
  } catch {
    // fall through to loose parsing
  }
  const list = text
    .replace(/^[[]|[\]]$/g, '')
    .split(',')
    .map((entry) => entry.replace(/^["'\s]+|["'\s]+$/g, ''))
    .filter(Boolean);
  return list.length ? list : null;
}

/**
 * Parses the attached metadata table into the report's target sections. Columns
 * are matched to roles by display name (Element Type / Element Name / Sheet
 * Name / Cell Ref / Table Ref / Columns Required), so column order doesn't
 * matter. Rows without an element name are skipped.
 */
export function parseMetadata(
  columns: WorkbookElementColumns | undefined,
  data: WorkbookElementData | undefined,
): MetaEntry[] {
  if (!columns || !data) return [];
  const roleToColId = {} as Record<Role, string>;
  for (const column of Object.values(columns)) {
    const role = roleFor(column.name);
    if (role && !(role in roleToColId)) roleToColId[role] = column.id;
  }

  const nameColId = roleToColId.elementName;
  if (!nameColId) return [];

  const rowCount = data[nameColId]?.length ?? 0;
  const cell = (role: Role, row: number): unknown => {
    const colId = roleToColId[role];
    return colId ? data[colId]?.[row] : undefined;
  };

  const entries: MetaEntry[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const elementName = asText(cell('elementName', row));
    if (!elementName) continue;
    entries.push({
      elementName,
      elementType: asText(cell('elementType', row)) ?? '',
      sheetName: asText(cell('sheetName', row)),
      cellRef: asText(cell('cellRef', row)),
      tableRef: asText(cell('tableRef', row)),
      columnsRequired: parseColumnsRequired(cell('columnsRequired', row)),
    });
  }
  return entries;
}
