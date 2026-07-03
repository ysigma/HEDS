import { describe, expect, it } from 'vitest';
import type { MetaEntry } from '../metadata';
import { autoMatchSource, type MatchableSource } from '../match';

const meta = (over: Partial<MetaEntry>): MetaEntry => ({
  elementName: 'X',
  elementType: 'TABLE',
  sheetName: null,
  cellRef: null,
  tableRef: null,
  columnsRequired: null,
  ...over,
});

const sources: MatchableSource[] = [
  {
    key: 'data1',
    columns: [
      { id: '1', name: 'FundName' },
      { id: '2', name: 'ISIN' },
      { id: '3', name: 'ReportDate' },
    ],
  },
  {
    key: 'data2',
    columns: [
      { id: '4', name: 'ISIN' },
      { id: '5', name: 'Description' },
      { id: '6', name: 'Weight' },
      { id: '7', name: 'Active_Weight' },
      { id: '8', name: 'Sector' },
    ],
  },
];

describe('autoMatchSource', () => {
  it('matches a table to the source containing its required columns', () => {
    const holdings = meta({
      elementName: 'TopHoldings',
      elementType: 'TABLE',
      columnsRequired: ['ISIN', 'Description', 'Weight', 'Active_Weight', 'Sector'],
    });
    expect(autoMatchSource(holdings, sources)).toBe('data2');
  });

  it('matches a named range to the source with the matching column', () => {
    const fundName = meta({ elementName: 'FundName', elementType: 'NAMED_RANGE' });
    expect(autoMatchSource(fundName, sources)).toBe('data1');
  });

  it('prefers the higher-overlap source when both share a column', () => {
    // Both sources have ISIN, but data2 covers more of the required set.
    const holdings = meta({
      elementName: 'TopHoldings',
      columnsRequired: ['ISIN', 'Weight', 'Sector'],
    });
    expect(autoMatchSource(holdings, sources)).toBe('data2');
  });

  it('returns null when nothing matches', () => {
    const risk = meta({
      elementName: 'RiskMetrics',
      columnsRequired: ['Metric', 'Value'],
    });
    expect(autoMatchSource(risk, sources)).toBeNull();
    expect(autoMatchSource(risk, [])).toBeNull();
  });

  it('named range with no match and no single-column source is null', () => {
    const missing = meta({ elementName: 'Nope', elementType: 'NAMED_RANGE' });
    expect(autoMatchSource(missing, sources)).toBeNull();
  });
});
