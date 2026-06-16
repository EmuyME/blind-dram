import type { Judgement } from '@/lib/report-data/types';

export const REPORT_WIDTH_PX = 1200;
export const REPORT_CAPTURE_PIXEL_RATIO = 2;

export type ReportThemeId = 'tournament' | 'overall' | 'personal';

export type ReportTheme = {
  id: ReportThemeId;
  headerBg: string;
  headerText: string;
  accent: string;
  accentLight: string;
  paper: string;
  paperAlt: string;
  ink: string;
  inkMuted: string;
  rule: string;
  tableHeadBg: string;
  subtitle: string;
};

export const REPORT_THEMES: Record<ReportThemeId, ReportTheme> = {
  tournament: {
    id: 'tournament',
    headerBg: '#1a2744',
    headerText: '#f5f0e6',
    accent: '#c4a574',
    accentLight: '#e8dcc8',
    paper: '#faf7f0',
    paperAlt: '#f0ebe0',
    ink: '#1e2433',
    inkMuted: '#4a5568',
    rule: '#c9b896',
    tableHeadBg: '#2a3a5c',
    subtitle: '大会レポート（保存用）',
  },
  overall: {
    id: 'overall',
    headerBg: '#1a3d2e',
    headerText: '#f5f0e6',
    accent: '#8fbc8f',
    accentLight: '#c8e6c9',
    paper: '#f5faf7',
    paperAlt: '#e8f0eb',
    ink: '#1a2e24',
    inkMuted: '#3d5a4a',
    rule: '#a8c4b0',
    tableHeadBg: '#245a42',
    subtitle: '全体レポート（分析用）',
  },
  personal: {
    id: 'personal',
    headerBg: '#3d1a44',
    headerText: '#f5f0e6',
    accent: '#c4a574',
    accentLight: '#e8dcc8',
    paper: '#faf5fc',
    paperAlt: '#f0e8f2',
    ink: '#2a1a2e',
    inkMuted: '#5a4a5e',
    rule: '#c4a8c8',
    tableHeadBg: '#5a2a64',
    subtitle: '個人レポート（共有用）',
  },
};

export const JUDGEMENT_STYLES: Record<
  Judgement,
  { bg: string; symbol: string; color: string }
> = {
  correct: { bg: 'rgba(72, 160, 96, 0.22)', symbol: '○', color: '#2d6a3e' },
  partial: { bg: 'rgba(220, 180, 60, 0.28)', symbol: '△', color: '#8a6d1a' },
  wrong: { bg: 'rgba(200, 80, 80, 0.2)', symbol: '×', color: '#8a2a2a' },
  unjudged: { bg: 'rgba(140, 140, 140, 0.15)', symbol: '—', color: '#666' },
};

export const CHART_COLORS = [
  '#c4a574',
  '#5a8f7b',
  '#7b6ba8',
  '#c47b5a',
  '#5a7bc4',
  '#8f5a7b',
  '#5ac4a5',
  '#a85a5a',
  '#5a5a8f',
  '#8fa85a',
  '#c45a8f',
  '#5a8fc4',
];

export function tableFontSize(columnCount: number): number {
  if (columnCount <= 6) return 16;
  if (columnCount <= 8) return 14;
  if (columnCount <= 10) return 12;
  return 11;
}

export function shortName(name: string, max = 7): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
