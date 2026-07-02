import { useEffect, useRef, useState } from 'react';
import type {
  WorkbookElementColumn,
  WorkbookElementData,
} from '@sigmacomputing/plugin';
import { VirtualList } from './VirtualList';

interface PreviewGridProps {
  /** Selected columns, in element order. */
  columns: WorkbookElementColumn[];
  data: WorkbookElementData | undefined;
  /** Indexes of rows that pass the in-plugin filters. */
  rowIndexes: number[];
  loadedRowCount: number;
  onLoadMore(): void;
}

const PREVIEW_ROW_LIMIT = 200;
const ROW_HEIGHT = 24;

const isNumeric = (column: WorkbookElementColumn) =>
  column.columnType === 'number' || column.columnType === 'integer';

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

/**
 * Mode B only: a compact read-only preview of the filtered rows, limited to
 * the selected columns and the first 200 matches.
 */
export function PreviewGrid({
  columns,
  data,
  rowIndexes,
  loadedRowCount,
  onLoadMore,
}: PreviewGridProps) {
  const [gridHeight, setGridHeight] = useState(320);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => setGridHeight(Math.max(120, body.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const shown = rowIndexes.slice(0, PREVIEW_ROW_LIMIT);
  const template = `repeat(${Math.max(columns.length, 1)}, minmax(110px, 1fr))`;

  const renderRow = (index: number) => {
    const rowIndex = shown[index];
    return (
      <div className="grid-row" style={{ gridTemplateColumns: template }}>
        {columns.map((column) => (
          <span
            key={column.id}
            className={isNumeric(column) ? 'grid-cell numeric' : 'grid-cell'}
          >
            {formatCell(data?.[column.id]?.[rowIndex])}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="pane preview-pane" aria-label="Preview">
      <h2 className="pane-title">Preview</h2>
      {columns.length === 0 ? (
        <p className="pane-hint">Select columns to preview rows.</p>
      ) : loadedRowCount === 0 ? (
        <p className="pane-hint">The data source has no rows.</p>
      ) : (
        <>
          <div className="grid-scroll">
            <div
              className="grid-header grid-row"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((column) => (
                <span
                  key={column.id}
                  className={
                    isNumeric(column)
                      ? 'grid-cell grid-head numeric'
                      : 'grid-cell grid-head'
                  }
                  title={column.name}
                >
                  {column.name}
                </span>
              ))}
            </div>
            <div className="grid-body" ref={bodyRef}>
              {shown.length === 0 ? (
                <p className="pane-hint">No rows match the current filters.</p>
              ) : (
                <VirtualList
                  itemCount={shown.length}
                  itemHeight={ROW_HEIGHT}
                  maxHeight={gridHeight}
                  renderItem={renderRow}
                />
              )}
            </div>
          </div>
          <div className="grid-footer">
            <span className="grid-count">
              Showing {shown.length} of {rowIndexes.length} filtered rows ·{' '}
              {loadedRowCount.toLocaleString()} rows loaded
            </span>
            <button type="button" className="link-button" onClick={onLoadMore}>
              Load more rows
            </button>
          </div>
          <p className="pane-footnote">
            Rows arrive in chunks of up to 25,000.
          </p>
        </>
      )}
    </section>
  );
}
