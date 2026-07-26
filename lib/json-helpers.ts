import { normalizeScoringConfig, type FullScoringConfig } from '@/lib/scoring-schema';

export function toScoringConfig(raw: unknown): FullScoringConfig {
  return normalizeScoringConfig(raw);
}

export function tier1ListFromFlavorChart(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const tier1 = (raw as { tier1?: unknown }).tier1;
  if (!Array.isArray(tier1)) return [];
  return tier1.filter((x): x is string => typeof x === 'string');
}

import { DEFAULT_FLAVOR_CHART } from '@/lib/default-flavor-chart';

export const DEFAULT_TIER1_LIST_FOR_RADAR: string[] = [...DEFAULT_FLAVOR_CHART.tier1];

export function tier1ListForSessionRadar(raw: unknown): string[] {
  const fromSnap = tier1ListFromFlavorChart(raw);
  return fromSnap.length > 0 ? fromSnap : [...DEFAULT_TIER1_LIST_FOR_RADAR];
}

/** JSONB が文字列で返る環境向け */
function flavorSectionMaybeParse(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

export type AnswerFlavorSection = {
  tier1_tags?: string[];
  tier2_terms?: string[];
  /** Tier1 キーごとの強度 1〜5（未設定時は集計上 1 として扱う） */
  tier1_intensity?: Record<string, number>;
  text?: string | null;
} | null;

/** Tier1 強度を 1〜5 に丸める */
export function clampTier1Intensity(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.min(5, Math.max(1, Math.round(v)));
  }
  if (typeof v === 'string') {
    const n = parseInt(v.trim(), 10);
    if (Number.isFinite(n)) return Math.min(5, Math.max(1, n));
  }
  return 1;
}

function parseTier1IntensityRecord(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = clampTier1Intensity(val);
  }
  return out;
}

/**
 * 1回答について、各 Tier1 キーごとに Nose / Palate / Finish で選んだ強度の最大値を返す。
 * 軸に無いタグは「その他」に寄せる（複数あればその最大）。
 */
export function tier1MaxAcrossSectionsForAnswer(
  answer: { nose?: unknown; palate?: unknown; finish?: unknown },
  tier1List: string[],
): Record<string, number> {
  const tier1Set = new Set(tier1List);
  const counts: Record<string, number> = {};
  tier1List.forEach((t) => {
    counts[t] = 0;
  });

  const tagToMax = new Map<string, number>();
  for (const sec of ['nose', 'palate', 'finish'] as const) {
    const parsed = flavorSectionMaybeParse(answer[sec]);
    if (!parsed || typeof parsed !== 'object') continue;
    const o = parsed as Record<string, unknown>;
    const tags = Array.isArray(o.tier1_tags)
      ? o.tier1_tags.filter((t): t is string => typeof t === 'string')
      : [];
    const intMap = parseTier1IntensityRecord(o.tier1_intensity);
    for (const tag of tags) {
      const v = intMap[tag] ?? 1;
      tagToMax.set(tag, Math.max(tagToMax.get(tag) ?? 0, v));
    }
  }

  for (const [tag, maxV] of tagToMax) {
    if (tier1Set.has(tag)) {
      counts[tag] = maxV;
    } else if (counts['その他'] !== undefined) {
      counts['その他'] = Math.max(counts['その他'], maxV);
    } else {
      counts[tag] = maxV;
    }
  }

  return counts;
}

/** 複数回答を集計: 各回答の「セクション間最大」を合算する */
export function addAnswerMaxFlavorIntensitiesToTotals(
  answer: { nose?: unknown; palate?: unknown; finish?: unknown },
  totals: Record<string, number>,
  tier1List: string[],
): void {
  const row = tier1MaxAcrossSectionsForAnswer(answer, tier1List);
  for (const k of Object.keys(totals)) {
    totals[k] += row[k] ?? 0;
  }
}

