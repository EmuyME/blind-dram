import { describe, expect, it } from 'vitest';
import { buildPosterPagePlan, chunkArray } from '@/lib/results-poster-layout';

describe('chunkArray', () => {
  it('splits items into fixed-size groups', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('buildPosterPagePlan', () => {
  it('plans ranking + sample pages + participants', () => {
    expect(buildPosterPagePlan(10)).toEqual({
      rankingPage: 1,
      samplePageCount: 3,
      participantsPage: 5,
      totalPages: 5,
    });
  });

  it('handles zero samples', () => {
    expect(buildPosterPagePlan(0).totalPages).toBe(3);
  });
});
