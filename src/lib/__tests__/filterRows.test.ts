import { describe, expect, it } from 'vitest';
import { filterRowIndexes, getRowCount } from '../filterRows';

const data = {
  region: ['east', 'west', 'east', 'north'],
  size: [1, 2, 3, 4],
};

describe('getRowCount', () => {
  it('returns the longest column length', () => {
    expect(getRowCount(data)).toBe(4);
    expect(getRowCount({ a: [], b: [1, 2] })).toBe(2);
  });

  it('handles missing data', () => {
    expect(getRowCount(undefined)).toBe(0);
    expect(getRowCount({})).toBe(0);
  });
});

describe('filterRowIndexes', () => {
  it('returns every row when no filter is active', () => {
    expect(filterRowIndexes(data, [])).toEqual([0, 1, 2, 3]);
    expect(
      filterRowIndexes(data, [{ columnId: 'region', selectedKeys: new Set() }]),
    ).toEqual([0, 1, 2, 3]);
  });

  it('filters rows by a single column', () => {
    expect(
      filterRowIndexes(data, [
        { columnId: 'region', selectedKeys: new Set(['east']) },
      ]),
    ).toEqual([0, 2]);
  });

  it('combines multiple filters with AND', () => {
    expect(
      filterRowIndexes(data, [
        { columnId: 'region', selectedKeys: new Set(['east']) },
        { columnId: 'size', selectedKeys: new Set(['3']) },
      ]),
    ).toEqual([2]);
  });

  it('matches numeric values through their string keys', () => {
    expect(
      filterRowIndexes(data, [
        { columnId: 'size', selectedKeys: new Set(['2', '4']) },
      ]),
    ).toEqual([1, 3]);
  });

  it('ignores filters whose column is missing from the data', () => {
    expect(
      filterRowIndexes(data, [
        { columnId: 'ghost', selectedKeys: new Set(['x']) },
      ]),
    ).toEqual([0, 1, 2, 3]);
  });

  it('never matches null cells', () => {
    const withNulls = { region: ['east', null, 'east'] };
    expect(
      filterRowIndexes(withNulls, [
        { columnId: 'region', selectedKeys: new Set(['east']) },
      ]),
    ).toEqual([0, 2]);
  });

  it('handles empty data', () => {
    expect(filterRowIndexes(undefined, [])).toEqual([]);
    expect(filterRowIndexes({}, [])).toEqual([]);
  });
});
