import { describe, expect, it } from 'vitest';
import {
  flavorCommentRowHasContent,
  flavorSectionHasContent,
  resultsHaveAnyFlavorComments,
  sessionModeLabel,
  type ResultsPosterData,
} from '@/lib/results-poster';

describe('flavorSectionHasContent', () => {
  it('returns false for empty section', () => {
    expect(flavorSectionHasContent({})).toBe(false);
    expect(flavorSectionHasContent(null)).toBe(false);
  });

  it('returns true when tier1, tier2, or text exists', () => {
    expect(flavorSectionHasContent({ tier1_tags: ['フルーティ'] })).toBe(true);
    expect(flavorSectionHasContent({ tier2_terms: ['レモン'] })).toBe(true);
    expect(flavorSectionHasContent({ text: '  香りが良い  ' })).toBe(true);
  });
});

describe('flavorCommentRowHasContent', () => {
  it('detects any section with content', () => {
    expect(
      flavorCommentRowHasContent({
        nose: { tier1_tags: ['スモーキー'] },
        palate: {},
        finish: {},
      }),
    ).toBe(true);
    expect(flavorCommentRowHasContent({ nose: {}, palate: {}, finish: {} })).toBe(false);
  });
});

describe('resultsHaveAnyFlavorComments', () => {
  const base: ResultsPosterData = {
    session: { title: 'test', mode: 'sequential' },
    rankings: [],
    sample_details: [
      {
        sample_id: 's1',
        sample_label: 'A',
        truth: {
          true_cask: '',
          true_region: '',
          true_age: null,
          true_abv: null,
          true_distillery: '',
        },
        participant_answers: [],
        comments: [
          {
            participant_id: 'p1',
            display_name: 'A',
            nose: {},
            palate: {},
            finish: { text: 'long finish' },
          },
        ],
      },
    ],
  };

  it('returns true when any comment has content', () => {
    expect(resultsHaveAnyFlavorComments(base)).toBe(true);
  });

  it('returns false when no flavor comments', () => {
    expect(
      resultsHaveAnyFlavorComments({
        ...base,
        sample_details: [
          {
            ...base.sample_details[0],
            comments: [
              {
                participant_id: 'p1',
                display_name: 'A',
                nose: {},
                palate: {},
                finish: {},
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });
});

describe('sessionModeLabel', () => {
  it('maps mode to Japanese label', () => {
    expect(sessionModeLabel('sequential')).toBe('逐次モード');
    expect(sessionModeLabel('simultaneous')).toBe('同時モード');
  });
});
