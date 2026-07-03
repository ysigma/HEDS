import type { FilterManager } from '../hooks/useFilters';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { AddFilterMenu } from './AddFilterMenu';

interface FilterPaneProps {
  filters: FilterManager;
}

/** Left pane: in-plugin filters the builder adds on any element column. */
export function FilterPane({ filters }: FilterPaneProps) {
  return (
    <section className="pane filter-pane" aria-label="Set parameters">
      <h2 className="pane-title">Set parameters</h2>
      {filters.filters.length === 0 ? (
        <p className="pane-hint">
          Add a filter to narrow the rows. Filtering happens in the plugin and
          feeds the output — it doesn't change the underlying element.
        </p>
      ) : (
        filters.filters.map((filter) => (
          <div className="filter-field" key={filter.columnId}>
            <div className="filter-label-row">
              <label
                className="filter-label"
                htmlFor={`filter-${filter.columnId}`}
              >
                {filter.column.name}
              </label>
              <button
                type="button"
                className="filter-remove"
                aria-label={`Remove ${filter.column.name} filter`}
                onClick={() => filters.removeFilter(filter.columnId)}
              >
                ×
              </button>
            </div>
            <MultiSelectDropdown
              id={`filter-${filter.columnId}`}
              label={filter.column.name}
              options={filter.options}
              selected={filter.selected}
              selectedKeys={filter.selectedKeys}
              multiSelect
              truncated={filter.truncated}
              onChange={(next) => filters.setValues(filter.columnId, next)}
            />
            {filter.selected.length > 0 && (
              <p className="filter-microcopy">
                Filtering by {filter.column.name} ({filter.selected.length}{' '}
                {filter.selected.length === 1 ? 'value' : 'values'})
              </p>
            )}
          </div>
        ))
      )}
      <AddFilterMenu
        columns={filters.availableColumns}
        onAdd={filters.addFilter}
      />
    </section>
  );
}
