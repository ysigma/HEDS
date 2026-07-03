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
  columnsRequired: ['ISIN', 'Weight'],
};

describe('isTableSection', () => {
  it('uses the metadata type when explicit', () => {
    expect(isTableSection(table, 5, 2)).toBe(true);
    expect(isTableSection(namedRange, 1, 1)).toBe(false);
  });
  it('infers from shape when the type is unknown', () => {
    const unknown = { ...namedRange, elementType: '', columnsRequired: null };
    expect(isTableSection(unknown, 1, 1)).toBe(false);
    expect(isTableSection(unknown, 3, 1)).toBe(true);
    expect(isTableSection(unknown, 1, 2)).toBe(true);
  });
});

describe('resolveSection', () => {
  const holdingsCols = [
    { id: 'a', name: 'ISIN' },
    { id: 'b', name: 'Description' },
    { id: 'c', name: 'Weight' },
  ];
  const holdingsData = {
    a: ['US1', 'US2'],
    b: ['Apple', 'Microsoft'],
    c: [4.1, 3.8],
  };

  it('resolves a table to the required columns as row objects', () => {
    const section = resolveSection(table, holdingsCols, holdingsData, [0, 1]);
    expect(section.isTable).toBe(true);
    expect(section.columns).toEqual(['ISIN', 'Weight']);
    expect(section.rows).toEqual([
      { ISIN: 'US1', Weight: 4.1 },
      { ISIN: 'US2', Weight: 3.8 },
    ]);
  });

  it('resolves a named range to the first value', () => {
    const section = resolveSection(
      namedRange,
      [{ id: 'v', name: 'FundName' }],
      { v: ['Janus Henderson Index'] },
      [0],
    );
    expect(section.isTable).toBe(false);
    expect(section.value).toBe('Janus Henderson Index');
  });

  it('matches required columns to the source by name, case/space-insensitively', () => {
    const meta = { ...table, columnsRequired: ['isin', 'WEIGHT'] };
    const section = resolveSection(meta, holdingsCols, holdingsData, [0]);
    expect(section.columns).toEqual(['isin', 'WEIGHT']);
    expect(section.rows[0]).toEqual({ isin: 'US1', WEIGHT: 4.1 });
  });

  it('falls back to all source columns when none are required', () => {
    const meta = { ...table, columnsRequired: null };
    const section = resolveSection(meta, holdingsCols, holdingsData, [0]);
    expect(section.columns).toEqual(['ISIN', 'Description', 'Weight']);
  });

  it('caps table rows at maxRows', () => {
    const section = resolveSection(table, holdingsCols, holdingsData, [0, 1], 1);
    expect(section.rows).toHaveLength(1);
  });
});

describe('buildReportPayload', () => {
  it('produces flat JSON keyed by element name with placement metadata', () => {
    const sections = [
      resolveSection(
        namedRange,
        [{ id: 'v', name: 'FundName' }],
        { v: ['Janus'] },
        [0],
      ),
      resolveSection(
        table,
        [
          { id: 'a', name: 'ISIN' },
          { id: 'c', name: 'Weight' },
        ],
        { a: ['US1'], c: [4.1] },
        [0],
      ),
    ];
    expect(JSON.parse(buildReportPayload(sections))).toEqual({
      FundName: {
        elementType: 'NAMED_RANGE',
        sheetName: 'Quarterly Report',
        cellRef: '$B$4',
        tableRef: null,
        value: 'Janus',
      },
      TopHoldings: {
        elementType: 'TABLE',
        sheetName: 'Quarterly Report',
        cellRef: null,
        tableRef: 'A11:E12',
        columns: ['ISIN', 'Weight'],
        rows: [{ ISIN: 'US1', Weight: 4.1 }],
      },
    });
  });
});
