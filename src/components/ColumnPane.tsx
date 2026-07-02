import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkbookElementColumn } from '@sigmacomputing/plugin';
import type { ColumnPicker } from '../hooks/useColumnPicker';
import { VirtualList } from './VirtualList';

interface ColumnPaneProps {
  picker: ColumnPicker;
}

const ROW_HEIGHT = 26;
const VIRTUALIZE_THRESHOLD = 60;

const TYPE_BADGES: Record<string, string> = {
  text: 'text',
  number: 'number',
  integer: 'integer',
  datetime: 'date',
  boolean: 'boolean',
  variant: 'variant',
  link: 'link',
  error: 'error',
};

function typeBadge(column: WorkbookElementColumn): string {
  return TYPE_BADGES[column.columnType] ?? column.columnType;
}

/** Right pane: auto-generated column picker with search and select all. */
export function ColumnPane({ picker }: ColumnPaneProps) {
  const [query, setQuery] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [listHeight, setListHeight] = useState(320);
  const listAreaRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed === '') return picker.columns;
    return picker.columns.filter((column) =>
      column.name.toLowerCase().includes(trimmed),
    );
  }, [picker.columns, query]);

  const visibleSelected = visible.filter((column) =>
    picker.isSelected(column.id),
  ).length;
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        visibleSelected > 0 && !allVisibleSelected;
    }
  }, [visibleSelected, allVisibleSelected]);

  // Size the virtualized list to the pane so long column lists scroll inside
  // the pane rather than stretching it.
  useEffect(() => {
    const area = listAreaRef.current;
    if (!area) return;
    const measure = () => setListHeight(Math.max(120, area.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  const renderRow = (index: number) => {
    const column = visible[index];
    const checked = picker.isSelected(column.id);
    return (
      <label className="column-row" title={column.name}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => picker.setColumnSelected(column.id, !checked)}
        />
        <span className="column-name">{column.name}</span>
        <span className="type-badge">{typeBadge(column)}</span>
      </label>
    );
  };

  return (
    <section className="pane column-pane" aria-label="Choose columns">
      <h2 className="pane-title">Choose columns</h2>
      {picker.columns.length === 0 ? (
        <p className="pane-hint">No columns to show yet.</p>
      ) : (
        <>
          <input
            type="search"
            className="column-search"
            placeholder="Column name contains"
            aria-label="Column name contains"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="column-row select-all-row">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                picker.setManySelected(
                  visible.map((column) => column.id),
                  !allVisibleSelected,
                )
              }
              disabled={visible.length === 0}
            />
            <span className="column-name">
              {query.trim() === ''
                ? 'Select all'
                : `Select all (${visible.length} matching)`}
            </span>
          </label>
          <div className="column-list-area" ref={listAreaRef}>
            {visible.length === 0 ? (
              <p className="pane-hint">
                No columns match — clear the search to see all{' '}
                {picker.columns.length}.
              </p>
            ) : visible.length > VIRTUALIZE_THRESHOLD ? (
              <VirtualList
                itemCount={visible.length}
                itemHeight={ROW_HEIGHT}
                maxHeight={listHeight}
                renderItem={renderRow}
              />
            ) : (
              <div>
                {visible.map((column, index) => (
                  <div key={column.id} style={{ height: ROW_HEIGHT }}>
                    {renderRow(index)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
