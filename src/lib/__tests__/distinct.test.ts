import { describe, expect, it } from 'vitest';
import {
  MAX_DISTINCT_CEILING,
  MAX_DISTINCT_FALLBACK,
  deriveDistinctValues,
  mergeSelectedIntoValues,
  parseMaxDistinctValues,
} from '../distinct';

describe('deriveDistinctValues', () => {
  it('dedupes and sorts numbers ascending', () => {
    const result = deriveDistinctValues([3, 1, 2, 3, 1, 10], 100);
    expect(result.values).toEqual([1, 2, 3, 10]);
    expect(result.totalDistinct).toBe(4);
    expect(result.truncated).toBe(false);
  });

  it('sorts strings with numeric collation, case-insensitively', () => {
    const result = deriveDistinctValues(
      ['Item 10', 'item 2', 'apple', 'Banana'],
      100,
    );
    expect(result.values).toEqual(['apple', 'Banana', 'item 2', 'Item 10']);
  });

  it('orders booleans false before true', () => {
    const result = deriveDistinctValues([true, false, true], 100);
    expect(result.values).toEqual([false, true]);
  });

  it('orders mixed types as numbers, booleans, strings', () => {
    const result = deriveDistinctValues(['b', true, 2, 'a', 1, false], 100);
    expect(result.values).toEqual([1, 2, false, true, 'a', 'b']);
  });

  it('skips null, undefined and NaN', () => {
    const result = deriveDistinctValues([null, undefined, NaN, 'x', null], 100);
    expect(result.values).toEqual(['x']);
    expect(result.totalDistinct).toBe(1);
  });

  it('caps the list and flags truncation', () => {
    const result = deriveDistinctValues([5, 4, 3, 2, 1], 3);
    expect(result.values).toEqual([1, 2, 3]);
    expect(result.totalDistinct).toBe(5);
    expect(result.truncated).toBe(true);
  });

  it('handles empty and undefined input', () => {
    expect(deriveDistinctValues([], 10)).toEqual({
      values: [],
      totalDistinct: 0,
      truncated: false,
    });
    expect(deriveDistinctValues(undefined, 10)).toEqual({
      values: [],
      totalDistinct: 0,
      truncated: false,
    });
  });

  it('stringifies non-primitive values instead of dropping them', () => {
    const result = deriveDistinctValues([{ toString: () => 'obj' }], 10);
    expect(result.values).toEqual(['obj']);
  });
});

describe('mergeSelectedIntoValues', () => {
  it('returns the value list untouched when nothing is selected', () => {
    expect(mergeSelectedIntoValues(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('keeps selected values visible when the data no longer contains them', () => {
    expect(mergeSelectedIntoValues(['a', 'c'], ['b'])).toEqual(['a', 'b', 'c']);
  });

  it('does not duplicate values already present', () => {
    expect(mergeSelectedIntoValues(['a', 'b'], ['b'])).toEqual(['a', 'b']);
  });
});

describe('parseMaxDistinctValues', () => {
  it('parses plain integers', () => {
    expect(parseMaxDistinctValues('250')).toBe(250);
    expect(parseMaxDistinctValues(' 42 ')).toBe(42);
  });

  it('falls back on blank or invalid input', () => {
    expect(parseMaxDistinctValues(undefined)).toBe(MAX_DISTINCT_FALLBACK);
    expect(parseMaxDistinctValues('')).toBe(MAX_DISTINCT_FALLBACK);
    expect(parseMaxDistinctValues('abc')).toBe(MAX_DISTINCT_FALLBACK);
    expect(parseMaxDistinctValues('0')).toBe(MAX_DISTINCT_FALLBACK);
    expect(parseMaxDistinctValues('-5')).toBe(MAX_DISTINCT_FALLBACK);
  });

  it('clamps to the SDK data window ceiling', () => {
    expect(parseMaxDistinctValues('999999')).toBe(MAX_DISTINCT_CEILING);
  });
});