/** ナイチンゲール・ローズ・チャートの軸: 「その他」は値が正のときだけ載せる */
export function flavorRadarChartLabels(tier1_counts: Record<string, number>): string[] {
  return Object.keys(tier1_counts).filter((l) => {
    if (l === 'その他') return (tier1_counts[l] ?? 0) > 0;
    return true;
  });
}

/** セッションスナップショット（flavor_chart 相当）から「その他」をチャートに載せるか。`=== true` のときのみ含める（レガシー・マップ無し時） */
export function flavorChartIncludeOtherInNightingaleChart(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return (raw as { include_other_in_nightingale_chart?: unknown }).include_other_in_nightingale_chart === true;
}

function parseTier1NightingaleVisibleFromFlavorRaw(raw: unknown): Record<string, boolean> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = (raw as { tier1_nightingale_visible?: unknown }).tier1_nightingale_visible;
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (typeof k !== 'string') continue;
    out[k] = v === true;
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}

/**
 * チャート表示用: `tier1_nightingale_visible` があれば各 Tier1 の表示設定を適用。
 * 無いときはレガシーとして `include_other_in_nightingale_chart` のみ「その他」に効く。
 * 集計 API の生データは変えない。
 */
export function tier1CountsForNightingaleChartDisplay(
  counts: Record<string, number> | undefined | null,
  flavorChartRaw: unknown,
): Record<string, number> {
  if (!counts) return {};
  const visMap = parseTier1NightingaleVisibleFromFlavorRaw(flavorChartRaw);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    let visible: boolean;
    if (visMap !== null) {
      if (Object.prototype.hasOwnProperty.call(visMap, k)) {
        visible = visMap[k] !== false;
      } else {
        visible = k !== 'その他';
      }
    } else if (k === 'その他') {
      visible = flavorChartIncludeOtherInNightingaleChart(flavorChartRaw);
    } else {
      visible = true;
    }
    if (visible) out[k] = v;
  }
  return out;
}

export function hasNonZeroTier1CountsForNightingaleChart(
  counts: Record<string, number> | undefined | null,
  flavorChartRaw: unknown,
): boolean {
  const c = tier1CountsForNightingaleChartDisplay(counts, flavorChartRaw);
  return Object.values(c).some((v) => v > 0);
}

/** 見出し用: ラベルが既に「Sample …」形式ならそのまま、そうでなければ接頭辞を付ける */
import { formatSampleLabel } from '@/lib/ui-labels';

/** @deprecated formatSampleLabel を使用 */
export function formatSampleHeadingLabel(sampleLabel: string | null | undefined): string {
  return formatSampleLabel(sampleLabel);
}

/**
 * レーダー集計用: 提出済みに加え、各サンプルのプレゼンター本人の draft を載せる。
 * プレゼンターのテイスティングは通常 **Presenterパネル**（`/presenter/:sampleId`）から保存され、
 * 提出直後は submitted・未保存中は draft など状態が混ざるため、draft 行もプレゼンター本人分はレーダーに含める。
 * 同一 sample・参加者で submitted がある場合は draft 行は二重に足さない（DB 上は 1 行だが API では別クエリのため論理的に整理）。
 */
export function mergeSubmittedAndPresenterDraftsForFlavorRadar<
  TSub extends { sample_id: string; participant_id: string; status?: string | null },
  TDraft extends { sample_id: string; participant_id: string; status?: string | null },
>(
  submitted: TSub[],
  drafts: TDraft[] | null | undefined,
  samples: Array<{ id: string; presenter_participant_id: string | null }>,
): (TSub | TDraft)[] {
  const presenterBySample = new Map(
    samples.map((s) => [s.id, s.presenter_participant_id ?? null]),
  );
  const key = (a: { sample_id: string; participant_id: string }) =>
    `${a.sample_id}:${a.participant_id}`;
  const seen = new Set(submitted.map((a) => key(a)));
  const out: (TSub | TDraft)[] = [...submitted];
  for (const d of drafts || []) {
    if ((d.status ?? '') !== 'draft') continue;
    const pres = presenterBySample.get(d.sample_id);
    if (!pres || pres !== d.participant_id) continue;
    const k = key(d);
    if (!seen.has(k)) {
      out.push(d);
      seen.add(k);
    }
  }
  return out;
}

