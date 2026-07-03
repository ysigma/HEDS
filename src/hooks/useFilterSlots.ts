import { useCallback, useMemo, useState } from 'react';
import {
  useVariable,
  type WorkbookElementColumn,
  type WorkbookElementColumns,
  type WorkbookElementData,
} from '@sigmacomputing/plugin';
import { slotColumnKey, slotControlKey, type ExplorerConfig } from '../config';
import {
  deriveDistinctValues,
  mergeSelectedIntoValues,
  type FilterValue,
} from '../lib/distinct';
import { isListControlType, readVariableSelection } from '../lib/controls';

export interface FilterSlot {
  slot: number;
  column: WorkbookElementColumn;
  /** Distinct values to offer, capped and with the selection merged in. */
  values: FilterValue[];
  totalDistinct: number;
  truncated: boolean;
  selected: FilterValue[];
  /** Stringified selection, for O(1) membership checks. */
  selectedKeys: ReadonlySet<string>;
  /** False when the mapped control cannot accept a list of values. */
  multiSelect: boolean;
  setSelected(next: FilterValue[]): void;
  clear(): void;
}

/**
 * Resolves one paired filter slot from the editor panel.
 *
 * Mode A (default): the mapped workbook control is the single source of truth.
 * The dropdown selection is derived from the control's current value, and
 * changes are pushed back through the `useVariable` setter, so plugin and
 * workbook stay in sync in both directions. Clearing sets the control to null.
 *
 * Mode B (in-plugin filtering): the control wiring is skipped and the
 * selection lives in local state; a slot only needs its column mapped.
 *
 * Returns null when the slot is incomplete — incomplete slots are ignored
 * silently.
 */
export function useFilterSlot(
  slot: number,
  config: ExplorerConfig | undefined,
  columnsById: WorkbookElementColumns | undefined,
  data: WorkbookElementData | undefined,
  maxValues: number,
  inPluginFiltering: boolean,
): FilterSlot | null {
  const [variable, setVariable] = useVariable(slotControlKey(slot));
  const [localSelection, setLocalSelection] = useState<FilterValue[]>([]);

  const rawColumn = config?.[slotColumnKey(slot)];
  const columnId =
    typeof rawColumn === 'string'
      ? rawColumn
      : Array.isArray(rawColumn) && typeof rawColumn[0] === 'string'
        ? rawColumn[0]
        : undefined;
  const controlValue = config?.[slotControlKey(slot)];
  const controlMapped = controlValue !== undefined && controlValue !== null && controlValue !== '';
  const column = columnId && columnsById ? columnsById[columnId] : undefined;

  const selected = useMemo<FilterValue[]>(
    () => (inPluginFiltering ? localSelection : readVariableSelection(variable)),
    [inPluginFiltering, localSelection, variable],
  );

  const selectedKeys = useMemo(
    () => new Set(selected.map((value) => String(value))),
    [selected],
  );

  const distinct = useMemo(
    () => deriveDistinctValues(columnId ? data?.[columnId] : undefined, maxValues),
    [data, columnId, maxValues],
  );

  const values = useMemo(
    () => mergeSelectedIntoValues(distinct.values, selected),
    [distinct.values, selected],
  );

  const setSelected = useCallback(
    (next: FilterValue[]) => {
      if (inPluginFiltering) {
        setLocalSelection(next);
      } else if (variable === undefined) {
        // The host has not published this control, so its binding is unmapped
        // or stale; writing would raise a "variable not found" host error.
        // Skip silently — the dropdown simply has nothing to drive.
      } else if (next.length === 0) {
        // Clearing the dropdown must clear the workbook control too.
        setVariable(null);
      } else {
        setVariable(...next);
      }
    },
    [inPluginFiltering, variable, setVariable],
  );

  const clear = useCallback(() => setSelected([]), [setSelected]);

  const active = Boolean(column) && (inPluginFiltering || controlMapped);
  if (!active || !column) return null;

  return {
    slot,
    column,
    values,
    totalDistinct: distinct.totalDistinct,
    truncated: distinct.truncated,
    selected,
    selectedKeys,
    multiSelect: inPluginFiltering
      ? true
      : isListControlType(variable?.defaultValue?.type),
    setSelected,
    clear,
  };
}
