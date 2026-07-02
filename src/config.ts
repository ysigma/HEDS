import type { CustomPluginConfigOptions } from '@sigmacomputing/plugin';

export const FILTER_SLOT_COUNT = 6;

export const slotColumnKey = (slot: number): string => `filter${slot}Column`;
export const slotControlKey = (slot: number): string => `filter${slot}Control`;

/** Plugin-local state persisted into the workbook via `client.config.set`. */
export interface PersistedState {
  selectedColumnIds?: string[];
}

/** Values Sigma stores for the editor panel fields declared below. */
export interface ExplorerConfig extends PersistedState {
  source?: string;
  selectedColumnsControl?: string;
  runAction?: string;
  inPluginFiltering?: boolean;
  maxDistinctValues?: string;
  /** `filter{n}Column` and `filter{n}Control` slot values. */
  [key: string]: unknown;
}

function buildEditorPanel(): CustomPluginConfigOptions[] {
  const fields: CustomPluginConfigOptions[] = [
    { name: 'source', type: 'element', label: 'Data source' },
    { name: 'filters', type: 'group', label: 'Filters' },
  ];
  for (let slot = 1; slot <= FILTER_SLOT_COUNT; slot += 1) {
    fields.push({
      name: slotColumnKey(slot),
      type: 'column',
      source: 'source',
      allowMultiple: false,
      allowedTypes: ['text', 'number', 'integer', 'boolean'],
      label: `Filter ${slot} column`,
    });
    fields.push({
      name: slotControlKey(slot),
      type: 'variable',
      label: `Filter ${slot} control`,
    });
  }
  fields.push(
    {
      name: 'selectedColumnsControl',
      type: 'variable',
      label: 'Selected columns control (text)',
    },
    { name: 'runAction', type: 'action-trigger', label: 'On run' },
    {
      name: 'inPluginFiltering',
      type: 'toggle',
      label: 'In-plugin filtering mode',
      defaultValue: false,
    },
    {
      name: 'maxDistinctValues',
      type: 'text',
      label: 'Max distinct values per dropdown',
      defaultValue: '1000',
    },
  );
  return fields;
}

/**
 * Single source of truth for the editor panel. Declared once at module scope
 * so the same array instance is registered on every render.
 */
export const EDITOR_PANEL_CONFIG: CustomPluginConfigOptions[] = buildEditorPanel();
