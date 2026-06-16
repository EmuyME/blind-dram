/**
 * レポート画像用タイポグラフィ（1200px基準・2xキャプチャ想定）
 *
 * タイプスケール（5段階）:
 * - Display … ブランド・参加者名
 * - Title   … セクション見出し
 * - Head    … パネル・カード見出し
 * - Body    … 表本文・ラベル
 * - Data    … 数値・得点（セリフ・太字）
 */

export const REPORT_SPACE = {
  pageX: 36,
  pageY: 24,
  section: 24,
  block: 14,
  card: 10,
  grid: 10,
} as const;

export const CHART_LABEL_PAD = 60;

export const REPORT_TYPE = {
  brand: 36,
  subtitle: 20,
  session: 17,
  participant: 26,
  section: 20,
  panelTitle: 15,
  statLabel: 13,
  statValue: 28,
  highlightTitle: 15,
  highlightPrimary: 16,
  highlightValue: 24,
  highlightSecondary: 13,
  tableHead: 14,
  tableBody: 15,
  tableNum: 16,
  answer: 15,
  answerMeta: 13,
  roundTotal: 22,
  chartAxis: 14,
  chartTick: 13,
  legend: 14,
  caption: 13,
} as const;

export const REPORT_LINE = {
  tight: 1.25,
  normal: 1.45,
} as const;

export function radialTextAnchor(angleRad: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angleRad);
  if (cos > 0.35) return 'start';
  if (cos < -0.35) return 'end';
  return 'middle';
}

export function radialDy(angleRad: number, line: 0 | 1): number {
  const sin = Math.sin(angleRad);
  if (line === 0) {
    if (sin < -0.5) return 5;
    if (sin > 0.5) return -2;
    return 0;
  }
  return 15;
}

export function columnHeader(label: string, points: number): string {
  return `${label}(${points}pt)`;
}

export function highlightLineStyle(
  theme: { headerBg: string; ink: string; inkMuted: string },
  line: string,
  index: number,
  fonts: { serif: string },
): {
  margin: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  color: string;
  fontFamily?: string;
} {
  const trimmed = line.trim();
  const isScore = /^\d+(\.\d+)?pt$/.test(trimmed) || /^\d+位$/.test(trimmed);
  const isMeta =
    trimmed.startsWith('ほか') ||
    trimmed.startsWith('平均') ||
    trimmed.startsWith('標準偏差');

  if (isScore) {
    return {
      margin: index === 0 ? '0' : '5px 0 0',
      fontSize: REPORT_TYPE.highlightValue,
      fontWeight: 800,
      lineHeight: 1.1,
      color: theme.headerBg,
      fontFamily: fonts.serif,
    };
  }
  if (isMeta) {
    return {
      margin: '3px 0 0',
      fontSize: REPORT_TYPE.highlightSecondary,
      fontWeight: 500,
      lineHeight: REPORT_LINE.normal,
      color: theme.inkMuted,
    };
  }
  return {
    margin: index === 0 ? '0' : '3px 0 0',
    fontSize: REPORT_TYPE.highlightPrimary,
    fontWeight: 700,
    lineHeight: REPORT_LINE.tight,
    color: theme.ink,
  };
}
