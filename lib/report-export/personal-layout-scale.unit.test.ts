import { describe, expect, it } from 'vitest';
import {
  personalAnalysisAreaHeight,
  personalCategoryChartLayout,
  personalRoundTableColWidths,
  personalTableLayout,
} from '@/lib/report-export/personal-layout-scale';

describe('personal-layout-scale', () => {
  it('analysis area grows with more categories', () => {
    expect(personalAnalysisAreaHeight(5)).toBeLessThan(personalAnalysisAreaHeight(7));
    expect(personalAnalysisAreaHeight(12)).toBeLessThanOrEqual(560);
  });

  it('bar height shrinks when categories increase', () => {
    const few = personalCategoryChartLayout(4);
    const many = personalCategoryChartLayout(8);
    expect(many.barH).toBeLessThanOrEqual(few.barH);
    expect(many.labelFont).toBeLessThanOrEqual(few.labelFont);
  });

  it('table row height and fonts shrink with more rounds/columns', () => {
    const small = personalTableLayout(4, 5);
    const large = personalTableLayout(14, 7);
    expect(large.rowH).toBeLessThanOrEqual(small.rowH);
    expect(large.answerFs).toBeLessThanOrEqual(small.answerFs);
  });

  it('colgroup widths sum to 100%', () => {
    for (const n of [3, 5, 7]) {
      const widths = personalRoundTableColWidths(n);
      const sum = widths.reduce((s, w) => s + parseFloat(w), 0);
      expect(sum).toBeCloseTo(100, 0);
      expect(widths).toHaveLength(3 + n + 1);
    }
  });
});
