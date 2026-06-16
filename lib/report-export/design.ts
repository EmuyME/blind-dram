/**
 * レポート画像のデザインシステム
 *
 * 上位概念:
 * 1. 一枚の「記録」として読める — 章立て（セクション）が明確
 * 2. 視線の流れ — 上から下へ、大きい数字 → 詳細データ
 * 3. 用途別の整列 — 指標は中央、表は左、チャートは中央
 * 4. 8px グリッド — 余白・サイズはすべて 4 の倍数
 */

import type { CSSProperties } from 'react';
import type { ReportTheme } from '@/lib/report-export/theme';
import { REPORT_FONTS } from '@/lib/report-export/theme';
import { REPORT_TYPE } from '@/lib/report-export/typography';

export const REPORT_RADIUS = 8;
export const REPORT_SHADOW = '0 1px 4px rgba(0,0,0,0.07)';
export const CONTENT_INNER_WIDTH = 1128;

export function sectionAccentBar(theme: ReportTheme): CSSProperties {
  return {
    width: 4,
    height: 22,
    borderRadius: 2,
    background: theme.sectionBar,
    flexShrink: 0,
  };
}

export function cardSurface(theme: ReportTheme): CSSProperties {
  return {
    background: theme.cardBg,
    border: `1px solid ${theme.cardBorder}`,
    borderRadius: REPORT_RADIUS,
    boxShadow: REPORT_SHADOW,
  };
}

export function panelHeaderBar(theme: ReportTheme): CSSProperties {
  return {
    padding: '9px 12px',
    background: theme.tableHeadBg,
    color: '#fff',
    fontSize: REPORT_TYPE.panelTitle,
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: '0.04em',
    fontFamily: REPORT_FONTS.serif,
  };
}

/** 表・カード内の数値（得点・順位など） */
export function numericText(theme: ReportTheme, emphasis = false): CSSProperties {
  return {
    fontFamily: REPORT_FONTS.serif,
    fontWeight: emphasis ? 800 : 700,
    fontSize: emphasis ? REPORT_TYPE.tableNum : REPORT_TYPE.tableBody,
    color: emphasis ? theme.headerBg : theme.ink,
  };
}

/** ミニ横棒（難易度・達成率の視覚化） */
export function miniBarStyle(
  theme: ReportTheme,
  ratio: number,
  height = 20,
): { track: CSSProperties; fill: CSSProperties } {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return {
    track: {
      height,
      background: theme.paperAlt,
      borderRadius: 4,
      overflow: 'hidden',
      minWidth: 48,
    },
    fill: {
      width: `${pct}%`,
      height: '100%',
      background: theme.headerBg,
      borderRadius: 4,
      minWidth: pct > 0 ? 4 : 0,
    },
  };
}
