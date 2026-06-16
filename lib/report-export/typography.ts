/** レポート画像用タイポグラフィ・スペーシング */

export const REPORT_SPACE = {
  pageX: 40,
  pageY: 32,
  section: 28,
  block: 20,
  card: 14,
  item: 10,
  tight: 6,
} as const;

export const REPORT_TYPE = {
  brand: 30,
  subtitle: 19,
  session: 16,
  participant: 24,
  section: 17,
  panelTitle: 14,
  statLabel: 12,
  statValue: 22,
  highlightTitle: 12,
  highlightPrimary: 15,
  highlightSecondary: 13,
  tableHead: 12,
  tableBody: 13,
  tableDense: 11,
  tableNum: 14,
  answer: 15,
  answerMeta: 11,
  roundTotal: 20,
  chartAxis: 11,
  chartTick: 10,
  legend: 12,
  caption: 11,
} as const;

export const REPORT_LINE = {
  tight: 1.25,
  normal: 1.45,
  relaxed: 1.6,
} as const;

/** ラベル位置（レーダー等） */
export function radialTextAnchor(angleRad: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angleRad);
  if (cos > 0.35) return 'start';
  if (cos < -0.35) return 'end';
  return 'middle';
}

export function radialDy(angleRad: number, line: 0 | 1): number {
  const sin = Math.sin(angleRad);
  if (line === 0) {
    if (sin < -0.5) return 4;
    if (sin > 0.5) return -2;
    return 0;
  }
  return 14;
}
