import type { FilterSlot } from '../hooks/useFilterSlots';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface FilterPaneProps {
  slots: FilterSlot[];
  inPluginFiltering: boolean;
}

/** Left pane: one searchable dropdown per active filter slot. */
export function FilterPane({ slots, inPluginFiltering }: FilterPaneProps) {
  return (
    <section className="pane filter-pane" aria-label="Set parameters">
      <h2 className="pane-title">Set parameters</h2>
      {slots.length === 0 ? (
        <p className="pane-hint">
          {inPluginFiltering
            ? 'Map a filter column in the editor panel to add a dropdown here.'
            : 'Map a filter column and its control in the editor panel to add a dropdown here.'}
        </p>
      ) : (
        slots.map((slot) => (
          <div className="filter-field" key={slot.slot}>
            <label
              className="filter-label"
              htmlFor={`filter-slot-${slot.slot}`}
            >
              {slot.column.name}
            </label>
            <MultiSelectDropdown
              id={`filter-slot-${slot.slot}`}
              label={slot.column.name}
              options={slot.values}
              selected={slot.selected}
              selectedKeys={slot.selectedKeys}
              multiSelect={slot.multiSelect}
              truncated={slot.truncated}
              onChange={slot.setSelected}
            />
            {slot.selected.length > 0 && (
              <p className="filter-microcopy">
                Filtering by {slot.column.name} ({slot.selected.length}{' '}
                {slot.selected.length === 1 ? 'value' : 'values'})
              </p>
            )}
          </div>
        ))
      )}
      {inPluginFiltering && (
        <p className="pane-footnote">
          Filters apply inside the plugin only — the underlying element is not
          filtered.
        </p>
      )}
    </section>
  );
}
