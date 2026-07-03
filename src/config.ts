import type { CustomPluginConfigOptions } from '@sigmacomputing/plugin';

/** Plugin-local state persisted into the workbook via `client.config.set`. */
export interface PersistedState {
  selectedColumnIds?: string[];
}

/** Values Sigma stores for the editor panel fields declared below. */
export interface ExplorerConfig extends PersistedState {
  source?: string;
  /** Column ids the data source exposes to the plugin (a `column` config). */
  columns?: string[];
  selectedColumnsControl?: string;
  runAction?: string;
  [key: string]: unknown;
}

/**
 * Single source of truth for the editor panel.
 *
 * `columns` is required: Sigma only streams data for columns declared to the
 * plugin, so the builder maps it (typically "select all") to make the source's
 * columns available. Filtering is left to the workbook's own controls — the
 * plugin reads whatever the element is already filtered to.
 */
export const EDITOR_PANEL_CONFIG: CustomPluginConfigOptions[] = [
  { name: 'source', type: 'element', label: 'Data source' },
  {
    name: 'columns',
    type: 'column',
    source: 'source',
    allowMultiple: true,
    label: 'Columns',
  },
  {
    name: 'selectedColumnsControl',
    type: 'variable',
    label: 'Output control (text)',
  },
  { name: 'runAction', type: 'action-trigger', label: 'On run' },
];
