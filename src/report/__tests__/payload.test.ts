import { describe, expect, it } from 'vitest';
import type { MetaEntry } from '../metadata';
import {
  buildReportPayload,
  isTableSection,
  resolveSection,
} from '../payload';

const namedRange: MetaEntry = {
  elementName: 'FundName',
  elementType: 'NAMED_RANGE',
  sheetName: 'Quarterly Report',
  cellRef: '$B$4',
  tableRef: null,
  columnsRequired: null,
};

const table: MetaEntry = {
  elementName: 'TopHoldings',
  elementType: 'TABLE',
  sheetName: 'Quarterly Report',
  cellRef: null,
  tableRef: 'A11:E12',
  columnsRequired: ['ISIN', 'Weight', 'Active_Weight'],
};

describe('isTableSection', () => {
  it('reads the metadata type', () => {
    expect(isTableSection(table)).toBe(true);
    expect(isTableSection(namedRange)).toBe(false);
  });
  it('treats unknown-type-with-required-columns as a table', () => {
    expect(isTableSection({ ...namedRange, elementType: '' })).toBe(false);
    expect(
      isTableSection({ ...namedRange, elementType: '', columnsRequired: ['x'] }),
    ).toBe(true);
  });
});

describe('resolveSection', () => {
  const holdingsCols = [
    { id: 'a', name: 'ISIN' },
    { id: 'b', name: 'Active Weight' }, // source uses a space...
    { id: 'c', name: 'Weight' },
  ];
  const holdingsData = { a: ['US1', 'US2'], b: [0.8, 0.4], c: [4.1, 3.8] };

  it('keys rows by the required names exactly, matching the source loosely', () => {
    const section = resolveSection(table, holdingsCols, holdingsData, [0, 1]);
    expect(section.isTable).toBe(true);
    // "Active_Weight" required, source column "Active Weight" — key is the
    // required spelling, value pulled from the loosely-matched source column.
    expect(section.rows).toEqual([
      { ISIN: 'US1', Weight: 4.1, Active_Weight: 0.8 },
      { ISIN: 'US2', Weight: 3.8, Active_Weight: 0.4 },
    ]);
  });

  it('writes null for a required column the source lacks (never omits the key)', () => {
    const meta = { ...table, columnsRequired: ['ISIN', 'Description'] };
    const section = resolveSection(meta, holdingsCols, holdingsData, [0]);
    expect(section.rows[0]).toEqual({ ISIN: 'US1', Description: null });
  });

  it('resolves a named range to the column matching the element name', () => {
    const section = resolveSection(
      namedRange,
      [
        { id: 'x', name: 'Something' },
        { id: 'y', name: 'FundName' },
      ],
      { x: ['nope'], y: ['Janus'] },
      [0],
    );
    expect(section.value).toBe('Janus');
    expect(section.isTable).toBe(false);
  });

  it('named range is null when no column matches', () => {
    const section = resolveSection(
      namedRange,
      [
        { id: 'x', name: 'A' },
        { id: 'z', name: 'B' },
      ],
      { x: ['1'], z: ['2'] },
      [0],
    );
    expect(section.value).toBeNull();
  });

  it('caps table rows', () => {
    const section = resolveSection(table, holdingsCols, holdingsData, [0, 1], 1);
    expect(section.rows).toHaveLength(1);
  });
});

describe('buildReportPayload', () => {
  it('produces flat JSON: named ranges as scalars, tables as row arrays', () => {
    const sections = [
      resolveSection(namedRange, [{ id: 'y', name: 'FundName' }], { y: ['Janus'] }, [0]),
      resolveSection(
        { ...table, columnsRequired: ['ISIN', 'Weight'] },
        [
          { id: 'a', name: 'ISIN' },
          { id: 'c', name: 'Weight' },
        ],
        { a: ['US1'], c: [4.1] },
        [0],
      ),
    ];
    expect(JSON.parse(buildReportPayload(sections))).toEqual({
      FundName: 'Janus',
      TopHoldings: [{ ISIN: 'US1', Weight: 4.1 }],
    });
  });

  it('serializes an empty table as an empty array', () => {
    const section = resolveSection(table, [], undefined, []);
    expect(JSON.parse(buildReportPayload([section]))).toEqual({
      TopHoldings: [],
    });
  });
});
