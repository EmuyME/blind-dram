/**
 * レポート画像用タイポグラフィ（1200px基準・2xキャプチャ想定）
 *
 * 原則:
 * - 本文は最小 15px（キャプチャ後も読めるサイズ）
 * - ラベルと数値はサイズ・ウェイトで明確に差をつける
 * - カード・パネル内は中央揃えで余白の偏りを防ぐ
 * - チャートはラベル用パディングを確保し文字切れを防ぐ
 */

export const REPORT_SPACE = {
  pageX: 36,
  pageY: 28,
  section: 28,
  block: 16,
  card: 10,
  item: 8,
  grid: 12,
} as const;

/** チャート共通：軸ラベルが切れないよう SVG 外周に確保する余白 */
export const CHART_LABEL_PAD = 56;

export const REPORT_TYPE = {
  brand: 38,
  subtitle: 22,
  session: 18,
  participant: 28,
  section: 22,
  panelTitle: 16,
  statLabel: 14,
  statValue: 30,
  highlightTitle: 15,
  highlightPrimary: 17,
  highlightValue: 26,
  highlightSecondary: 14,
  tableHead: 15,
  tableBody: 16,
  tableNum: 17,
  answer: 16,
  answerMeta: 14,
  roundTotal: 24,
  chartAxis: 15,
  chartTick: 14,
  legend: 15,
  caption: 14,
} as const;

export const REPORT_LINE = {
  tight: 1.2,
  normal: 1.4,
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
  return 16;
}

/** 表ヘッダー用：1行で「地域(4pt)」 */
export function columnHeader(label: string, points: number): string {
  return `${label}(${points}pt)`;
}

/** ハイライトカードの行スタイル（得点・補足・本文を自動判別） */
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
  const isScore = /^\d+(\.\d+)?pt$/.test(trimmed);
  const isMeta =
    trimmed.startsWith('ほか') ||
    trimmed.startsWith('平均') ||
    trimmed.startsWith('標準偏差');

  if (isScore) {
    return {
      margin: index === 0 ? '0' : '6px 0 0',
      fontSize: REPORT_TYPE.highlightValue,
      fontWeight: 800,
      lineHeight: 1.1,
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
    fontWeight: 700,
    lineHeight: REPORT_LINE.tight,
    color: theme.ink,
  };
}
