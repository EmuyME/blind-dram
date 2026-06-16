import { describe, expect, it } from 'vitest';
import {
  activeScoringItemKeys,
  chartLabelStep,
  participantNameMaxLen,
  personalRoundColWidths,
  tableFontSize,
} from '@/lib/report-export/layout-scale';
import { createDefaultScoringItems } from '@/lib/scoring-schema';

describe('layout-scale', () => {
  it('scales font down for many columns and rows', () => {
    expect(tableFontSize(6, 5)).toBeGreaterThan(tableFontSize(24, 30));
    expect(tableFontSize(24, 30)).toBeGreaterThanOrEqual(11);
  });

  it('shortens participant names when count is high', () => {
    expect(participantNameMaxLen(20)).toBeLessThan(participantNameMaxLen(4));
  });

  it('thins chart x labels for many rounds', () => {
    expect(chartLabelStep(24)).toBeGreaterThan(1);
    expect(chartLabelStep(8)).toBe(1);
  });

  it('allocates personal round columns to 100%', () => {
    const widths = personalRoundColWidths(5);
    const sum = widths.reduce((a, w) => a + parseFloat(w), 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('detects active scoring items from snapshot', () => {
    const items = createDefaultScoringItems();
    items.other1.enabled = true;
    items.other1.maxPoints = 2;
    const keys = activeScoringItemKeys({ version: 1, items });
    expect(keys).toContain('other1');
    expect(keys).not.toContain('other2');
  });
});
