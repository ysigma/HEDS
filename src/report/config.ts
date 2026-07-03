import type { CustomPluginConfigOptions } from '@sigmacomputing/plugin';

export const DATA_SLOT_COUNT = 5;

export const dataSlotKey = (slot: number): string => `data${slot}`;
export const dataSlotColumnsKey = (slot: number): string => `data${slot}Columns`;

/** Persisted mapping: metadata section (element name) → data slot key. */
export type SectionAssignments = Record<string, string>;

export interface ReportConfig {
  metadata?: string;
  output?: string;
  runAction?: string;
  /** Persisted section → data slot assignments. */
  assignments?: SectionAssignments;
  /** data{n} element ids and data{n}Columns column configs. */
  [key: string]: unknown;
}

/**
 * Editor panel for the report builder. The builder attaches the metadata table
 * and the data source elements; everything else (which source feeds which
 * section) is chosen inside the plugin. The `data{n}Columns` fields are
 * plugin-managed (they make Sigma stream each source's data).
 */
function buildEditorPanel(): CustomPluginConfigOptions[] {
  const fields: CustomPluginConfigOptions[] = [
    { name: 'metadata', type: 'element', label: 'Template metadata table' },
  ];
  for (let slot = 1; slot <= DATA_SLOT_COUNT; slot += 1) {
    fields.push({
      name: dataSlotKey(slot),
      type: 'element',
      label: `Data source ${slot}`,
    });
    fields.push({
      name: dataSlotColumnsKey(slot),
      type: 'column',
      source: dataSlotKey(slot),
      allowMultiple: true,
      label: `Data source ${slot} columns`,
    });
  }
  fields.push(
    { name: 'output', type: 'variable', label: 'Output control (text)' },
    { name: 'runAction', type: 'action-trigger', label: 'On run' },
  );
  return fields;
}

export const REPORT_EDITOR_PANEL_CONFIG: CustomPluginConfigOptions[] =
  buildEditorPanel();
