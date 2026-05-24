'use client';

import { CorrectnessBadge } from '@/components/common/CorrectnessBadge';
import {
  SCORING_ITEM_KEYS,
  normalizeScoringConfig,
  resultItemCorrectnessBadge,
  type ItemGradesMap,
  type AnswerScoreInput,
  type TruthScoreInput,
  type ScoringItemKey,
} from '@/lib/scoring-schema';
import { disambiguatedDisplayName } from '@/lib/participant-display';

export type ScoringResultsTruth = {
  true_cask?: string | null;
  true_region?: string | null;
  true_age?: number | null;
  true_abv?: number | null;
  true_distillery?: string | null;
  true_other1?: string | null;
  true_other2?: string | null;
};

export type ScoringResultsAnswer = {
  participant_id: string;
  display_name: string;
  guessed_cask: string | null | undefined;
  guessed_region: string | null | undefined;
  guessed_age: number | null | undefined;
  guessed_abv: number | null | undefined;
  guessed_distillery: string | null | undefined;
  guessed_other1?: string | null | undefined;
  guessed_other2?: string | null | undefined;
  score: number;
  is_correct?: boolean | null;
  item_grades?: ItemGradesMap | null;
};

function toAnswerInput(a: ScoringResultsAnswer): AnswerScoreInput {
  return {
    guessed_cask: a.guessed_cask ?? null,
    guessed_region: a.guessed_region ?? null,
    guessed_age: a.guessed_age ?? null,
    guessed_abv: a.guessed_abv ?? null,
    guessed_distillery: a.guessed_distillery ?? null,
    guessed_other1: a.guessed_other1 ?? null,
    guessed_other2: a.guessed_other2 ?? null,
  };
}

function toTruthInput(t: ScoringResultsTruth): TruthScoreInput {
  return {
    true_cask: t.true_cask ?? null,
    true_region: t.true_region ?? null,
    true_age: t.true_age ?? null,
    true_abv: t.true_abv ?? null,
    true_distillery: t.true_distillery ?? null,
    true_other1: t.true_other1 ?? null,
    true_other2: t.true_other2 ?? null,
  };
}

function guessCellText(key: ScoringItemKey, a: AnswerScoreInput): string {
  switch (key) {
    case 'cask':
      return a.guessed_cask || '-';
    case 'region':
      return a.guessed_region || '-';
    case 'age':
      return a.guessed_age != null && Number.isFinite(a.guessed_age) ? String(a.guessed_age) : '-';
    case 'abv':
      return a.guessed_abv != null && Number.isFinite(a.guessed_abv) ? `${a.guessed_abv}%` : '-';
    case 'distillery':
      return a.guessed_distillery || '-';
    case 'other1':
      return a.guessed_other1 || '-';
    case 'other2':
      return a.guessed_other2 || '-';
    default:
      return '-';
  }
}

function truthSubtitleText(key: ScoringItemKey, t: TruthScoreInput): string {
  switch (key) {
    case 'cask':
      return t.true_cask || '—';
    case 'region':
      return t.true_region || '—';
    case 'age':
      return t.true_age != null && Number.isFinite(t.true_age) ? `${t.true_age}年` : '—';
    case 'abv':
      return t.true_abv != null && Number.isFinite(t.true_abv) ? `${t.true_abv}%` : '—';
    case 'distillery':
      return t.true_distillery || '—';
    case 'other1':
      return t.true_other1 || '—';
    case 'other2':
      return t.true_other2 || '—';
    default:
      return '—';
  }
}

function truthKeyHasContent(key: ScoringItemKey, t: TruthScoreInput): boolean {
  switch (key) {
    case 'cask':
      return typeof t.true_cask === 'string' && t.true_cask.trim() !== '';
    case 'region':
      return typeof t.true_region === 'string' && t.true_region.trim() !== '';
    case 'distillery':
      return typeof t.true_distillery === 'string' && t.true_distillery.trim() !== '';
    case 'other1':
      return typeof t.true_other1 === 'string' && t.true_other1.trim() !== '';
    case 'other2':
      return typeof t.true_other2 === 'string' && t.true_other2.trim() !== '';
    case 'age':
      return t.true_age != null && Number.isFinite(t.true_age);
    case 'abv':
      return t.true_abv != null && Number.isFinite(t.true_abv);
    default:
      return false;
  }
}

