/**
 * レポート画像用タイポグラフィ（1200px · 2x PNG）
 */

export const REPORT_SPACE = {
  pageX: 40,
  pageY: 28,
  section: 28,
  block: 16,
  card: 12,
  grid: 12,
} as const;

export const CHART_LABEL_PAD = 64;

export const REPORT_TYPE = {
  brand: 13,
  subtitle: 18,
  session: 15,
  date: 14,
  participant: 24,
  section: 19,
  cardTitle: 14,
  metricLabel: 12,
  metricValue: 26,
  highlightTitle: 13,
  highlightPrimary: 15,
  highlightValue: 22,
  highlightSecondary: 12,
  tableHead: 13,
  tableBody: 14,
  tableNum: 15,
  answer: 14,
  answerMeta: 11,
  roundTotal: 20,
  rankLarge: 28,
  chartAxis: 13,
  chartTick: 12,
  legend: 13,
  caption: 12,
} as const;

export const REPORT_LINE = {
  tight: 1.3,
  normal: 1.5,
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
  return 14;
}

/** 表ヘッダー：カスク（4pt） */
export function columnHeader(label: string, points: number): string {
  return `${label}（${points}pt）`;
}

export function highlightLineStyle(
  theme: { headerBg: string; ink: string; inkMuted: string },
  line: string,
  index: number,
  fonts: { serif: string },
) {
  const trimmed = line.trim();
  const isScore = /^\d+(\.\d+)?pt$/.test(trimmed) || /^\d+位$/.test(trimmed);
  const isMeta =
    trimmed.startsWith('ほか') ||
    trimmed.startsWith('平均') ||
    trimmed.startsWith('標準偏差');

  if (isScore) {
    return {
      margin: index === 0 ? '0' : '6px 0 0',
      fontSize: REPORT_TYPE.highlightValue,
      fontWeight: 800,
      lineHeight: 1.15,
      color: theme.headerBg,
      fontFamily: fonts.serif,
    };
  }
  if (isMeta) {
    return {
      margin: '4px 0 0',
      fontSize: REPORT_TYPE.highlightSecondary,
      fontWeight: 500,
      lineHeight: REPORT_LINE.normal,
      color: theme.inkMuted,
    };
  }
  return {
    margin: index === 0 ? '0' : '4px 0 0',
    fontSize: REPORT_TYPE.highlightPrimary,
    fontWeight: 600,
    lineHeight: REPORT_LINE.tight,
    color: theme.ink,
  };
}

/** 個人レポート回答表の列順 */
export const PERSONAL_ANSWER_COLUMN_ORDER = [
  'cask',
  'region',
  'age',
  'abv',
  'distillery',
  'other1',
  'other2',
] as const;
