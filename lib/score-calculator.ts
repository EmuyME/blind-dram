// 点数計算ユーティリティ
// 仕様: カスク3 + 地域3 + 年数3 + 度数3 + 蒸留所6 = 最大18点（デフォルト）

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
  is_correct: boolean;
}

export interface ScoringConfig {
  cask: number;
  region: number;
  age: number;
  abv: number;
  distillery: number;
  age_penalty_per_year?: number; // 年数：誤差○年ごとに1点減点（デフォルト：1）
  abv_penalty_per_percent?: number; // 度数：誤差○%ごとに1点減点（デフォルト：2）
}

// デフォルト配点
const DEFAULT_SCORING: ScoringConfig = {
  cask: 3,
  region: 3,
  age: 3,
  abv: 3,
  distillery: 6,
};

/**
 * 回答の点数を計算する
 * @param answer 参加者の回答
 * @param truth 正解
 * @param distilleryGrade 蒸留所名の採点結果
 * @param scoring 配点設定（オプショナル、指定されない場合はデフォルト値を使用）
 * @returns 合計点数
 */
export function calculateScore(
  answer: AnswerData,
  truth: TruthData,
  distilleryGrade: DistilleryGrade | null,
  scoring?: ScoringConfig | null
): number {
  const scoringConfig = scoring || DEFAULT_SCORING;
  let score = 0;

  // カスク: 配点（選択一致）
  if (answer.guessed_cask && truth.true_cask) {
    if (answer.guessed_cask === truth.true_cask) {
      score += scoringConfig.cask;
    }
  }

  // 地域: 配点（選択一致）
  if (answer.guessed_region && truth.true_region) {
    if (answer.guessed_region === truth.true_region) {
      score += scoringConfig.region;
    }
  }

  // 熟成年数: 配点（誤差○年ごとに -1、下限0）
  if (answer.guessed_age !== null && truth.true_age !== null) {
    const diff = Math.abs(answer.guessed_age - truth.true_age);
    const penaltyPerYear = scoringConfig.age_penalty_per_year || 1;
    const penaltyPoints = Math.floor(diff / penaltyPerYear);
    const ageScore = Math.max(0, scoringConfig.age - penaltyPoints);
    score += ageScore;
  }

  // 度数: 配点（誤差○%ごとに -1、下限0）
  if (answer.guessed_abv !== null && truth.true_abv !== null) {
    const diff = Math.abs(answer.guessed_abv - truth.true_abv);
    const penaltyPerPercent = scoringConfig.abv_penalty_per_percent || 2;
    const penaltyPoints = Math.floor(diff / penaltyPerPercent);
    const abvScore = Math.max(0, scoringConfig.abv - penaltyPoints);
    score += abvScore;
  }

  // 蒸留所: 配点（Presenterが○×判定。正解=配点 / 不正解=0）
  if (distilleryGrade) {
    if (distilleryGrade.is_correct) {
      score += scoringConfig.distillery;
    }
  }

  return score;
}