function answerKeyHasContent(key: ScoringItemKey, a: AnswerScoreInput): boolean {
  switch (key) {
    case 'cask': {
      const v = a.guessed_cask;
      return typeof v === 'string' && v.trim() !== '';
    }
    case 'region': {
      const v = a.guessed_region;
      return typeof v === 'string' && v.trim() !== '';
    }
    case 'distillery': {
      const v = a.guessed_distillery;
      return typeof v === 'string' && v.trim() !== '';
    }
    case 'other1': {
      const v = a.guessed_other1;
      return typeof v === 'string' && v.trim() !== '';
    }
    case 'other2': {
      const v = a.guessed_other2;
      return typeof v === 'string' && v.trim() !== '';
    }
    case 'age':
      return a.guessed_age != null && Number.isFinite(a.guessed_age);
    case 'abv':
      return a.guessed_abv != null && Number.isFinite(a.guessed_abv);
    default:
      return false;
  }
}

/** 正解ブロック: 採点対象項目 ∪ 値が入っている項目 */
function truthSummaryKeys(scoringSnapshot: unknown, truth: ScoringResultsTruth): ScoringItemKey[] {
  const items = normalizeScoringConfig(scoringSnapshot).items;
  const t = toTruthInput(truth);
  const set = new Set<ScoringItemKey>();
  for (const key of SCORING_ITEM_KEYS) {
    if (items[key].enabled && items[key].maxPoints > 0) set.add(key);
    if (truthKeyHasContent(key, t)) set.add(key);
  }
  return SCORING_ITEM_KEYS.filter((k) => set.has(k));
}

/** 結果表: 採点対象 ∪ 正解に値がある項目 ∪ いずれかの回答に値がある項目 */
function resultsTableKeys(
  scoringSnapshot: unknown,
  truth: ScoringResultsTruth,
  answers: ScoringResultsAnswer[],
): ScoringItemKey[] {
  const items = normalizeScoringConfig(scoringSnapshot).items;
  const t = toTruthInput(truth);
  const set = new Set<ScoringItemKey>();
  for (const key of SCORING_ITEM_KEYS) {
    if (items[key].enabled && items[key].maxPoints > 0) set.add(key);
    if (truthKeyHasContent(key, t)) set.add(key);
  }
  for (const ans of answers) {
    const aIn = toAnswerInput(ans);
    for (const key of SCORING_ITEM_KEYS) {
      if (answerKeyHasContent(key, aIn)) set.add(key);
    }
  }
  return SCORING_ITEM_KEYS.filter((k) => set.has(k));
}

function participantGuessKeys(scoringSnapshot: unknown, answer: ScoringResultsAnswer): ScoringItemKey[] {
  const items = normalizeScoringConfig(scoringSnapshot).items;
  const aIn = toAnswerInput(answer);
  const set = new Set<ScoringItemKey>();
  for (const key of SCORING_ITEM_KEYS) {
    if (items[key].enabled && items[key].maxPoints > 0) set.add(key);
    if (answerKeyHasContent(key, aIn)) set.add(key);
  }
  return SCORING_ITEM_KEYS.filter((k) => set.has(k));
}

type TruthGridProps = {
  scoringSnapshot: unknown;
  truth: ScoringResultsTruth;
};

