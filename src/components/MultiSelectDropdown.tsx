import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { FilterValue } from '../lib/distinct';
import { VirtualList } from './VirtualList';

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  options: readonly FilterValue[];
  selected: readonly FilterValue[];
  selectedKeys: ReadonlySet<string>;
  multiSelect: boolean;
  truncated: boolean;
  onChange(next: FilterValue[]): void;
}

const OPTION_HEIGHT = 26;
const LIST_MAX_HEIGHT = 234;
const VIRTUALIZE_THRESHOLD = 60;

function summarize(selected: readonly FilterValue[]): string {
  if (selected.length === 0) return 'Any value';
  if (selected.length === 1) return String(selected[0]);
  return `${selected.length} selected`;
}

/**
 * Searchable dropdown used by the filter pane. Multi-select by default;
 * single-select when the mapped workbook control cannot accept a list.
 */
export function MultiSelectDropdown({
  id,
  label,
  options,
  selected,
  selectedKeys,
  multiSelect,
  truncated,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Closing always discards the search so the next open starts fresh.
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
    if (trimmed === '') return [...options];
    return options.filter((value) =>
      String(value).toLowerCase().includes(trimmed),
    );
  }, [options, query]);

  const toggleValue = (value: FilterValue) => {
    const key = String(value);
    if (!multiSelect) {
      onChange(selectedKeys.has(key) ? [] : [value]);
      close();
      return;
    }
    if (selectedKeys.has(key)) {
      onChange(selected.filter((entry) => String(entry) !== key));
    } else {
      onChange([...selected, value]);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') close();
  };

  const renderOption = (index: number) => {
    const value = visible[index];
    const key = String(value);
    const checked = selectedKeys.has(key);
    return (
      <label className="dropdown-option" title={key}>
        <input
          type={multiSelect ? 'checkbox' : 'radio'}
          checked={checked}
          onChange={() => toggleValue(value)}
        />
        <span className="dropdown-option-label">{key}</span>
      </label>
    );
  };

  return (
    <div className="dropdown" ref={containerRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        id={id}
        className={selected.length > 0 ? 'dropdown-trigger has-selection' : 'dropdown-trigger'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} filter`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="dropdown-summary">{summarize(selected)}</span>
        <span className="dropdown-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="dropdown-panel">
          <input
            ref={searchRef}
            type="search"
            className="dropdown-search"
            placeholder="Search values"
            aria-label={`Search ${label} values`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {visible.length === 0 ? (
            <p className="dropdown-empty">
              {options.length === 0 ? 'No values in the data' : 'No matching values'}
            </p>
          ) : visible.length > VIRTUALIZE_THRESHOLD ? (
            <VirtualList
              className="dropdown-options"
              itemCount={visible.length}
              itemHeight={OPTION_HEIGHT}
              maxHeight={LIST_MAX_HEIGHT}
              renderItem={renderOption}
            />
          ) : (
            <div className="dropdown-options" style={{ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }}>
              {visible.map((_, index) => (
                <div key={String(visible[index])} style={{ height: OPTION_HEIGHT }}>
                  {renderOption(index)}
                </div>
              ))}
            </div>
          )}
          {truncated && (
            <p className="dropdown-note">List truncated — type to search</p>
          )}
          <div className="dropdown-footer">
            <span className="dropdown-count">
              {selected.length} selected
            </span>
            <button
              type="button"
              className="link-button"
              disabled={selected.length === 0}
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
