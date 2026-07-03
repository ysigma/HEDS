import type { CustomPluginConfigOptions } from '@sigmacomputing/plugin';
import type { FilterValue } from './lib/distinct';

/** A single in-plugin filter, persisted into the workbook via `client.config.set`. */
export interface StoredFilter {
  columnId: string;
  values: FilterValue[];
}

/** Plugin-local state persisted into the workbook via `client.config.set`. */
export interface PersistedState {
  selectedColumnIds?: string[];
  filters?: StoredFilter[];
}

/** Values Sigma stores for the editor panel fields declared below. */
export interface ExplorerConfig extends PersistedState {
  source?: string;
  selectedColumnsControl?: string;
  runAction?: string;
  maxDistinctValues?: string;
  [key: string]: unknown;
}

/**
 * Single source of truth for the editor panel. Filtering happens inside the
 * plugin (the builder picks filter columns in the plugin, not here), so the
 * panel only needs the data source, the output control, the run action, and
 * the dropdown cap — no per-filter fields.
 */
export const EDITOR_PANEL_CONFIG: CustomPluginConfigOptions[] = [
  { name: 'source', type: 'element', label: 'Data source' },
  {
    name: 'selectedColumnsControl',
    type: 'variable',
    label: 'Output control (text)',
  },
  { name: 'runAction', type: 'action-trigger', label: 'On run' },
  {
    name: 'maxDistinctValues',
    type: 'text',
    label: 'Max distinct values per dropdown',
    defaultValue: '1000',
  },
];