/** 結果画面用「正解」ブロック（採点対象に加え、入力済みの項目も表示） */
export function DynamicTruthSummary({ scoringSnapshot, truth }: TruthGridProps) {
  const keys = truthSummaryKeys(scoringSnapshot, truth);
  const t = toTruthInput(truth);
  const cfg = normalizeScoringConfig(scoringSnapshot).items;

  if (keys.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        表示できる正解項目がありません（まだ未入力の可能性があります）。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {keys.map((key) => (
        <div
          key={key}
          className={key === 'distillery' || key === 'other1' || key === 'other2' ? 'col-span-2' : ''}
        >
          <span className="text-stone-400">
            {cfg[key].label}:{' '}
            <span className="text-stone-100 font-medium">{truthSubtitleText(key, t)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

type TableProps = {
  scoringSnapshot: unknown;
  truth: ScoringResultsTruth;
  answers: ScoringResultsAnswer[];
  highlightParticipantId?: string | null;
  /** 行のクラスに自分用ハイライトを付けるときのパターン（results / round-result で微妙に違う場合） */
  rowHighlightClass?: string;
};

/** 参加者×採点項目の動的表 */
export function DynamicScoringResultsTable({
  scoringSnapshot,
  truth,
  answers,
  highlightParticipantId,
  rowHighlightClass = 'bg-bd-accent/10',
}: TableProps) {
  const keys = resultsTableKeys(scoringSnapshot, truth, answers);
  const full = normalizeScoringConfig(scoringSnapshot);
  const tIn = toTruthInput(truth);
  const answerPeers = answers.map((a) => ({
    participant_id: a.participant_id,
    display_name: a.display_name,
  }));

  if (keys.length === 0) {
    return <p className="text-sm text-stone-500">表示する項目がありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-neutral-900/30">
            <th className="text-left py-3 px-3 text-stone-200 font-semibold">参加者</th>
            {keys.map((key) => (
              <th key={key} className="text-left py-3 px-3 text-stone-200 font-semibold">
                {full.items[key].label}
                <span className="text-xs text-stone-400 block font-normal">
                  正解: {truthSubtitleText(key, tIn)}
                </span>
              </th>
            ))}
            <th className="text-right py-3 px-3 text-stone-200 font-semibold">点数</th>
          </tr>
        </thead>
        <tbody>
          {answers.map((answer) => {
            const aIn = toAnswerInput(answer);
            const grade = { is_correct: answer.is_correct, item_grades: answer.item_grades };
            const highlight = highlightParticipantId && answer.participant_id === highlightParticipantId;
            return (
              <tr
                key={answer.participant_id}
                className={`border-b border-white/5 hover:bg-neutral-700/40 transition-colors ${
                  highlight ? rowHighlightClass : ''
                }`}
              >
                <td className="py-3 px-3 font-medium text-stone-100 break-words max-w-[150px]">
                  {disambiguatedDisplayName(answer.display_name, answer.participant_id, answerPeers)}
                </td>
                {keys.map((key) => {
                  const badge = resultItemCorrectnessBadge(
                    key,
                    full.items[key],
                    aIn,
                    tIn,
                    grade,
                  );
                  return (
                    <td key={key} className="py-3 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-stone-100 break-words max-w-[200px]">
                          {guessCellText(key, aIn)}
                        </span>
                        <CorrectnessBadge value={badge} />
                      </div>
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-right font-semibold text-bd-accent">{answer.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type GuessGridProps = {
  scoringSnapshot: unknown;
  answer: ScoringResultsAnswer;
};

/** 参加者詳細タブ用・1人分の推測グリッド */
export function DynamicParticipantGuessGrid({ scoringSnapshot, answer }: GuessGridProps) {
  const keys = participantGuessKeys(scoringSnapshot, answer);
  const full = normalizeScoringConfig(scoringSnapshot).items;
  const aIn = toAnswerInput(answer);

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {keys.map((key) => (
        <div
          key={key}
          className={key === 'distillery' || key === 'other1' || key === 'other2' ? 'col-span-2' : ''}
        >
          <span className="text-stone-400">{full[key].label}: </span>
          <span className="text-stone-100 break-words">{guessCellText(key, aIn)}</span>
        </div>
      ))}
      <div className="col-span-2">
        <span className="text-stone-400">点数: </span>
        <span className="text-bd-accent font-semibold">{answer.score}点</span>
      </div>
    </div>
  );
}
