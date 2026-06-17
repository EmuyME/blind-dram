import type { Judgement } from '@/lib/report-data/types';
import {
  shortName as layoutShortName,
  tableFontSize as layoutTableFontSize,
} from '@/lib/report-export/layout-scale';

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
  headerBand: string;
  headerText: string;
  accent: string;
  accentMuted: string;
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
};

const GOLD = '#b8942e';

export const REPORT_THEMES: Record<ReportThemeId, ReportTheme> = {
  tournament: {
    id: 'tournament',
    headerBg: '#1c2d4a',
    headerBand: 'linear-gradient(135deg, #152238 0%, #1c2d4a 55%, #243a5c 100%)',
    headerText: '#f5f0e8',
    accent: GOLD,
    accentMuted: '#d4bc7a',
    paper: '#faf7f2',
    paperTexture: 'linear-gradient(180deg, #fcfaf6 0%, #f5f0e8 100%)',
    paperAlt: '#f0ebe3',
    cardBg: '#ffffff',
    cardBorder: 'rgba(28, 45, 74, 0.12)',
    ink: '#1a2230',
    inkMuted: '#5a6472',
    rule: 'rgba(28, 45, 74, 0.1)',
    tableHeadBg: '#1c2d4a',
    tableRowAlt: 'rgba(28, 45, 74, 0.03)',
    subtitle: '大会レポート',
  },
  overall: {
    id: 'overall',
    headerBg: '#1a4030',
    headerBand: 'linear-gradient(135deg, #122a1e 0%, #1a4030 55%, #245a42 100%)',
    headerText: '#f5f0e8',
    accent: GOLD,
    accentMuted: '#c8d4bc',
    paper: '#f6faf7',
    paperTexture: 'linear-gradient(180deg, #f9fcfa 0%, #eef5f0 100%)',
    paperAlt: '#e6f0ea',
    cardBg: '#ffffff',
    cardBorder: 'rgba(26, 64, 48, 0.12)',
    ink: '#142820',
    inkMuted: '#4a6258',
    rule: 'rgba(26, 64, 48, 0.1)',
    tableHeadBg: '#1a4030',
    tableRowAlt: 'rgba(26, 64, 48, 0.04)',
    subtitle: '全体レポート',
  },
  personal: {
    id: 'personal',
    headerBg: '#2d1f4a',
    headerBand: 'linear-gradient(135deg, #1f1435 0%, #2d1f4a 55%, #3d2d62 100%)',
    headerText: '#f5f0e8',
    accent: GOLD,
    accentMuted: '#d4c8e0',
    paper: '#faf8fc',
    paperTexture: 'linear-gradient(180deg, #fdfbfe 0%, #f3eef8 100%)',
    paperAlt: '#ece6f2',
    cardBg: '#ffffff',
    cardBorder: 'rgba(45, 31, 74, 0.12)',
    ink: '#1e1428',
    inkMuted: '#5c5070',
    rule: 'rgba(45, 31, 74, 0.1)',
    tableHeadBg: '#2d1f4a',
    tableRowAlt: 'rgba(45, 31, 74, 0.04)',
    subtitle: '個人レポート',
  },
};

export const JUDGEMENT_STYLES: Record<
  Judgement,
  { bg: string; symbol: string; badgeBg: string }
> = {
  correct: { bg: 'rgba(72, 155, 95, 0.16)', symbol: '○', badgeBg: '#3d8f58' },
  partial: { bg: 'rgba(210, 175, 55, 0.2)', symbol: '△', badgeBg: '#b8942e' },
  wrong: { bg: 'rgba(195, 85, 85, 0.14)', symbol: '×', badgeBg: '#b85555' },
  unjudged: { bg: 'rgba(130, 130, 130, 0.1)', symbol: '—', badgeBg: '#888' },
};

export const CHART_COLORS = [
  '#b8942e',
  '#3d8f6b',
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

export function tableFontSize(columnCount: number, rowCount?: number): number {
  return layoutTableFontSize(columnCount, rowCount ?? 1);
}

export function shortName(name: string, max = 7): string {
  return layoutShortName(name, max);
}
