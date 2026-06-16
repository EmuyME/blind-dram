/**
 * レポート画像用タイポグラフィ（1200px基準・2xキャプチャ想定）
 * 最小本文16px、ラベルと数値のコントラストを強く取る
 */

export const REPORT_SPACE = {
  pageX: 36,
  pageY: 28,
  section: 32,
  block: 18,
  card: 12,
  item: 8,
} as const;

export const REPORT_TYPE = {
  brand: 38,
  subtitle: 22,
  session: 18,
  participant: 28,
  section: 22,
  panelTitle: 17,
  statLabel: 14,
  statValue: 32,
  highlightTitle: 15,
  highlightPrimary: 17,
  highlightValue: 26,
  highlightSecondary: 14,
  tableHead: 15,
  tableBody: 16,
  tableNum: 17,
  answer: 17,
  answerMeta: 13,
  roundTotal: 26,
  chartAxis: 14,
  chartTick: 13,
  legend: 14,
  caption: 13,
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
