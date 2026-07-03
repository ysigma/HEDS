import { describe, expect, it } from 'vitest';
import { EDITOR_PANEL_CONFIG } from '../../config';

describe('EDITOR_PANEL_CONFIG', () => {
  it('declares only the source, output control, run action and cap — no filter fields', () => {
    expect(EDITOR_PANEL_CONFIG).toEqual([
      { name: 'source', type: 'element', label: 'Data source' },
      {
        name: 'selectedColumnsControl',
        type: 'variable',
        label: 'Output control (text)',
      },
      { name: 'runAction', type: 'action-trigger', label: 'On run' },
      {
        name: 'maxDistinctValues',
        type: 'text',
        label: 'Max distinct values per dropdown',
        defaultValue: '1000',
      },
    ]);
  });

  it('has no column/variable fields for per-filter mapping', () => {
    const filterFields = EDITOR_PANEL_CONFIG.filter((field) =>
      /^filter/.test(field.name),
    );
    expect(filterFields).toHaveLength(0);
  });
});
