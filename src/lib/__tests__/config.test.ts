import { describe, expect, it } from 'vitest';
import { EDITOR_PANEL_CONFIG } from '../../config';

describe('EDITOR_PANEL_CONFIG', () => {
  it('declares the source, exposed columns, output control and run action', () => {
    expect(EDITOR_PANEL_CONFIG).toEqual([
      { name: 'source', type: 'element', label: 'Data source' },
      {
        name: 'columns',
        type: 'column',
        source: 'source',
        allowMultiple: true,
        label: 'Columns',
      },
      {
        name: 'selectedColumnsControl',
        type: 'variable',
        label: 'Output control (text)',
      },
      { name: 'runAction', type: 'action-trigger', label: 'On run' },
    ]);
  });

  it('declares no per-filter fields (filtering is left to the workbook)', () => {
    const filterFields = EDITOR_PANEL_CONFIG.filter((field) =>
      /^filter/.test(field.name),
    );
    expect(filterFields).toHaveLength(0);
  });
});
