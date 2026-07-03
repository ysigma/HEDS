import { describe, expect, it } from 'vitest';
import { isFilterValue, reconcileFilters } from '../filters';

const valid = new Set(['a', 'b', 'c']);

describe('reconcileFilters', () => {
  it('keeps filters whose column still exists', () => {
    const result = reconcileFilters(
      [
        { columnId: 'a', values: ['x'] },
        { columnId: 'b', values: [] },
      ],
      valid,
    );
    expect(result).toEqual([
      { columnId: 'a', values: ['x'] },
      { columnId: 'b', values: [] },
    ]);
  });

  it('drops filters whose column was removed', () => {
    const result = reconcileFilters(
      [
        { columnId: 'a', values: ['x'] },
        { columnId: 'gone', values: ['y'] },
      ],
      valid,
    );
    expect(result).toEqual([{ columnId: 'a', values: ['x'] }]);
  });

  it('de-duplicates by column, keeping the first', () => {
    const result = reconcileFilters(
      [
        { columnId: 'a', values: ['x'] },
        { columnId: 'a', values: ['y'] },
      ],
      valid,
    );
    expect(result).toEqual([{ columnId: 'a', values: ['x'] }]);
  });

  it('does not prune before columns have loaded', () => {
    const result = reconcileFilters(
      [{ columnId: 'a', values: ['x'] }],
      new Set(),
    );
    expect(result).toEqual([{ columnId: 'a', values: ['x'] }]);
  });

  it('coerces malformed entries and values', () => {
    const result = reconcileFilters(
      [
        { columnId: 'a', values: ['x', {}, null, 2, true] },
        { columnId: 42, values: [] },
        null,
        { values: ['no column'] },
      ],
      valid,
    );
    expect(result).toEqual([{ columnId: 'a', values: ['x', 2, true] }]);
  });

  it('handles non-array input', () => {
    expect(reconcileFilters(undefined, valid)).toEqual([]);
    expect(reconcileFilters('nope', valid)).toEqual([]);
  });
});

describe('isFilterValue', () => {
  it('accepts primitives and rejects everything else', () => {
    expect(isFilterValue('x')).toBe(true);
    expect(isFilterValue(1)).toBe(true);
    expect(isFilterValue(false)).toBe(true);
    expect(isFilterValue(null)).toBe(false);
    expect(isFilterValue(undefined)).toBe(false);
    expect(isFilterValue({})).toBe(false);
  });
});
