/**
 * 個人レポート v1 — 部門数・ラウンド数・列数に応じたレイアウトスケール
 */

export function personalAnalysisAreaHeight(categoryCount: number): number {
  const titleAndPad = 76;
  const gap = categoryCount > 6 ? 8 : 11;
  const barH = categoryCount <= 4 ? 42 : categoryCount <= 6 ? 38 : categoryCount <= 8 ? 34 : 30;
  const chartBody = categoryCount * barH + gap * Math.max(0, categoryCount - 1);
  const needed = titleAndPad + chartBody + 24;
  return Math.min(560, Math.max(360, needed));
}

export function personalCategoryChartLayout(categoryCount: number) {
  const areaH = personalAnalysisAreaHeight(categoryCount);
  const chartH = areaH - 76;
  const gap = categoryCount > 6 ? 8 : categoryCount > 4 ? 10 : 11;
  const barH = Math.min(46, Math.max(28, Math.floor((chartH - gap * Math.max(0, categoryCount - 1)) / Math.max(1, categoryCount))));
  const labelFont = categoryCount > 7 ? 12 : categoryCount > 5 ? 13 : 14;
  const valueFont = categoryCount > 7 ? 14 : categoryCount > 5 ? 15 : 16;
  const scoreFont = categoryCount > 6 ? 11 : 12;
  const labelCol = categoryCount > 7 ? 68 : categoryCount > 5 ? 76 : 84;
  const rateCol = categoryCount > 6 ? 40 : 44;

  return { chartH, gap, barH, labelFont, valueFont, scoreFont, labelCol, rateCol };
}

export function personalTableLayout(roundCount: number, scoringColumnCount: number) {
  const columnCount = 3 + scoringColumnCount + 1;
  let rowH = 88;
  if (roundCount > 10) rowH = 80;
  if (roundCount > 14) rowH = 72;
  if (roundCount > 20) rowH = 64;

  let answerFs = 16;
  let metaFs = 12;
  let headFs = 14;
  let headPtsFs = 12;
  let sampleFs = 15;
  let noFs = 17;
  let totalFs = 28;

  if (scoringColumnCount > 5) {
    answerFs = 15;
    headFs = 13;
    headPtsFs = 11;
  }
  if (scoringColumnCount > 6) {
    answerFs = 14;
    metaFs = 11;
    sampleFs = 14;
    totalFs = 24;
  }
  if (roundCount > 10) {
    answerFs -= 1;
    totalFs = Math.max(20, totalFs - 2);
    noFs = 15;
  }
  if (roundCount > 14) {
    answerFs = Math.max(12, answerFs - 1);
    metaFs = Math.max(10, metaFs - 1);
    rowH = 72;
    totalFs = 20;
  }

  let padding: string;
  if (columnCount > 10 || roundCount > 14) padding = '8px 5px';
  else if (columnCount > 8 || roundCount > 10) padding = '10px 7px';
  else padding = '12px 10px';

  const scorePadRight = scoringColumnCount > 6 ? 32 : 38;
  const badgeSize = scoringColumnCount > 6 ? 20 : 22;

  return {
    rowH,
    answerFs: Math.max(12, answerFs),
    metaFs: Math.max(10, metaFs),
    headFs: Math.max(12, headFs),
    headPtsFs: Math.max(10, headPtsFs),
    sampleFs,
    noFs,
    totalFs,
    padding,
    scorePadRight,
    badgeSize,
    columnCount,
  };
}

export function personalRoundTableColWidths(scoringColumnCount: number): string[] {
  const fixed = ['4%', '9%', '8%'];
  const totalPct = scoringColumnCount > 6 ? 8 : 9;
  const remaining = 100 - 4 - 9 - 8 - totalPct;
  const perItem = scoringColumnCount > 0 ? remaining / scoringColumnCount : 0;
  const itemCols = Array.from({ length: scoringColumnCount }, () => `${perItem.toFixed(2)}%`);
  return [...fixed, ...itemCols, `${totalPct}%`];
}

export function personalInsightCardLayout(categoryCount: number) {
  const compact = categoryCount > 6;
  return {
    titleFs: compact ? 11 : 12,
    labelFs: compact ? 16 : 18,
    rateFs: compact ? 17 : 20,
    padding: compact ? '10px 12px' : '14px 16px',
  };
}

export function personalBottleCardLayout(analysisHeight: number) {
  const compact = analysisHeight > 440;
  return {
    titleFs: compact ? 13 : 14,
    nameFs: compact ? 17 : 20,
    scoreFs: compact ? 24 : 28,
    scoreUnitFs: compact ? 14 : 16,
  };
}
