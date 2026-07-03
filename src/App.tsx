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
import { useFilterSlot, type FilterSlot } from './hooks/useFilterSlots';
import { parseMaxDistinctValues } from './lib/distinct';
import { filterRowIndexes, getRowCount } from './lib/filterRows';
import { ColumnPane } from './components/ColumnPane';
import { FilterPane } from './components/FilterPane';
import { FooterBar, type FilterChip } from './components/FooterBar';
import { PreviewGrid } from './components/PreviewGrid';
import { Toast } from './components/Toast';

export default function App() {
  useEditorPanelConfig(EDITOR_PANEL_CONFIG);

  const config = useConfig() as ExplorerConfig | undefined;
  const source = typeof config?.source === 'string' ? config.source : '';
  const inPluginFiltering = config?.inPluginFiltering === true;
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

  // Selected-columns control wiring. useVariable takes the *value* stored for
  // the config field — the mapped control's variable id — not the field name
  // (see Sigma's control-api-demo-plugin: `useVariable(config.quarter)`).
  // Passing the field name leaves the host unable to resolve the binding.
  const selectedColumnsControlId =
    typeof config?.selectedColumnsControl === 'string'
      ? config.selectedColumnsControl
      : '';
  const [, setSelectedColumnsControl] = useVariable(selectedColumnsControlId);
  const selectedColumnsControlMapped = selectedColumnsControlId !== '';
  const writePayload = useCallback(
    (payload: string) => {
      if (selectedColumnsControlMapped) setSelectedColumnsControl(payload);
    },
    [selectedColumnsControlMapped, setSelectedColumnsControl],
  );

  const persistedIds = Array.isArray(config?.selectedColumnIds)
    ? config.selectedColumnIds
    : undefined;
  const picker = useColumnPicker(columnsById, persistedIds);

  // Keep the mapped control in sync with the current selection — on load (so a
  // restored selection is reflected immediately) and on every change.
  useEffect(() => {
    writePayload(picker.payload);
  }, [writePayload, picker.payload]);

  // Filter slots. The slot count is a compile-time constant, so these hook
  // calls are unconditional and stable across renders.
  const slot1 = useFilterSlot(1, config, columnsById, data, maxDistinct, inPluginFiltering);
  const slot2 = useFilterSlot(2, config, columnsById, data, maxDistinct, inPluginFiltering);
  const slot3 = useFilterSlot(3, config, columnsById, data, maxDistinct, inPluginFiltering);
  const slot4 = useFilterSlot(4, config, columnsById, data, maxDistinct, inPluginFiltering);
  const slot5 = useFilterSlot(5, config, columnsById, data, maxDistinct, inPluginFiltering);
  const slot6 = useFilterSlot(6, config, columnsById, data, maxDistinct, inPluginFiltering);
  const slots = useMemo(
    () =>
      [slot1, slot2, slot3, slot4, slot5, slot6].filter(
        (slot): slot is FilterSlot => slot !== null,
      ),
    [slot1, slot2, slot3, slot4, slot5, slot6],
  );

  // Run flow.
  const triggerRunAction = useActionTrigger('runAction');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const runDisabledReason =
    source === ''
      ? 'Attach a data source to run'
      : picker.selectedCount === 0
        ? 'Select at least one column to run'
        : null;

  const handleRun = useCallback(() => {
    if (runDisabledReason !== null) return;
    // Make sure the control holds the latest selection before the action
    // sequence reads it.
    writePayload(picker.payload);
    triggerRunAction();
    setToast('Action sequence triggered');
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, [runDisabledReason, writePayload, picker.payload, triggerRunAction]);

  const handleClearAll = useCallback(() => {
    for (const slot of slots) slot.clear();
    picker.clearSelection();
  }, [slots, picker]);

  // Mode B: filter loaded rows in memory.
  const rowFilters = useMemo(
    () =>
      slots.map((slot) => ({
        columnId: slot.column.id,
        selectedKeys: slot.selectedKeys,
      })),
    [slots],
  );
  const filteredRowIndexes = useMemo(
    () => (inPluginFiltering ? filterRowIndexes(data, rowFilters) : []),
    [inPluginFiltering, data, rowFilters],
  );
  const selectedColumns = useMemo(
    () => picker.columns.filter((column) => picker.selectedIds.has(column.id)),
    [picker.columns, picker.selectedIds],
  );

  // Warn once the user has picked columns but no output control is mapped, so
  // the JSON has nowhere to go. A short delay avoids flashing during the
  // initial config hydration.
  const columnsControlUnmapped =
    picker.columns.length > 0 &&
    picker.selectedCount > 0 &&
    !selectedColumnsControlMapped;
  const [showColumnsControlNotice, setShowColumnsControlNotice] =
    useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setShowColumnsControlNotice(columnsControlUnmapped),
      columnsControlUnmapped ? 700 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [columnsControlUnmapped]);

  const chips: FilterChip[] = slots
    .filter((slot) => slot.selected.length > 0)
    .map((slot) => ({
      slot: slot.slot,
      label: slot.column.name,
      count: slot.selected.length,
      onClear: slot.clear,
    }));

  const canClear = chips.length > 0 || picker.selectedCount > 0;

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
            Filter dropdowns and the column picker fill in automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={rootStyle}>
      {showColumnsControlNotice && (
        <div className="notice" role="status">
          The selected columns aren't being saved. Map a text control to the
          "Selected columns control" field in the editor panel.
        </div>
      )}
      <main
        className="panes"
        data-mode={inPluginFiltering ? 'in-plugin' : 'controls'}
      >
        <FilterPane slots={slots} inPluginFiltering={inPluginFiltering} />
        {inPluginFiltering && (
          <PreviewGrid
            columns={selectedColumns}
            data={data}
            rowIndexes={filteredRowIndexes}
            loadedRowCount={getRowCount(data)}
            onLoadMore={loadMore}
          />
        )}
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
