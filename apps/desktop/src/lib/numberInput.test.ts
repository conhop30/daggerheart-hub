import { describe, expect, it } from 'vitest';
import { isValidNumberInput } from './numberInput';

describe('isValidNumberInput', () => {
  it('allows an empty string, so a field can be cleared', () => {
    expect(isValidNumberInput('')).toBe(true);
  });

  it('allows plain digits', () => {
    expect(isValidNumberInput('42')).toBe(true);
  });

  it('rejects non-digit characters', () => {
    expect(isValidNumberInput('4.2')).toBe(false);
    expect(isValidNumberInput('4a')).toBe(false);
    expect(isValidNumberInput(' ')).toBe(false);
  });

  it('allows a leading minus when there is no min', () => {
    expect(isValidNumberInput('-3')).toBe(true);
    expect(isValidNumberInput('-')).toBe(true);
  });

  it('allows a leading minus when min is negative', () => {
    expect(isValidNumberInput('-3', -5)).toBe(true);
  });

  it('rejects a leading minus when min is 0 or more', () => {
    expect(isValidNumberInput('-3', 0)).toBe(false);
    expect(isValidNumberInput('-3', 1)).toBe(false);
  });

  it('treats a string min the same as a number min', () => {
    expect(isValidNumberInput('-3', '0')).toBe(false);
    expect(isValidNumberInput('-3', '-5')).toBe(true);
  });
});
