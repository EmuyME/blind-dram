/**
 * レポート画像のデザインシステム（スタイルヘルパー）
 */

import type { CSSProperties } from 'react';
import type { ReportTheme } from '@/lib/report-export/theme';
import { REPORT_FONTS } from '@/lib/report-export/theme';
import { REPORT_TYPE } from '@/lib/report-export/typography';

export const REPORT_RADIUS = 10;
export const REPORT_SHADOW = '0 2px 12px rgba(0,0,0,0.06)';
export const CONTENT_INNER_WIDTH = 1120;

export function cardSurface(theme: ReportTheme): CSSProperties {
  return {
    background: theme.cardBg,
    border: `1px solid ${theme.cardBorder}`,
    borderRadius: REPORT_RADIUS,
    boxShadow: REPORT_SHADOW,
  };
}

export function numericText(theme: ReportTheme, emphasis = false): CSSProperties {
  return {
    fontFamily: REPORT_FONTS.serif,
    fontWeight: emphasis ? 800 : 700,
    fontSize: emphasis ? REPORT_TYPE.tableNum : REPORT_TYPE.tableBody,
    color: emphasis ? theme.headerBg : theme.ink,
  };
}

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
      borderRadius: 5,
      overflow: 'hidden',
      minWidth: 48,
    },
    fill: {
      width: `${pct}%`,
      height: '100%',
      background: `linear-gradient(90deg, ${theme.headerBg}cc, ${theme.headerBg})`,
      borderRadius: 5,
      minWidth: pct > 0 ? 4 : 0,
    },
  };
}
