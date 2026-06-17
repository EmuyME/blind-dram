/** 個人レポート v1 — 1400px 固定キャンバス */

export const PERSONAL_REPORT_WIDTH = 1400;

export const PERSONAL_CANVAS = {
  width: PERSONAL_REPORT_WIDTH,
  bg: '#F7F2E8',
  padding: 48,
  sectionGap: 30,
} as const;

export const PERSONAL_V1 = {
  ink: '#1a1224',
  inkMuted: '#5c4f68',
  inkSoft: '#7a6e88',
  headerBg: '#2D1748',
  headerBgDeep: '#1f0f32',
  headerText: '#ffffff',
  accent: '#c9a24a',
  accentSoft: '#e8d4a8',
  cardBg: '#fffcf7',
  cardBorder: '#ddd0bc',
  rule: '#e2d6c4',
  ruleStrong: '#cfc0a8',
  zebra: '#f8f3ea',
  paperAlt: '#f0e9dc',
  insightGood: '#e8f4ec',
  insightWarn: '#faf0dc',
  barTrack: '#ebe3d4',
} as const;

export const PERSONAL_SHADOW = {
  sheet: '0 4px 24px rgba(45, 23, 72, 0.08), 0 1px 3px rgba(45, 23, 72, 0.06)',
  card: '0 2px 12px rgba(45, 23, 72, 0.07)',
  inset: 'inset 0 1px 0 rgba(255,255,255,0.65)',
} as const;

/** 個人レポート採点セル背景 */
export const PERSONAL_JUDGEMENT_BG = {
  correct: '#DDEEE4',
  partial: '#F6E8B8',
  wrong: '#F1D6D9',
  unjudged: '#E6E6E6',
} as const;
