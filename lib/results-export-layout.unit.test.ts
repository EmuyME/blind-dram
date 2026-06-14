import { describe, expect, it } from 'vitest';
import { archiveExportTotalPages, buildArchiveExportPages } from '@/lib/results-export-layout';
import type { ResultsPosterData } from '@/lib/results-poster';

const baseResults: ResultsPosterData = {
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
      comments: [{ participant_id: 'p1', display_name: 'P', nose: { text: 'x' }, palate: {}, finish: {} }],
    },
    {
      sample_id: 's2',
      sample_label: 'B',
      truth: {
        true_cask: '',
        true_region: '',
        true_age: null,
        true_abv: null,
        true_distillery: '',
      },
      participant_answers: [],
      comments: [],
    },
  ],
};

describe('buildArchiveExportPages', () => {
  it('adds flavor page only for samples with comments', () => {
    const pages = buildArchiveExportPages(baseResults);
    expect(pages.map((p) => p.kind)).toEqual([
      'ranking',
      'sample',
      'sample-flavor',
      'sample',
    ]);
    expect(archiveExportTotalPages(baseResults)).toBe(4);
  });
});
