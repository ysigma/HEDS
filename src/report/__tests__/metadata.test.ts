import { describe, expect, it } from 'vitest';
import { parseColumnsRequired, parseMetadata } from '../metadata';

const columns = {
  t: { id: 't', name: 'Element Type', columnType: 'text' as const },
  n: { id: 'n', name: 'Element Name', columnType: 'text' as const },
  s: { id: 's', name: 'Sheet Name', columnType: 'text' as const },
  c: { id: 'c', name: 'Cell Ref', columnType: 'text' as const },
  tr: { id: 'tr', name: 'Table Ref', columnType: 'text' as const },
  cr: {
    id: 'cr',
    name: 'Columns Required (Tables only)',
    columnType: 'text' as const,
  },
};

const data = {
  t: ['NAMED_RANGE', 'TABLE'],
  n: ['FundName', 'TopHoldings'],
  s: ['Quarterly Report', 'Quarterly Report'],
  c: ['$B$4', null],
  tr: [null, 'A11:E12'],
  cr: [null, '["ISIN", "Description", "Weight"]'],
};

describe('parseMetadata', () => {
  it('parses rows into entries, matching columns by name in any order', () => {
    expect(parseMetadata(columns, data)).toEqual([
      {
        elementName: 'FundName',
        elementType: 'NAMED_RANGE',
        sheetName: 'Quarterly Report',
        cellRef: '$B$4',
        tableRef: null,
        columnsRequired: null,
      },
      {
        elementName: 'TopHoldings',
        elementType: 'TABLE',
        sheetName: 'Quarterly Report',
        cellRef: null,
        tableRef: 'A11:E12',
        columnsRequired: ['ISIN', 'Description', 'Weight'],
      },
    ]);
  });

  it('skips rows without an element name', () => {
    const withBlank = { ...data, n: ['FundName', ''] };
    expect(parseMetadata(columns, withBlank)).toHaveLength(1);
  });

  it('returns [] without a recognizable element-name column or data', () => {
    expect(parseMetadata(undefined, data)).toEqual([]);
    expect(
      parseMetadata({ x: { id: 'x', name: 'Other', columnType: 'text' } }, {
        x: ['a'],
      }),
    ).toEqual([]);
  });
});

describe('parseColumnsRequired', () => {
  it('parses JSON arrays', () => {
    expect(parseColumnsRequired('["A","B"]')).toEqual(['A', 'B']);
  });
  it('accepts real arrays', () => {
    expect(parseColumnsRequired(['A', ' B '])).toEqual(['A', 'B']);
  });
  it('falls back to a loose comma list', () => {
    expect(parseColumnsRequired('A, B, C')).toEqual(['A', 'B', 'C']);
    expect(parseColumnsRequired('[A, B]')).toEqual(['A', 'B']);
  });
  it('treats blank/null as null', () => {
    expect(parseColumnsRequired(null)).toBeNull();
    expect(parseColumnsRequired('')).toBeNull();
    expect(parseColumnsRequired('null')).toBeNull();
  });
});
