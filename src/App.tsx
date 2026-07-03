import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useActionTrigger,
  useConfig,
  useEditorPanelConfig,
  useElementColumns,
  useLoadingState,
  usePaginatedElementData,
  usePluginStyle,
  useVariable,
} from '@sigmacomputing/plugin';
import { EDITOR_PANEL_CONFIG, type ExplorerConfig } from './config';
import { useColumnPicker } from './hooks/useColumnPicker';
import { useFilters } from './hooks/useFilters';
import { parseMaxDistinctValues } from './lib/distinct';
import { filterRowIndexes, getRowCount } from './lib/filterRows';
import { buildTablePayload } from './lib/payload';
import { ColumnPane } from './components/ColumnPane';
import { FilterPane } from './components/FilterPane';
import { FooterBar, type FilterChip } from './components/FooterBar';
import { PreviewGrid } from './components/PreviewGrid';
import { Toast } from './components/Toast';

export default function App() {
  useEditorPanelConfig(EDITOR_PANEL_CONFIG);

  const config = useConfig() as ExplorerConfig | undefined;
  const source = typeof config?.source === 'string' ? config.source : '';
  const maxDistinct = parseMaxDistinctValues(
    typeof config?.maxDistinctValues === 'string'
      ? config.maxDistinctValues
      : undefined,
  );

  // The SDK ignores falsy element ids, so these are safe pre-configuration.
  const columnsById = useElementColumns(source);
  const [data, loadMore] = usePaginatedElementData(source);
  const pluginStyle = usePluginStyle();

  const [, setLoadingState] = useLoadingState(true);
  useEffect(() => {
    setLoadingState(false);
  }, [setLoadingState]);

  // Output control wiring. useVariable takes the *value* stored for the config
  // field — the mapped control's variable id — not the field name (see Sigma's
  // control-api-demo-plugin: `useVariable(config.quarter)`).
  const outputControlId =
    typeof config?.selectedColumnsControl === 'string'
      ? config.selectedColumnsControl
      : '';
  const [, setOutputControl] = useVariable(outputControlId);
  const outputControlMapped = outputControlId !== '';
  const writePayload = useCallback(
    (payload: string) => {
      if (outputControlMapped) setOutputControl(payload);
    },
    [outputControlMapped, setOutputControl],
  );

  const persistedIds = Array.isArray(config?.selectedColumnIds)
    ? config.selectedColumnIds
    : undefined;
  const picker = useColumnPicker(columnsById, persistedIds);

  // In-plugin filters: columns chosen inside the plugin, persisted in config.
  const filters = useFilters(config, columnsById, data, maxDistinct);

  const filteredRowIndexes = useMemo(
    () => filterRowIndexes(data, filters.rowFilters),
    [data, filters.rowFilters],
  );
  const selectedColumns = useMemo(
    () => picker.columns.filter((column) => picker.selectedIds.has(column.id)),
    [picker.columns, picker.selectedIds],
  );

  // JSON payload: the filtered table (selected columns × filtered rows).
  const payload = useMemo(
    () => buildTablePayload(selectedColumns, data, filteredRowIndexes),
    [selectedColumns, data, filteredRowIndexes],
  );

  // Keep the mapped control in sync with the filtered table — on load and on
  // every selection, filter or data change.
  useEffect(() => {
    writePayload(payload);
  }, [writePayload, payload]);

  // Run flow. useActionTrigger, like useVariable, takes the value stored for
  // the config field (see Sigma's actions-sample-plugin:
  // `useActionTrigger(config.exampleTrigger)`), not the field name.
  const runActionId =
    typeof config?.runAction === 'string' ? config.runAction : '';
  const triggerRunAction = useActionTrigger(runActionId);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const runDisabledReason =
    source === ''
      ? 'Attach a data source to run'
      : picker.selectedCount === 0
        ? 'Select at least one column to run'
        : null;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const handleRun = useCallback(() => {
    if (runDisabledReason !== null) return;
    // Make sure the control holds the latest table before the action sequence
    // reads it.
    writePayload(payload);
    if (runActionId) {
      triggerRunAction();
      showToast('Action sequence triggered');
    } else {
      // Nothing is attached to the "On run" trigger, so there's no sequence to
      // fire — the table is still written to the mapped control.
      showToast('No run action is configured');
    }
  }, [
    runDisabledReason,
    writePayload,
    payload,
    runActionId,
    triggerRunAction,
    showToast,
  ]);

  const handleClearAll = useCallback(() => {
    filters.clearAll();
    picker.clearSelection();
  }, [filters, picker]);

  // Warn once the user has picked columns but no output control is mapped, so
  // the JSON has nowhere to go. A short delay avoids flashing during the
  // initial config hydration.
  const outputControlMissing =
    picker.columns.length > 0 &&
    picker.selectedCount > 0 &&
    !outputControlMapped;
  const [showOutputNotice, setShowOutputNotice] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setShowOutputNotice(outputControlMissing),
      outputControlMissing ? 700 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [outputControlMissing]);

  const chips: FilterChip[] = filters.filters
    .filter((filter) => filter.selected.length > 0)
    .map((filter) => ({
      id: filter.columnId,
      label: filter.column.name,
      count: filter.selected.length,
      onClear: () => filters.setValues(filter.columnId, []),
    }));

  const hasFilterSelections = chips.length > 0;
  const canClear = hasFilterSelections || picker.selectedCount > 0;

  const rootStyle = pluginStyle?.backgroundColor
    ? { backgroundColor: pluginStyle.backgroundColor }
    : undefined;

  if (source === '') {
    return (
      <div className="app" style={rootStyle}>
        <div className="empty-state">
          <p className="empty-state-title">Attach a table to begin</p>
          <p className="empty-state-hint">
            Select this element, then choose a data source in the editor panel.
            The column picker and filters fill in from the attached table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={rootStyle}>
      {showOutputNotice && (
        <div className="notice" role="status">
          The output isn't being saved. Map a text control to the "Output
          control" field in the editor panel.
        </div>
      )}
      <main className="panes">
        <FilterPane filters={filters} />
        <PreviewGrid
          columns={selectedColumns}
          data={data}
          rowIndexes={filteredRowIndexes}
          loadedRowCount={getRowCount(data)}
          onLoadMore={loadMore}
        />
        <ColumnPane picker={picker} />
      </main>
      <FooterBar
        chips={chips}
        selectedCount={picker.selectedCount}
        totalColumns={picker.columns.length}
        canClear={canClear}
        runDisabledReason={runDisabledReason}
        onClearAll={handleClearAll}
        onRun={handleRun}
      />
      <Toast message={toast} />
    </div>
  );
}
