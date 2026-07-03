export interface FilterChip {
  id: string;
  label: string;
  count: number;
  onClear(): void;
}

interface FooterBarProps {
  chips: FilterChip[];
  selectedCount: number;
  totalColumns: number;
  canClear: boolean;
  runDisabledReason: string | null;
  onClearAll(): void;
  onRun(): void;
}

/** Footer: applied-filter chips, selection count, clear all, and Run. */
export function FooterBar({
  chips,
  selectedCount,
  totalColumns,
  canClear,
  runDisabledReason,
  onClearAll,
  onRun,
}: FooterBarProps) {
  return (
    <footer className="footer-bar">
      <div className="footer-status">
        {chips.map((chip) => (
          <span className="chip" key={chip.id}>
            {chip.label} ({chip.count})
            <button
              type="button"
              className="chip-clear"
              aria-label={`Clear ${chip.label} filter`}
              onClick={chip.onClear}
            >
              ×
            </button>
          </span>
        ))}
        <span className="footer-count">
          {selectedCount} of {totalColumns} columns selected
        </span>
      </div>
      <div className="footer-actions">
        <button
          type="button"
          className="link-button"
          onClick={onClearAll}
          disabled={!canClear}
          title="Clear all filters and column selections"
        >
          Clear all
        </button>
        <span
          className="run-wrap"
          title={runDisabledReason ?? 'Trigger the attached action sequence'}
        >
          <button
            type="button"
            className="run-button"
            disabled={runDisabledReason !== null}
            onClick={onRun}
          >
            Run
          </button>
        </span>
      </div>
    </footer>
  );
}
