import { describe, expect, it } from 'vitest';
import type { WorkbookVariable } from '@sigmacomputing/plugin';
import { isListControlType, readVariableSelection } from '../controls';

const variable = (type: string, value: unknown): WorkbookVariable => ({
  name: 'control',
  defaultValue: { type, value },
});

describe('isListControlType', () => {
  it('accepts list control types', () => {
    expect(isListControlType('text-list')).toBe(true);
    expect(isListControlType('number-list')).toBe(true);
    expect(isListControlType('date-list')).toBe(true);
  });

  it('rejects scalar control types and unknowns', () => {
    expect(isListControlType('text')).toBe(false);
    expect(isListControlType('number')).toBe(false);
    expect(isListControlType('boolean')).toBe(false);
    expect(isListControlType('date-range')).toBe(false);
    expect(isListControlType(undefined)).toBe(false);
  });
});

describe('readVariableSelection', () => {
  it('returns an empty selection for unmapped controls', () => {
    expect(readVariableSelection(undefined)).toEqual([]);
  });

  it('returns an empty selection for cleared controls', () => {
    expect(readVariableSelection(variable('text-list', null))).toEqual([]);
  });

  it('wraps scalar values', () => {
    expect(readVariableSelection(variable('text', 'east'))).toEqual(['east']);
    expect(readVariableSelection(variable('number', 4))).toEqual([4]);
    expect(readVariableSelection(variable('boolean', false))).toEqual([false]);
  });

  it('passes list values through, dropping non-primitives', () => {
    expect(
      readVariableSelection(variable('text-list', ['a', 'b', null, {}])),
    ).toEqual(['a', 'b']);
  });

  it('ignores object-shaped values such as ranges', () => {
    expect(
      readVariableSelection(variable('number-range', { min: 1, max: 2 })),
    ).toEqual([]);
  });
});
