import { describe, expect, it } from 'vitest';
import {
  calculateScoreExtended,
  createDefaultScoringItems,
  resultItemBadgeState,
  scoreSingleItem,
  type AnswerScoreInput,
  type TruthScoreInput,
} from './scoring-schema';

const baseAnswer = (): AnswerScoreInput => ({
  guessed_cask: 'シェリー樽',
  guessed_region: 'スコットランド（スペイサイド）',
  guessed_age: 14,
  guessed_abv: 44,
  guessed_distillery: 'マッカラン',
});

const baseTruth = (): TruthScoreInput => ({
  true_cask: 'シェリー樽',
  true_region: 'スコットランド（スペイサイド）',
  true_age: 12,
  true_abv: 43,
  true_distillery: 'マッカラン',
});

const scoringConfig = { version: 1 as const, items: createDefaultScoringItems() };
const grade = { is_correct: true, item_grades: {} };

describe('resultItemBadgeState', () => {
  it('年数の誤差部分点は「部分点」になる', () => {
    const state = resultItemBadgeState(
      'age',
      scoringConfig.items.age,
      baseAnswer(),
      baseTruth(),
      grade,
    );
    expect(state).toEqual({ kind: 'partial', earned: 1 });
  });

  it('年数が完全一致なら「正解」', () => {
    const state = resultItemBadgeState(
      'age',
      scoringConfig.items.age,
      { ...baseAnswer(), guessed_age: 12 },
      baseTruth(),
      grade,
    );
    expect(state).toEqual({ kind: 'correct' });
  });

  it('度数が大きく外れたら「不正解」', () => {
    const state = resultItemBadgeState(
      'abv',
      scoringConfig.items.abv,
      { ...baseAnswer(), guessed_abv: 30 },
      baseTruth(),
      grade,
    );
    expect(state).toEqual({ kind: 'wrong' });
  });

  it('選択式度数の一致は「正解」', () => {
    const items = createDefaultScoringItems();
    items.abv.inputType = 'choice';
    const state = resultItemBadgeState(
      'abv',
      items.abv,
      { ...baseAnswer(), guessed_abv: '40.0-44.9' },
      { ...baseTruth(), true_abv: '40.0-44.9' },
      grade,
    );
    expect(state).toEqual({ kind: 'correct' });
  });
});

describe('scoreSingleItem / calculateScoreExtended', () => {
  it('年数14・正解12で1点（部分点）', () => {
    const earned = scoreSingleItem(
      'age',
      scoringConfig.items.age,
      baseAnswer(),
      baseTruth(),
      grade,
      [],
      [],
    );
    expect(earned).toBe(1);
  });

  it('合計点に部分点が反映される', () => {
    const total = calculateScoreExtended(
      baseAnswer(),
      baseTruth(),
      grade,
      scoringConfig,
      [],
      [],
    );
    // cask5 + region2 + age1 + abv2 + distillery5 = 15
    expect(total).toBe(15);
  });
});
