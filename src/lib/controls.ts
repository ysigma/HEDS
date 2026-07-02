import type { WorkbookVariable } from '@sigmacomputing/plugin';
import type { FilterValue } from './distinct';

const LIST_CONTROL_TYPES = new Set(['text-list', 'number-list', 'date-list']);

/**
 * Whether a workbook control type can hold more than one value. Filter slots
 * mapped to non-list controls fall back to single-select.
 */
export function isListControlType(controlType: string | undefined): boolean {
  return controlType !== undefined && LIST_CONTROL_TYPES.has(controlType);
}

const isFilterValue = (value: unknown): value is FilterValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/**
 * Normalizes a workbook control's current value into the plugin's selection
 * shape. Cleared controls (null) and unmapped slots yield an empty selection.
 */
export function readVariableSelection(
  variable: WorkbookVariable | undefined,
): FilterValue[] {
  const value = variable?.defaultValue?.value;
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter(isFilterValue);
  return isFilterValue(value) ? [value] : [];
}
