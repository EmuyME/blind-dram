/**
 * レポート画像のレイアウト・スケーリング（人数・ラウンド数・列数に応じて可読性を維持）
 */

import { normalizeScoringConfig, SCORING_ITEM_KEYS, type ScoringItemKey } from '@/lib/scoring-schema';

/** 配点が有効な採点項目のみ（スナップショットから動的判定） */
export function activeScoringItemKeys(scoringSnapshot: unknown): ScoringItemKey[] {
  const cfg = normalizeScoringConfig(scoringSnapshot).items;
  return SCORING_ITEM_KEYS.filter((key) => {
    const it = cfg[key];
    return it.enabled && it.maxPoints > 0;
  });
}

export function tableFontSize(columnCount: number, rowCount = 1): number {
  let size = 16;
  if (columnCount > 8) size = 15;
  if (columnCount > 12) size = 14;
  if (columnCount > 16) size = 13;
  if (columnCount > 22) size = 12;
  if (rowCount > 15) size -= 1;
  if (rowCount > 25) size -= 1;
  return Math.max(11, size);
}

export function participantNameMaxLen(participantCount: number): number {
  if (participantCount <= 6) return 8;
  if (participantCount <= 10) return 6;
  if (participantCount <= 14) return 5;
  if (participantCount <= 20) return 4;
  return 3;
}

export function tableCellPadding(columnCount: number, rowCount: number): string {
  if (columnCount > 16 || rowCount > 20) return '5px 3px';
  if (columnCount > 12 || rowCount > 14) return '7px 5px';
  return '9px 8px';
}

/** 個人レポートのラウンド表：固定列＋採点項目＋合計の colgroup 幅（%） */
export function personalRoundColWidths(activeItemCount: number): string[] {
  const fixed = ['4%', '10%', '9%'];
  const totalPct = 9;
  const remaining = 100 - 4 - 10 - 9 - totalPct;
  const perItem = activeItemCount > 0 ? remaining / activeItemCount : 0;
  const itemCols = Array.from({ length: activeItemCount }, () => `${perItem.toFixed(2)}%`);
  return [...fixed, ...itemCols, `${totalPct}%`];
}

/** 折れ線グラフの X 軸ラベル間引き */
export function chartLabelStep(count: number, maxLabels = 12): number {
  if (count <= maxLabels) return 1;
  return Math.ceil(count / maxLabels);
}

/** レーダーチャート：部門数に応じたラベル距離・フォント */
export function radarLayout(categoryCount: number): {
  core: number;
  labelOffset: number;
  axisFontSize: number;
} {
  if (categoryCount <= 4) return { core: 260, labelOffset: 48, axisFontSize: 14 };
  if (categoryCount <= 6) return { core: 250, labelOffset: 44, axisFontSize: 13 };
  return { core: 240, labelOffset: 40, axisFontSize: 12 };
}

export function shortName(name: string, max: number): string {
  const t = name.trim();
  if (t.length <= max) return t;
  if (max <= 3) return `${t.slice(0, max)}…`;
  return `${t.slice(0, max - 1)}…`;
}
