import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useActionTrigger,
  useConfig,
  useEditorPanelConfig,
  useElementColumns,
  useElementData,
  useLoadingState,
  usePlugin,
  usePluginStyle,
  useVariable,
} from '@sigmacomputing/plugin';
import {
  REPORT_EDITOR_PANEL_CONFIG,
  dataSlotKey,
  type ReportConfig,
  type SectionAssignments,
} from './config';
import { parseMetadata } from './metadata';
import {
  buildReportPayload,
  resolveSection,
  type ResolvedSection,
} from './payload';
import { useDataSlot, type DataSlot } from './hooks';
import { allRowIndexes } from '../lib/filterRows';
import { Toast } from '../components/Toast';

export default function App() {
  useEditorPanelConfig(REPORT_EDITOR_PANEL_CONFIG);

  const config = useConfig() as ReportConfig | undefined;
  const pluginStyle = usePluginStyle();

  const [, setLoadingState] = useLoadingState(true);
  useEffect(() => {
    setLoadingState(false);
  }, [setLoadingState]);

  // Metadata table → the report's target sections.
  const metaSource = typeof config?.metadata === 'string' ? config.metadata : '';
  const metaColumns = useElementColumns(metaSource);
  const metaData = useElementData(metaSource);
  const sections = useMemo(
    () => parseMetadata(metaColumns, metaData),
    [metaColumns, metaData],
  );
  const metaColumnIds = useMemo(
    () => (metaColumns ? Object.values(metaColumns).map((column) => column.id) : []),
    [metaColumns],
  );

  // Fixed data-source slots (unconditional hook calls).
  const slot1 = useDataSlot(1, config);
  const slot2 = useDataSlot(2, config);
  const slot3 = useDataSlot(3, config);
  const slot4 = useDataSlot(4, config);
  const slot5 = useDataSlot(5, config);
  const slots = useMemo(
    () => [slot1, slot2, slot3, slot4, slot5],
    [slot1, slot2, slot3, slot4, slot5],
  );
  const attachedSlots = useMemo(
    () => slots.filter((slot) => slot.attached),
    [slots],
  );
  const slotByKey = useMemo(() => {
    const map = new Map<string, DataSlot>();
    for (const slot of slots) map.set(dataSlotKey(slot.slot), slot);
    return map;
  }, [slots]);

  const assignments: SectionAssignments = useMemo(
    () => (config?.assignments as SectionAssignments) ?? {},
    [config?.assignments],
  );

  const plugin = usePluginSetter();

  // Stream the metadata table's data by declaring all its columns (Sigma sends
  // data only for declared columns). Plugin-managed, like each data slot.
  const currentMetaCols = config?.metadataColumns;
  useEffect(() => {
    if (metaSource === '' || metaColumnIds.length === 0) return;
    const current = Array.isArray(currentMetaCols)
      ? (currentMetaCols as string[])
      : [];
    const same =
      current.length === metaColumnIds.length &&
      metaColumnIds.every((id) => current.includes(id));
    if (!same) plugin.set({ metadataColumns: metaColumnIds });
  }, [metaSource, metaColumnIds, currentMetaCols, plugin]);

  const assign = useCallback(
    (elementName: string, slotKey: string) => {
      const next: SectionAssignments = { ...assignments };
      if (slotKey === '') delete next[elementName];
      else next[elementName] = slotKey;
      plugin.set({ assignments: next });
    },
    [assignments, plugin],
  );

  // Resolve each assigned section against its data source.
  const resolved = useMemo<ResolvedSection[]>(() => {
    return sections.flatMap((section) => {
      const slotKey = assignments[section.elementName];
      if (!slotKey) return [];
      const slot = slotByKey.get(slotKey);
      if (!slot || !slot.attached) return [];
      return [
        resolveSection(
          section,
          slot.columns,
          slot.data,
          allRowIndexes(slot.data),
        ),
      ];
    });
  }, [sections, assignments, slotByKey]);

  const payload = useMemo(() => buildReportPayload(resolved), [resolved]);
  const prettyPayload = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      return payload;
    }
  }, [payload]);

  // Output control wiring — write the value stored for the config field (the
  // mapped control's variable id), not the field name.
  const outputControlId =
    typeof config?.output === 'string' ? config.output : '';
  const [, setOutputControl] = useVariable(outputControlId);
  const outputMapped = outputControlId !== '';
  const writePayload = useCallback(
    (value: string) => {
      if (outputMapped) setOutputControl(value);
    },
    [outputMapped, setOutputControl],
  );
  useEffect(() => {
    writePayload(payload);
  }, [writePayload, payload]);

  // Run flow.
  const runActionId =
    typeof config?.runAction === 'string' ? config.runAction : '';
  const triggerRunAction = useActionTrigger(runActionId);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const assignedCount = resolved.length;
  const runDisabledReason =
    sections.length === 0
      ? 'Attach the metadata table to begin'
      : assignedCount === 0
        ? 'Assign a data source to at least one section'
        : null;

  const handleRun = useCallback(() => {
    if (runDisabledReason !== null) return;
    writePayload(payload);
    if (runActionId) {
      triggerRunAction();
      showToast('Action sequence triggered');
    } else {
      showToast('No run action is configured');
    }
  }, [runDisabledReason, writePayload, payload, runActionId, triggerRunAction, showToast]);

  const rootStyle = pluginStyle?.backgroundColor
    ? { backgroundColor: pluginStyle.backgroundColor }
    : undefined;

  if (metaSource === '') {
    return (
      <div className="app" style={rootStyle}>
        <div className="empty-state">
          <p className="empty-state-title">Attach the template metadata table</p>
          <p className="empty-state-hint">
            In the editor panel, set "Template metadata table" to the table that
            lists each element (name, type, sheet, cell/table ref, required
            columns). Then attach your data sources and map them here.
          </p>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="app" style={rootStyle}>
        <div className="empty-state">
          <p className="empty-state-title">No sections found in the metadata</p>
          <p className="empty-state-hint">
            The metadata table needs an "Element Name" column (plus Element
            Type, Sheet Name, Cell/Table Ref and Columns Required). Check the
            attached table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={rootStyle}>
      {!outputMapped && assignedCount > 0 && (
        <div className="notice" role="status">
          The report isn't being saved. Map a text control to the "Output
          control" field in the editor panel.
        </div>
      )}
      <main className="panes report-panes">
        <section className="pane" aria-label="Sections">
          <h2 className="pane-title">Sections</h2>
          {attachedSlots.length === 0 && (
            <p className="pane-hint">
              Attach one or more data sources in the editor panel, then map each
              section to a source below.
            </p>
          )}
          <div className="section-list">
            {sections.map((section) => (
              <div className="section-row" key={section.elementName}>
                <div className="section-head">
                  <span className="section-name" title={section.elementName}>
                    {section.elementName}
                  </span>
                  <span className="type-badge">
                    {section.elementType || 'unknown'}
                  </span>
                </div>
                <div className="section-meta">
                  {section.sheetName ?? '—'}
                  {section.tableRef
                    ? ` · ${section.tableRef}`
                    : section.cellRef
                      ? ` · ${section.cellRef}`
                      : ''}
                </div>
                <select
                  className="section-select"
                  aria-label={`Data source for ${section.elementName}`}
                  value={assignments[section.elementName] ?? ''}
                  onChange={(event) =>
                    assign(section.elementName, event.target.value)
                  }
                >
                  <option value="">— no data source —</option>
                  {attachedSlots.map((slot) => (
                    <option key={slot.slot} value={dataSlotKey(slot.slot)}>
                      Data source {slot.slot}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
        <section className="pane json-pane" aria-label="Output preview">
          <h2 className="pane-title">Output preview</h2>
          <pre className="json-preview">{prettyPayload}</pre>
        </section>
      </main>
      <footer className="footer-bar">
        <div className="footer-status">
          <span className="footer-count">
            {assignedCount} of {sections.length} sections mapped
          </span>
        </div>
        <div className="footer-actions">
          <span
            className="run-wrap"
            title={runDisabledReason ?? 'Trigger the attached action sequence'}
          >
            <button
              type="button"
              className="run-button"
              disabled={runDisabledReason !== null}
              onClick={handleRun}
            >
              Run
            </button>
          </span>
        </div>
      </footer>
      <Toast message={toast} />
    </div>
  );
}

/** Small wrapper so the config setter is stable and typed. */
function usePluginSetter() {
  const plugin = usePlugin();
  return useMemo(
    () => ({
      set: (partial: Partial<ReportConfig>) => plugin.config.set(partial),
    }),
    [plugin],
  );
}
