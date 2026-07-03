import type { CustomPluginConfigOptions } from '@sigmacomputing/plugin';

/** Values Sigma stores for the editor panel fields declared below. */
export interface ExplorerConfig {
  source?: string;
  /**
   * Selected column ids (a `column` config). The picker writes this, which
   * both persists the selection and tells Sigma which columns to stream.
   */
  columns?: string[];
  selectedColumnsControl?: string;
  runAction?: string;
  [key: string]: unknown;
}

/**
 * Single source of truth for the editor panel.
 *
 * `columns` is declared as a `column` field but is driven by the plugin's
 * picker, not the builder: Sigma only streams data for columns declared to the
 * plugin, so writing the picked columns into this field is what makes their
 * data flow. Filtering is left to the workbook's own controls — the plugin
 * reads whatever the element is already filtered to.
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
