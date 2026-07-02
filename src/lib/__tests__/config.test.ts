import { describe, expect, it } from 'vitest';
import { EDITOR_PANEL_CONFIG, FILTER_SLOT_COUNT } from '../../config';

describe('EDITOR_PANEL_CONFIG', () => {
  it('declares the fields in the order the spec requires', () => {
    const names = EDITOR_PANEL_CONFIG.map((field) => field.name);
    expect(names).toEqual([
      'source',
      'filters',
      'filter1Column',
      'filter1Control',
      'filter2Column',
      'filter2Control',
      'filter3Column',
      'filter3Control',
      'filter4Column',
      'filter4Control',
      'filter5Column',
      'filter5Control',
      'filter6Column',
      'filter6Control',
      'selectedColumnsControl',
      'runAction',
      'inPluginFiltering',
      'maxDistinctValues',
    ]);
  });

  it('declares six paired filter slots', () => {
    expect(FILTER_SLOT_COUNT).toBe(6);
    for (let slot = 1; slot <= FILTER_SLOT_COUNT; slot += 1) {
      const column = EDITOR_PANEL_CONFIG.find(
        (field) => field.name === `filter${slot}Column`,
      );
      const control = EDITOR_PANEL_CONFIG.find(
        (field) => field.name === `filter${slot}Control`,
      );
      expect(column).toMatchObject({
        type: 'column',
        source: 'source',
        allowMultiple: false,
        allowedTypes: ['text', 'number', 'integer', 'boolean'],
      });
      expect(control).toMatchObject({ type: 'variable' });
    }
  });

  it('keeps the source element and run action wired to stable names', () => {
    expect(EDITOR_PANEL_CONFIG[0]).toEqual({
      name: 'source',
      type: 'element',
      label: 'Data source',
    });
    expect(
      EDITOR_PANEL_CONFIG.find((field) => field.name === 'runAction'),
    ).toEqual({ name: 'runAction', type: 'action-trigger', label: 'On run' });
    expect(
      EDITOR_PANEL_CONFIG.find((field) => field.name === 'maxDistinctValues'),
    ).toMatchObject({ type: 'text', defaultValue: '1000' });
    expect(
      EDITOR_PANEL_CONFIG.find((field) => field.name === 'inPluginFiltering'),
    ).toMatchObject({ type: 'toggle', defaultValue: false });
  });
});
