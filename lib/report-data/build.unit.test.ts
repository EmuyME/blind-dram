import { describe, expect, it } from 'vitest';
import {
  buildOverallReportData,
  buildPersonalReportData,
  buildTournamentReportData,
} from '@/lib/report-data/build';
import type { ResultsSnapshot } from '@/lib/report-data/results-snapshot';

const scoringSnapshot = {
  region: 4,
  distillery: 5,
  age: 4,
  abv: 4,
  cask: 4,
};

function makeSnapshot(): ResultsSnapshot {
  return {
    session: {
      id: 'sess-1',
      title: 'テスト大会',
      mode: 'sequential',
      created_at: '2026-06-15T10:00:00.000Z',
    },
    scoring_snapshot: scoringSnapshot,
    rankings: [
      {
        rank: 1,
        participant_id: 'p1',
        display_name: 'Alice',
        total_score: 30,
        sample_scores: [
          { sample_id: 's1', sample_label: 'A', score: 18 },
          { sample_id: 's2', sample_label: 'B', score: 12 },
        ],
      },
      {
        rank: 2,
        participant_id: 'p2',
        display_name: 'Bob',
        total_score: 20,
        sample_scores: [
          { sample_id: 's1', sample_label: 'A', score: 10 },
          { sample_id: 's2', sample_label: 'B', score: 10 },
        ],
      },
    ],
    sample_details: [
      {
        sample_id: 's1',
        sample_label: 'A',
        presenter_name: 'Alice',
        truth: {
          true_region: 'Speyside',
          true_distillery: 'Glen A',
          true_age: 12,
          true_abv: 43,
          true_cask: 'Bourbon',
        },
        participant_answers: [
          {
            participant_id: 'p1',
            display_name: 'Alice',
            guessed_region: 'Speyside',
            guessed_distillery: 'Glen A',
            guessed_age: 12,
            guessed_abv: 43,
            guessed_cask: 'Bourbon',
            score: 18,
          },
          {
            participant_id: 'p2',
            display_name: 'Bob',
            guessed_region: 'Highland',
            guessed_distillery: 'Glen B',
            guessed_age: 10,
            guessed_abv: 40,
            guessed_cask: 'Sherry',
            score: 10,
          },
        ],
      },
      {
        sample_id: 's2',
        sample_label: 'B',
        presenter_name: 'Bob',
        truth: {
          true_region: 'Islay',
          true_distillery: 'Peat',
          true_age: 8,
          true_abv: 46,
          true_cask: 'Bourbon',
        },
        participant_answers: [
          {
            participant_id: 'p1',
            display_name: 'Alice',
            guessed_region: 'Islay',
            guessed_distillery: 'Peat',
            guessed_age: 8,
            guessed_abv: 46,
            guessed_cask: 'Bourbon',
            score: 12,
          },
          {
            participant_id: 'p2',
            display_name: 'Bob',
            guessed_region: 'Islay',
            guessed_distillery: 'Peat',
            guessed_age: 8,
            guessed_abv: 46,
            guessed_cask: 'Bourbon',
            score: 10,
          },
        ],
      },
    ],
  };
}

describe('buildTournamentReportData', () => {
  it('builds rankings and score summary from snapshot', () => {
    const data = buildTournamentReportData(makeSnapshot());
    expect(data.basic.participantCount).toBe(2);
    expect(data.basic.sampleCount).toBe(2);
    expect(data.rankings[0]).toMatchObject({ rank: 1, name: 'Alice', totalScore: 30 });
    expect(data.scoreSummary.totalScore).toBe(50);
    expect(data.scoreSummary.maxScore).toBe(18);
    expect(data.scoreSummary.minScore).toBe(10);
    expect(data.bottleScores[0].totalScore).toBe(28);
  });
});

describe('buildOverallReportData', () => {
  it('matches cumulative final scores to rankings', () => {
    const snap = makeSnapshot();
    const data = buildOverallReportData(snap);
    const lastRound = data.cumulativeScores[data.cumulativeScores.length - 1];
    for (const r of snap.rankings) {
      const point = lastRound.scores.find((s) => s.participantId === r.participant_id);
      expect(point?.cumulativeScore).toBe(r.total_score);
    }
    expect(data.highlights.winner.name).toBe('Alice');
    expect(data.bottleDifficulty[0].averageScore).toBeLessThanOrEqual(
      data.bottleDifficulty[data.bottleDifficulty.length - 1].averageScore,
    );
  });
});

describe('buildPersonalReportData', () => {
  it('computes participant stats and rounds', () => {
    const data = buildPersonalReportData(makeSnapshot(), 'p1');
    expect(data?.participant.rank).toBe(1);
    expect(data?.participant.totalScore).toBe(30);
    expect(data?.rounds).toHaveLength(2);
    expect(data?.maxTotalScorePerRound).toBeGreaterThan(0);
  });

  it('returns null for unknown participant', () => {
    expect(buildPersonalReportData(makeSnapshot(), 'missing')).toBeNull();
  });
});
