export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** 母標準偏差 */
export function populationStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export type ScoreCell = {
  participantId: string;
  participantName: string;
  sampleId: string;
  sampleName: string;
  score: number;
};

export function collectAllRoundScores(
  rankings: ResultsSnapshotRankings,
): number[] {
  const scores: number[] = [];
  for (const r of rankings) {
    for (const s of r.sample_scores) {
      scores.push(s.score);
    }
  }
  return scores;
}

type ResultsSnapshotRankings = Array<{
  participant_id: string;
  display_name: string;
  sample_scores: Array<{ sample_id: string; sample_label: string; score: number }>;
}>;

export function collectScoreCells(rankings: ResultsSnapshotRankings): ScoreCell[] {
  const cells: ScoreCell[] = [];
  for (const r of rankings) {
    for (const s of r.sample_scores) {
      cells.push({
        participantId: r.participant_id,
        participantName: r.display_name,
        sampleId: s.sample_id,
        sampleName: s.sample_label,
        score: s.score,
      });
    }
  }
  return cells;
}

export function pickExtremeScoreCells(
  cells: ScoreCell[],
  mode: 'max' | 'min',
): { primary: ScoreCell; othersCount: number } | null {
  if (cells.length === 0) return null;
  const target =
    mode === 'max'
      ? Math.max(...cells.map((c) => c.score))
      : Math.min(...cells.map((c) => c.score));
  const matches = cells.filter((c) => c.score === target);
  return { primary: matches[0], othersCount: Math.max(0, matches.length - 1) };
}

export function pickExtremeRoundScores(
  rounds: Array<{ sampleId: string; sampleName: string; presenterName: string; score: number }>,
  mode: 'max' | 'min',
): {
  primary: { sampleId: string; sampleName: string; presenterName: string; score: number };
  othersCount: number;
} | null {
  if (rounds.length === 0) return null;
  const target =
    mode === 'max'
      ? Math.max(...rounds.map((r) => r.score))
      : Math.min(...rounds.map((r) => r.score));
  const matches = rounds.filter((r) => r.score === target);
  return { primary: matches[0], othersCount: Math.max(0, matches.length - 1) };
}

export function formatReportDate(iso?: string | null): string {
  if (!iso) {
    return new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
