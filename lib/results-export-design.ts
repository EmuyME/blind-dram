/** 結果画像エクスポート専用デザイントークン・ヘルパー */

import { normalizeScoringConfig, type ScoringItemKey, SCORING_ITEM_KEYS } from '@/lib/scoring-schema';
import type { ResultsPosterData, ResultsPosterSampleDetail } from '@/lib/results-poster';

export const EXPORT_WIDTH_PX = 1080;
export const EXPORT_HEIGHT_PX = 1920;

export const exportColors = {
  paperTop: '#F8F4EC',
  paperBottom: '#EDE6D8',
  ink: '#2C2418',
  inkMuted: '#5C4F3D',
  inkLight: '#8A7B68',
  accent: '#9A7B4F',
  accentDark: '#6B542F',
  rule: '#D4C4A8',
  gold: '#C4A574',
  medal1: '#D4AF37',
  medal2: '#A8A9AD',
  medal3: '#B87333',
  heatLow: 'rgba(154, 123, 79, 0.12)',
  heatHigh: 'rgba(154, 123, 79, 0.72)',
} as const;

export function truncateText(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function formatTruthLines(
  scoringSnapshot: unknown,
  truth: ResultsPosterSampleDetail['truth'],
): string[] {
  const cfg = normalizeScoringConfig(scoringSnapshot).items;
  const lines: string[] = [];
  const push = (key: ScoringItemKey, label: string, value: string | number | null | undefined) => {
    const v = value == null || value === '' ? null : String(value).trim();
    if (!v) return;
    if (!cfg[key].enabled && key !== 'other1' && key !== 'other2') return;
    lines.push(`${label}: ${v}`);
  };
  push('cask', cfg.cask.label, truth.true_cask);
  push('region', cfg.region.label, truth.true_region);
  push('age', cfg.age.label, truth.true_age);
  push('abv', cfg.abv.label, truth.true_abv);
  push('distillery', cfg.distillery.label, truth.true_distillery);
  push('other1', cfg.other1.label, truth.true_other1);
  push('other2', cfg.other2.label, truth.true_other2);
  return lines;
}

export function formatGuessSummary(
  scoringSnapshot: unknown,
  answer: ResultsPosterSampleDetail['participant_answers'][number],
): string {
  const cfg = normalizeScoringConfig(scoringSnapshot).items;
  const parts: string[] = [];
  for (const key of SCORING_ITEM_KEYS) {
    if (!cfg[key].enabled || cfg[key].maxPoints <= 0) continue;
    let v: string | null = null;
    switch (key) {
      case 'cask':
        v = answer.guessed_cask;
        break;
      case 'region':
        v = answer.guessed_region;
        break;
      case 'age':
        v = answer.guessed_age != null ? String(answer.guessed_age) : null;
        break;
      case 'abv':
        v = answer.guessed_abv != null ? String(answer.guessed_abv) : null;
        break;
      case 'distillery':
        v = answer.guessed_distillery;
        break;
      case 'other1':
        v = answer.guessed_other1 ?? null;
        break;
      case 'other2':
        v = answer.guessed_other2 ?? null;
        break;
    }
    if (v && v.trim()) parts.push(truncateText(v.trim(), 12));
    if (parts.length >= 3) break;
  }
  return parts.length > 0 ? parts.join(' / ') : '—';
}

export function scoreHeatBackground(score: number, maxScore: number): string {
  if (maxScore <= 0) return exportColors.heatLow;
  const t = Math.min(1, Math.max(0, score / maxScore));
  const r = 154;
  const g = 123;
  const b = 79;
  const a = 0.1 + t * 0.65;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export function maxScoresPerSample(results: ResultsPosterData): Map<string, number> {
  const map = new Map<string, number>();
  for (const sample of results.sample_details) {
    let max = 0;
    for (const a of sample.participant_answers) {
      if (a.score > max) max = a.score;
    }
    map.set(sample.sample_id, max);
  }
  return map;
}

export function rankHighlight(results: ResultsPosterData): string | null {
  const sorted = [...results.rankings].sort((a, b) => a.rank - b.rank);
  if (sorted.length < 2) return null;
  const second = sorted[1];
  const third = sorted[2];
  if (second && third && second.total_score - third.total_score <= 3) {
    return `${second.rank}位と${third.rank}位の差は${second.total_score - third.total_score}点`;
  }
  const top = sorted[0];
  if (top && second && top.total_score - second.total_score >= 20) {
    return `${top.rank}位が${top.total_score - second.total_score}点差で優勝`;
  }
  return null;
}
