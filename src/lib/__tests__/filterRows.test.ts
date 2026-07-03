import { describe, expect, it } from 'vitest';
import { allRowIndexes, getRowCount } from '../filterRows';

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

describe('allRowIndexes', () => {
  it('enumerates every row index', () => {
    expect(allRowIndexes(data)).toEqual([0, 1, 2, 3]);
  });

  it('is empty for no data', () => {
    expect(allRowIndexes(undefined)).toEqual([]);
    expect(allRowIndexes({})).toEqual([]);
  });
});
