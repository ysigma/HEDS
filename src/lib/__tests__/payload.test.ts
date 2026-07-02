import { describe, expect, it } from 'vitest';
import { buildSelectedColumnsPayload } from '../payload';

const columns = [
  { id: 'c1', name: 'Region' },
  { id: 'c2', name: 'Fund' },
  { id: 'c3', name: 'Sales' },
];

describe('buildSelectedColumnsPayload', () => {
  it('matches the documented shape byte for byte', () => {
    const payload = buildSelectedColumnsPayload(columns, new Set(['c1', 'c3']));
    expect(payload).toBe('{"columns":["Region","Sales"]}');
  });

  it('orders names by element column order, not selection order', () => {
    const payload = buildSelectedColumnsPayload(columns, new Set(['c3', 'c1']));
    expect(payload).toBe('{"columns":["Region","Sales"]}');
  });

  it('ignores selected ids that no longer exist on the element', () => {
    const payload = buildSelectedColumnsPayload(
      columns,
      new Set(['c2', 'ghost']),
    );
    expect(payload).toBe('{"columns":["Fund"]}');
  });

  it('produces an empty list when nothing is selected', () => {
    expect(buildSelectedColumnsPayload(columns, new Set())).toBe(
      '{"columns":[]}',
    );
  });

  it('escapes column names safely', () => {
    const payload = buildSelectedColumnsPayload(
      [{ id: 'q', name: 'Say "hi"' }],
      new Set(['q']),
    );
    expect(payload).toBe('{"columns":["Say \\"hi\\""]}');
    expect(JSON.parse(payload)).toEqual({ columns: ['Say "hi"'] });
  });
});