export function getAnswerSectionFlavor(
  answer: { nose?: unknown; palate?: unknown; finish?: unknown },
  section: 'nose' | 'palate' | 'finish',
): AnswerFlavorSection {
  const raw = flavorSectionMaybeParse(answer[section]);
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tier1_tags = Array.isArray(o.tier1_tags)
    ? o.tier1_tags.filter((t): t is string => typeof t === 'string')
    : undefined;
  const tier2_terms = Array.isArray(o.tier2_terms)
    ? o.tier2_terms.filter((t): t is string => typeof t === 'string')
    : undefined;
  const tier1_intensity = parseTier1IntensityRecord(o.tier1_intensity);
  const text =
    o.text === null || typeof o.text === 'string' ? (o.text as string | null) : undefined;
  return { tier1_tags, tier2_terms, tier1_intensity, text: text ?? null };
}

/** 結果画面のコメント／チップ用に nose/palate/finish を整形 */
export function flavorCommentsFromAnswer(answer: {
  nose?: unknown;
  palate?: unknown;
  finish?: unknown;
}): {
  nose: {
    tier1_tags: string[];
    tier2_terms: string[];
    tier1_intensity?: Record<string, number>;
    text: string | null;
  };
  palate: {
    tier1_tags: string[];
    tier2_terms: string[];
    tier1_intensity?: Record<string, number>;
    text: string | null;
  };
  finish: {
    tier1_tags: string[];
    tier2_terms: string[];
    tier1_intensity?: Record<string, number>;
    text: string | null;
  };
} {
  const box = (section: 'nose' | 'palate' | 'finish') => {
    const f = getAnswerSectionFlavor(answer, section);
    const int =
      f?.tier1_intensity && Object.keys(f.tier1_intensity).length > 0 ? f.tier1_intensity : undefined;
    return {
      tier1_tags: f?.tier1_tags ?? [],
      tier2_terms: f?.tier2_terms ?? [],
      text: f?.text ?? null,
      ...(int ? { tier1_intensity: int } : {}),
    };
  };
  return { nose: box('nose'), palate: box('palate'), finish: box('finish') };
}

/** 1人分の回答だけをレーダー用に集計（Nose/Palate/Finish の強度の最大） */
export function tier1CountsForAnswerFlavor(
  answer: { nose?: unknown; palate?: unknown; finish?: unknown },
  tier1List: string[],
): Record<string, number> {
  return tier1MaxAcrossSectionsForAnswer(answer, tier1List);
}

/** Presenter パネルで入力した Tier2 をセクション別にまとめる（結果詳細のチャート周りに表示） */
export type PresenterTastingTier2BySection = {
  nose: string[];
  palate: string[];
  finish: string[];
};

export function mergePresenterTastingTier2FromAnswers(
  answers: Array<{ nose?: unknown; palate?: unknown; finish?: unknown }>,
): PresenterTastingTier2BySection {
  const merged: PresenterTastingTier2BySection = { nose: [], palate: [], finish: [] };
  const seen = {
    nose: new Set<string>(),
    palate: new Set<string>(),
    finish: new Set<string>(),
  };
  for (const answer of answers) {
    for (const sec of ['nose', 'palate', 'finish'] as const) {
      const f = getAnswerSectionFlavor(answer, sec);
      const raw = f?.tier2_terms ?? [];
      for (const t of raw) {
        if (typeof t !== 'string') continue;
        const s = t.trim();
        if (!s || seen[sec].has(s)) continue;
        seen[sec].add(s);
        merged[sec].push(s);
      }
    }
  }
  return merged;
}

export function hasAnyPresenterTastingTier2(t: PresenterTastingTier2BySection | undefined): boolean {
  if (!t) return false;
  return t.nose.length + t.palate.length + t.finish.length > 0;
}
