import { describe, expect, it } from 'vitest';
import { formatGuessSummary, truncateText } from '@/lib/results-export-design';

describe('truncateText', () => {
  it('truncates long strings', () => {
    expect(truncateText('abcdefghij', 6)).toBe('abcde…');
  });
});

describe('formatGuessSummary', () => {
  it('joins enabled guess fields', () => {
    const snap = {
      version: 1,
      items: {
        cask: { enabled: true, label: 'カスク', maxPoints: 4, inputType: 'choice' },
        region: { enabled: true, label: '地域', maxPoints: 4, inputType: 'choice' },
        age: { enabled: false, label: '年数', maxPoints: 0, inputType: 'free' },
        abv: { enabled: false, label: '度数', maxPoints: 0, inputType: 'free' },
        distillery: { enabled: false, label: '蒸留所', maxPoints: 0, inputType: 'free' },
        other1: { enabled: false, label: 'O1', maxPoints: 0, inputType: 'free' },
        other2: { enabled: false, label: 'O2', maxPoints: 0, inputType: 'free' },
      },
    };
    const summary = formatGuessSummary(snap, {
      participant_id: 'p1',
      display_name: 'A',
      guessed_cask: 'バーボン樽',
      guessed_region: 'スペイサイド',
      guessed_age: null,
      guessed_abv: null,
      guessed_distillery: '',
      score: 8,
      is_correct_distillery: false,
    });
    expect(summary).toContain('バーボン樽');
    expect(summary).toContain('スペイサイド');
  });
});
