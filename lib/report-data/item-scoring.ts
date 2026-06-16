import {
  normalizeScoringConfig,
  resultItemBadgeState,
  scoreSingleItem,
  type AnswerScoreInput,
  type GradeScoreInput,
  type ScoringItemKey,
  type TruthScoreInput,
} from '@/lib/scoring-schema';
import type { Judgement, ReportItemKey, ReportRoundItem, ReportTruthFields } from '@/lib/report-data/types';
import { REPORT_ITEM_KEYS } from '@/lib/report-data/types';
import type { ResultsSnapshot } from '@/lib/report-data/results-snapshot';

const KEY_MAP: Record<ReportItemKey, ScoringItemKey> = {
  region: 'region',
  distillery: 'distillery',
  age: 'age',
  abv: 'abv',
  cask: 'cask',
};

export function badgeToJudgement(
  kind: 'correct' | 'wrong' | 'partial' | 'unknown',
): Judgement {
  switch (kind) {
    case 'correct':
      return 'correct';
    case 'partial':
      return 'partial';
    case 'wrong':
      return 'wrong';
    default:
      return 'unjudged';
  }
}

function formatFieldValue(key: ReportItemKey, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'age') {
    const s = String(value).trim();
    if (s.includes('年')) return s;
    return `${s}年`;
  }
  if (key === 'abv') {
    const s = String(value).trim();
    if (s.includes('%')) return s;
    return `${s}%`;
  }
  return String(value).trim();
}

export function truthToReportFields(truth: ResultsSnapshot['sample_details'][0]['truth']): ReportTruthFields {
  return {
    region: formatFieldValue('region', truth.true_region),
    distillery: formatFieldValue('distillery', truth.true_distillery),
    age: formatFieldValue('age', truth.true_age),
    abv: formatFieldValue('abv', truth.true_abv),
    cask: formatFieldValue('cask', truth.true_cask),
  };
}

function guessValue(
  key: ReportItemKey,
  answer: ResultsSnapshot['sample_details'][0]['participant_answers'][0],
): string | number | null {
  switch (key) {
    case 'region':
      return answer.guessed_region;
    case 'distillery':
      return answer.guessed_distillery;
    case 'age':
      return answer.guessed_age;
    case 'abv':
      return answer.guessed_abv;
    case 'cask':
      return answer.guessed_cask;
  }
}

function truthValue(key: ReportItemKey, truth: ResultsSnapshot['sample_details'][0]['truth']): string | number | null {
  switch (key) {
    case 'region':
      return truth.true_region;
    case 'distillery':
      return truth.true_distillery;
    case 'age':
      return truth.true_age;
    case 'abv':
      return truth.true_abv;
    case 'cask':
      return truth.true_cask;
  }
}

export function buildRoundItem(
  key: ReportItemKey,
  scoringSnapshot: unknown,
  truth: ResultsSnapshot['sample_details'][0]['truth'],
  answer: ResultsSnapshot['sample_details'][0]['participant_answers'][0] | null,
): ReportRoundItem {
  const fullCfg = normalizeScoringConfig(scoringSnapshot);
  const cfg = fullCfg.items;
  const caskOptions = (cfg.cask.options ?? []).map(String);
  const regionOptions = (cfg.region.options ?? []).map(String);
  const sk = KEY_MAP[key];
  const itemCfg = cfg[sk];
  const label = itemCfg.label;
  const maxScore = itemCfg.enabled && itemCfg.maxPoints > 0 ? itemCfg.maxPoints : 0;

  if (!answer || maxScore <= 0) {
    return {
      label,
      maxScore,
      answer: '—',
      truth: formatFieldValue(key, truthValue(key, truth)),
      judgement: 'unjudged',
      earnedScore: 0,
    };
  }

  const aIn: AnswerScoreInput = {
    guessed_cask: answer.guessed_cask,
    guessed_region: answer.guessed_region,
    guessed_age: answer.guessed_age,
    guessed_abv: answer.guessed_abv,
    guessed_distillery: answer.guessed_distillery,
  };
  const tIn: TruthScoreInput = {
    true_cask: truth.true_cask,
    true_region: truth.true_region,
    true_age: truth.true_age,
    true_abv: truth.true_abv,
    true_distillery: truth.true_distillery,
  };
  const grade: GradeScoreInput = {
    is_correct: answer.is_correct ?? null,
    item_grades: answer.item_grades,
  };
  const badge = resultItemBadgeState(sk, itemCfg, aIn, tIn, grade, caskOptions, regionOptions);
  const earned = scoreSingleItem(sk, itemCfg, aIn, tIn, grade, caskOptions, regionOptions);

  return {
    label,
    maxScore,
    answer: formatFieldValue(key, guessValue(key, answer)),
    truth: formatFieldValue(key, truthValue(key, truth)),
    judgement: badgeToJudgement(badge.kind),
    earnedScore: earned,
  };
}

export function getItemMaxScores(scoringSnapshot: unknown): Record<ReportItemKey, number> {
  const cfg = normalizeScoringConfig(scoringSnapshot).items;
  const out = {} as Record<ReportItemKey, number>;
  for (const key of REPORT_ITEM_KEYS) {
    const sk = KEY_MAP[key];
    const it = cfg[sk];
    out[key] = it.enabled && it.maxPoints > 0 ? it.maxPoints : 0;
  }
  return out;
}

export function maxTotalScorePerRound(scoringSnapshot: unknown): number {
  const m = getItemMaxScores(scoringSnapshot);
  return REPORT_ITEM_KEYS.reduce((sum, k) => sum + m[k], 0);
}

export function buildCategoryScoresForParticipant(
  results: ResultsSnapshot,
  participantId: string,
) {
  const earned: Record<ReportItemKey, number> = {
    region: 0,
    distillery: 0,
    age: 0,
    abv: 0,
    cask: 0,
  };
  const max: Record<ReportItemKey, number> = {
    region: 0,
    distillery: 0,
    age: 0,
    abv: 0,
    cask: 0,
  };

  for (const sample of results.sample_details) {
    const snap = sample.scoring_snapshot ?? results.scoring_snapshot;
    const answer = sample.participant_answers.find((a) => a.participant_id === participantId);
    if (!answer) continue;

    for (const key of REPORT_ITEM_KEYS) {
      const item = buildRoundItem(key, snap, sample.truth, answer);
      if (item.judgement === 'unjudged' || item.maxScore <= 0) continue;
      earned[key] += item.earnedScore;
      max[key] += item.maxScore;
    }
  }

  const cfg = normalizeScoringConfig(results.scoring_snapshot).items;
  return REPORT_ITEM_KEYS.map((key) => {
    const sk = KEY_MAP[key];
    const rate = max[key] > 0 ? Math.round((earned[key] / max[key]) * 100) : 0;
    return {
      key,
      label: cfg[sk].label,
      earnedScore: earned[key],
      maxScore: max[key],
      rate,
    };
  });
}
