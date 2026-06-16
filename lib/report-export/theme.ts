import type { Judgement } from '@/lib/report-data/types';

export const REPORT_WIDTH_PX = 1200;
export const REPORT_CAPTURE_PIXEL_RATIO = 2;

export const REPORT_FONTS = {
  serif: 'Georgia, "Times New Roman", "Hiragino Mincho ProN", serif',
  sans: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", "Meiryo", sans-serif',
};

export type ReportThemeId = 'tournament' | 'overall' | 'personal';

export type ReportTheme = {
  id: ReportThemeId;
  headerBg: string;
  headerGradient: string;
  headerText: string;
  accent: string;
  accentLight: string;
  paper: string;
  paperTexture: string;
  paperAlt: string;
  cardBg: string;
  cardBorder: string;
  ink: string;
  inkMuted: string;
  rule: string;
  tableHeadBg: string;
  tableRowAlt: string;
  subtitle: string;
  sectionBar: string;
};

export const REPORT_THEMES: Record<ReportThemeId, ReportTheme> = {
  tournament: {
    id: 'tournament',
    headerBg: '#2c1810',
    headerGradient: 'linear-gradient(165deg, #1f1008 0%, #3d2518 42%, #5c3a24 68%, #2c1810 100%)',
    headerText: '#f8f4ec',
    accent: '#c9a227',
    accentLight: '#e8d5a3',
    paper: '#f8f4ec',
    paperTexture:
      'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(90,60,30,0.02) 3px, rgba(90,60,30,0.02) 4px), linear-gradient(180deg, #faf6ee 0%, #f3ebe0 100%)',
    paperAlt: '#efe6d8',
    cardBg: '#fffdf8',
    cardBorder: '#d4c4a8',
    ink: '#2a1a10',
    inkMuted: '#6b5344',
    rule: '#d9cbb8',
    tableHeadBg: '#3d2518',
    tableRowAlt: '#f5efe4',
    subtitle: '大会レポート（保存用）',
    sectionBar: '#c9a227',
  },
  overall: {
    id: 'overall',
    headerBg: '#143d2b',
    headerGradient: 'linear-gradient(165deg, #0a2418 0%, #1a4d35 45%, #2d6b4a 70%, #143d2b 100%)',
    headerText: '#f5f0e6',
    accent: '#c9a227',
    accentLight: '#d4e8d4',
    paper: '#f6faf7',
    paperTexture:
      'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(20,60,40,0.02) 3px, rgba(20,60,40,0.02) 4px), linear-gradient(180deg, #f8fcf9 0%, #eef5f0 100%)',
    paperAlt: '#e8f2eb',
    cardBg: '#ffffff',
    cardBorder: '#b8d4c0',
    ink: '#142820',
    inkMuted: '#3d5a4a',
    rule: '#b8d0c0',
    tableHeadBg: '#1a4d35',
    tableRowAlt: '#eef5f0',
    subtitle: '全体レポート（分析用）',
    sectionBar: '#c9a227',
  },
  personal: {
    id: 'personal',
    headerBg: '#1a0f2e',
    headerGradient: 'linear-gradient(165deg, #120a20 0%, #2a1848 50%, #1a0f2e 100%)',
    headerText: '#f5f0e6',
    accent: '#c9a227',
    accentLight: '#e8dcc8',
    paper: '#faf7fc',
    paperTexture:
      'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(60,30,80,0.025) 3px, rgba(60,30,80,0.025) 4px), linear-gradient(180deg, #fcf9ff 0%, #f3ecf8 100%)',
    paperAlt: '#f0e8f5',
    cardBg: '#ffffff',
    cardBorder: '#d4c0dc',
    ink: '#1e1028',
    inkMuted: '#5a4868',
    rule: '#d8c8e0',
    tableHeadBg: '#3d2060',
    tableRowAlt: '#f5f0fa',
    subtitle: '個人レポート（共有用）',
    sectionBar: '#c9a227',
  },
};

export const JUDGEMENT_STYLES: Record<
  Judgement,
  { bg: string; border: string; symbol: string; color: string; badgeBg: string }
> = {
  correct: {
    bg: 'rgba(72, 160, 96, 0.14)',
    border: '#4a9e5c',
    symbol: '○',
    color: '#2d6a3e',
    badgeBg: '#4a9e5c',
  },
  partial: {
    bg: 'rgba(220, 180, 60, 0.18)',
    border: '#c9a227',
    symbol: '△',
    color: '#8a6d1a',
    badgeBg: '#c9a227',
  },
  wrong: {
    bg: 'rgba(200, 80, 80, 0.14)',
    border: '#c45a5a',
    symbol: '×',
    color: '#8a2a2a',
    badgeBg: '#c45a5a',
  },
  unjudged: {
    bg: 'rgba(140, 140, 140, 0.1)',
    border: '#999',
    symbol: '—',
    color: '#666',
    badgeBg: '#888',
  },
};

export const CHART_COLORS = [
  '#c9a227',
  '#4a8f6b',
  '#6b5ba8',
  '#c47b5a',
  '#4a7bc4',
  '#8f5a7b',
  '#3aa88a',
  '#a85a5a',
  '#5a5a9f',
  '#7a9a4a',
  '#c45a8f',
  '#4a8fc4',
];

export const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

export function tableFontSize(columnCount: number): number {
  if (columnCount <= 6) return 15;
  if (columnCount <= 8) return 13;
  if (columnCount <= 10) return 12;
  return 11;
}

export function shortName(name: string, max = 7): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
