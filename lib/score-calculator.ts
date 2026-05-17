// 点数計算（拡張スキーマ対応、旧 API 互換）
export type {
  ScoringItemKey,
  ItemGradesMap,
  ItemGrade,
  AnswerScoreInput,
  TruthScoreInput,
  FullScoringConfig,
} from '@/lib/scoring-schema';
export {
  normalizeScoringConfig,
  calculateScoreExtended,
  isParticipantManualGradingComplete,
  SCORING_ITEM_KEYS,
  createDefaultScoringItems,
  optionsForItem,
} from '@/lib/scoring-schema';

import {
  calculateScoreExtended,
  type AnswerScoreInput,
  type TruthScoreInput,
  type ItemGradesMap,
} from '@/lib/scoring-schema';

/** @deprecated 型互換 */
export interface AnswerData {
  guessed_cask: string | null;
  guessed_region: string | null;
  guessed_age: number | null;
  guessed_abv: number | null;
  guessed_distillery: string | null;
}

export interface TruthData {
  true_cask: string | null;
  true_region: string | null;
  true_age: number | null;
  true_abv: number | null;
  true_distillery: string | null;
}

export interface DistilleryGrade {
  /** 従来の蒸留所一括○×。項目別手採点のみのときは null 可 */
  is_correct?: boolean | null;
  item_grades?: ItemGradesMap | null;
}

/** @deprecated 旧フラット形式（normalizeScoringConfig が解釈） */
export interface ScoringConfig {
  cask: number;
  region: number;
  age: number;
  abv: number;
  distillery: number;
  age_penalty_per_year?: number;
  abv_penalty_per_percent?: number;
}

/**
 * 回答の点数を計算する（拡張設定・item_grades 対応）
 */
export function calculateScore(
  answer: AnswerData & { guessed_other1?: string | null; guessed_other2?: string | null },
  truth: TruthData & { true_other1?: string | null; true_other2?: string | null },
  distilleryGrade: DistilleryGrade | null,
  scoring?: unknown,
  caskOptions: string[] = [],
  regionOptions: string[] = [],
): number {
  const a: AnswerScoreInput = {
    guessed_cask: answer.guessed_cask,
    guessed_region: answer.guessed_region,
    guessed_age: answer.guessed_age,
    guessed_abv: answer.guessed_abv,
    guessed_distillery: answer.guessed_distillery,
    guessed_other1: answer.guessed_other1,
    guessed_other2: answer.guessed_other2,
  };
  const t: TruthScoreInput = {
    true_cask: truth.true_cask,
    true_region: truth.true_region,
    true_age: truth.true_age,
    true_abv: truth.true_abv,
    true_distillery: truth.true_distillery,
    true_other1: truth.true_other1,
    true_other2: truth.true_other2,
  };
  const grade = {
    is_correct: distilleryGrade?.is_correct ?? null,
    item_grades: distilleryGrade?.item_grades,
  };
  return calculateScoreExtended(a, t, grade, scoring ?? null, caskOptions, regionOptions);
}
