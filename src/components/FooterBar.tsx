interface FooterBarProps {
  selectedCount: number;
  totalColumns: number;
  rowCount: number;
  canClear: boolean;
  runDisabledReason: string | null;
  onClearAll(): void;
  onRun(): void;
}

/** Footer: selection + row summary, clear all, and the primary Run button. */
export function FooterBar({
  selectedCount,
  totalColumns,
  rowCount,
  canClear,
  runDisabledReason,
  onClearAll,
  onRun,
}: FooterBarProps) {
  return (
    <footer className="footer-bar">
      <div className="footer-status">
        <span className="footer-count">
          {selectedCount} of {totalColumns} columns selected ·{' '}
          {rowCount.toLocaleString()} {rowCount === 1 ? 'row' : 'rows'}
        </span>
      </div>
      <div className="footer-actions">
        <button
          type="button"
          className="link-button"
          onClick={onClearAll}
          disabled={!canClear}
          title="Clear the column selection"
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
