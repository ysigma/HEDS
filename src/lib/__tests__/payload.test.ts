import { describe, expect, it } from 'vitest';
import { buildTablePayload, DEFAULT_MAX_ROWS } from '../payload';

const columns = [
  { id: 'c1', name: 'Region' },
  { id: 'c2', name: 'Brand' },
  { id: 'c3', name: 'Sales' },
];

const data = {
  c1: ['East', 'West', 'North'],
  c2: ['Acme', 'Globex', 'Acme'],
  c3: [10, 20, 30],
};

describe('buildTablePayload', () => {
  it('serializes selected columns and rows as objects in column order', () => {
    const payload = buildTablePayload([columns[0], columns[2]], data, [0, 1, 2]);
    expect(JSON.parse(payload)).toEqual({
      columns: ['Region', 'Sales'],
      rows: [
        { Region: 'East', Sales: 10 },
        { Region: 'West', Sales: 20 },
        { Region: 'North', Sales: 30 },
      ],
      rowCount: 3,
      truncated: false,
    });
  });

  it('includes only the given row indexes (the filtered rows)', () => {
    const payload = buildTablePayload(columns, data, [0, 2]);
    expect(JSON.parse(payload).rows).toEqual([
      { Region: 'East', Brand: 'Acme', Sales: 10 },
      { Region: 'North', Brand: 'Acme', Sales: 30 },
    ]);
  });

  it('caps rows at maxRows and reports the full count as truncated', () => {
    const payload = buildTablePayload(columns, data, [0, 1, 2], { maxRows: 2 });
    const parsed = JSON.parse(payload);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rowCount).toBe(3);
    expect(parsed.truncated).toBe(true);
  });

  it('represents missing values as null', () => {
    const sparse = { c1: ['East'], c2: [], c3: [] };
    const payload = buildTablePayload(columns, sparse, [0]);
    expect(JSON.parse(payload).rows).toEqual([
      { Region: 'East', Brand: null, Sales: null },
    ]);
  });

  it('preserves value types (numbers, booleans, strings)', () => {
    const typed = { c1: ['East'], c3: [42] };
    const payload = buildTablePayload(
      [columns[0], columns[2]],
      typed,
      [0],
    );
    expect(JSON.parse(payload).rows[0]).toEqual({ Region: 'East', Sales: 42 });
    // number stays a number, not a string
    expect(payload).toContain('"Sales":42');
  });

  it('returns an empty table when no columns are selected', () => {
    expect(buildTablePayload([], data, [0, 1, 2])).toBe(
      '{"columns":[],"rows":[],"rowCount":0,"truncated":false}',
    );
  });

  it('handles missing data and no rows', () => {
    expect(JSON.parse(buildTablePayload(columns, undefined, []))).toEqual({
      columns: ['Region', 'Brand', 'Sales'],
      rows: [],
      rowCount: 0,
      truncated: false,
    });
  });

  it('escapes values safely and round-trips', () => {
    const payload = buildTablePayload(
      [{ id: 'c1', name: 'Note' }],
      { c1: ['say "hi"'] },
      [0],
    );
    expect(JSON.parse(payload).rows[0]).toEqual({ Note: 'say "hi"' });
  });

  it('exposes a positive default row cap', () => {
    expect(DEFAULT_MAX_ROWS).toBeGreaterThan(0);
  });
});
