import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkbookElementColumn } from '@sigmacomputing/plugin';
import { VirtualList } from './VirtualList';

interface AddFilterMenuProps {
  columns: readonly WorkbookElementColumn[];
  onAdd(columnId: string): void;
}

const OPTION_HEIGHT = 26;
const LIST_MAX_HEIGHT = 234;
const VIRTUALIZE_THRESHOLD = 60;

/** A searchable menu for adding an in-plugin filter on any element column. */
export function AddFilterMenu({ columns, onAdd }: AddFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed === '') return columns;
    return columns.filter((column) =>
      column.name.toLowerCase().includes(trimmed),
    );
  }, [columns, query]);

  const choose = (columnId: string) => {
    onAdd(columnId);
    close();
  };

  const renderOption = (index: number) => {
    const column = visible[index];
    return (
      <button
        type="button"
        className="add-filter-option"
        title={column.name}
        onClick={() => choose(column.id)}
      >
        {column.name}
      </button>
    );
  };

  return (
    <div className="add-filter" ref={containerRef}>
      <button
        type="button"
        className="add-filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={columns.length === 0}
        onClick={() => (open ? close() : setOpen(true))}
      >
        + Add filter
      </button>
      {open && (
        <div className="dropdown-panel">
          <input
            ref={searchRef}
            type="search"
            className="dropdown-search"
            placeholder="Filter on column"
            aria-label="Search columns to filter on"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {visible.length === 0 ? (
            <p className="dropdown-empty">No columns available</p>
          ) : visible.length > VIRTUALIZE_THRESHOLD ? (
            <VirtualList
              className="dropdown-options"
              itemCount={visible.length}
              itemHeight={OPTION_HEIGHT}
              maxHeight={LIST_MAX_HEIGHT}
              renderItem={renderOption}
            />
          ) : (
            <div
              className="dropdown-options"
              style={{ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }}
            >
              {visible.map((column, index) => (
                <div key={column.id} style={{ height: OPTION_HEIGHT }}>
                  {renderOption(index)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
