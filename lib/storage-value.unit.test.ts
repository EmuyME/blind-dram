import { describe, expect, it } from 'vitest';
import { normalizeAgeAbvStorage } from './storage-value';

describe('normalizeAgeAbvStorage', () => {
  it('範囲ラベルをそのまま保持する', () => {
    expect(normalizeAgeAbvStorage('50.0-54.9')).toBe('50.0-54.9');
    expect(normalizeAgeAbvStorage('65.0-')).toBe('65.0-');
  });

  it('自由入力の数値を正規化する', () => {
    expect(normalizeAgeAbvStorage('50.5')).toBe('50.5');
    expect(normalizeAgeAbvStorage(12)).toBe('12');
  });

  it('空は null', () => {
    expect(normalizeAgeAbvStorage('')).toBeNull();
    expect(normalizeAgeAbvStorage(null)).toBeNull();
  });
});
