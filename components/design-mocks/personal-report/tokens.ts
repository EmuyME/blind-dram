/** 個人レポート静的モック v1 — 1400px 固定キャンバス */

export const CANVAS = {
  width: 1400,
  bg: '#F7F2E8',
  padding: 48,
  sectionGap: 30,
  exportScale: 2,
} as const;

export const COLORS = {
  ink: '#1a1410',
  inkMuted: '#5c4f42',
  inkSoft: '#7a6e60',
  headerBg: '#3d2e1f',
  headerBgDeep: '#2a1f18',
  headerText: '#f4ead8',
  accent: '#c4a574',
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

export const SHADOW = {
  sheet: '0 4px 24px rgba(61, 46, 31, 0.08), 0 1px 3px rgba(61, 46, 31, 0.06)',
  card: '0 2px 12px rgba(61, 46, 31, 0.07)',
  inset: 'inset 0 1px 0 rgba(255,255,255,0.65)',
} as const;

export const JUDGEMENT = {
  correct: { bg: '#DDEEE4', symbol: '○', badge: '#3d8f58' },
  partial: { bg: '#F6E8B8', symbol: '△', badge: '#b8942e' },
  wrong: { bg: '#F1D6D9', symbol: '×', badge: '#b85555' },
  unjudged: { bg: '#E6E6E6', symbol: '—', badge: '#888888' },
} as const;

export const FONT = {
  sans: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", sans-serif',
  serif: 'Georgia, "Times New Roman", "Hiragino Mincho ProN", serif',
} as const;
