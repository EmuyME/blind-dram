'use client';

import { useState } from 'react';
import Link from 'next/link';

type PaletteId =
  | 'amber'
  | 'sherry'
  | 'islay'
  | 'speyside'
  | 'ivory'
  | 'heather'
  | 'bourbon'
  | 'copper'
  | 'glen'
  | 'champagne'
  | 'neon'
  | 'swiss'
  | 'sakura'
  | 'arctic'
  | 'terracotta'
  | 'sumi'
  | 'terminal'
  | 'coral'
  | 'dusk'
  | 'lumen';

type PaletteGroup = 'classic' | 'bold';

type PaletteToken = {
  name: string;
  hex: string;
  usage: string;
};

type Palette = {
  id: PaletteId;
  group: PaletteGroup;
  title: string;
  subtitle: string;
  mood: string;
  tokens: PaletteToken[];
  preview: {
    bg: string;
    bgGlow?: string;
    surface: string;
    surfaceBorder: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;
    accentHover: string;
    secondary: string;
    phase: { registering: string; running: string; published: string };
  };
};

const PALETTES: Palette[] = [
  {
    id: 'amber',
    group: 'classic',
    title: 'Amber Bar',
    subtitle: '現行ベースの洗練版',
    mood: 'バーカウンター、琥珀色の液体、夜の落ち着き',
    tokens: [
      { name: 'Background', hex: '#171717', usage: 'ページ背景' },
      { name: 'Surface', hex: '#262626', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#C88A2B', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#D79A3D', usage: 'ホバー' },
      { name: 'Text', hex: '#F5F5F4', usage: '見出し・本文' },
      { name: 'Muted', hex: '#A8A29E', usage: '補足テキスト' },
      { name: 'Border', hex: 'rgba(255,255,255,0.10)', usage: '区切り線' },
      { name: 'Glow', hex: 'rgba(200,138,43,0.14)', usage: '背景グラデーション' },
    ],
    preview: {
      bg: '#171717',
      bgGlow: 'radial-gradient(900px at 20% -5%, rgba(200,138,43,0.16), transparent 50%)',
      surface: '#262626',
      surfaceBorder: 'rgba(255,255,255,0.10)',
      text: '#F5F5F4',
      textMuted: '#A8A29E',
      accent: '#C88A2B',
      accentText: 'rgba(0,0,0,0.88)',
      accentHover: '#D79A3D',
      secondary: '#404040',
      phase: { registering: '#38bdf8', running: '#C88A2B', published: '#7dd3fc' },
    },
  },
  {
    id: 'sherry',
    group: 'classic',
    title: 'Sherry Cask',
    subtitle: 'シェリー樽熟成の深紅',
    mood: 'ワイン系の赤、重厚、結果発表のドラマ',
    tokens: [
      { name: 'Background', hex: '#1A0F12', usage: 'ページ背景' },
      { name: 'Surface', hex: '#2A161C', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#B84A52', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#CF5A63', usage: 'ホバー' },
      { name: 'Text', hex: '#F5ECE8', usage: '見出し・本文' },
      { name: 'Muted', hex: '#B89A94', usage: '補足テキスト' },
      { name: 'Highlight', hex: '#D4A853', usage: '順位・スコア強調' },
      { name: 'Border', hex: 'rgba(255,200,180,0.12)', usage: '区切り線' },
    ],
    preview: {
      bg: '#1A0F12',
      bgGlow: 'radial-gradient(800px at 80% 0%, rgba(184,74,82,0.12), transparent 55%)',
      surface: '#2A161C',
      surfaceBorder: 'rgba(255,200,180,0.12)',
      text: '#F5ECE8',
      textMuted: '#B89A94',
      accent: '#B84A52',
      accentText: '#FFF5F3',
      accentHover: '#CF5A63',
      secondary: '#3D2228',
      phase: { registering: '#E879A9', running: '#B84A52', published: '#D4A853' },
    },
  },
  {
    id: 'islay',
    group: 'classic',
    title: 'Islay Smoke',
    subtitle: 'ピートと潮風',
    mood: 'スモーキー、クール、ミネラル感。個性的で記憶に残る',
    tokens: [
      { name: 'Background', hex: '#0F1418', usage: 'ページ背景' },
      { name: 'Surface', hex: '#1A2228', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#6B9E8A', usage: 'Primary ボタン（ピート緑）' },
      { name: 'Accent Hover', hex: '#7CB39C', usage: 'ホバー' },
      { name: 'Text', hex: '#E8EDEF', usage: '見出し・本文' },
      { name: 'Muted', hex: '#8A9BA3', usage: '補足テキスト' },
      { name: 'Secondary', hex: '#4A6B7C', usage: 'リンク・バッジ' },
      { name: 'Border', hex: 'rgba(180,210,220,0.10)', usage: '区切り線' },
    ],
    preview: {
      bg: '#0F1418',
      bgGlow: 'radial-gradient(700px at 10% 100%, rgba(74,107,124,0.18), transparent 50%)',
      surface: '#1A2228',
      surfaceBorder: 'rgba(180,210,220,0.10)',
      text: '#E8EDEF',
      textMuted: '#8A9BA3',
      accent: '#6B9E8A',
      accentText: '#0F1418',
      accentHover: '#7CB39C',
      secondary: '#4A6B7C',
      phase: { registering: '#64748b', running: '#6B9E8A', published: '#94A3B8' },
    },
  },
  {
    id: 'speyside',
    group: 'classic',
    title: 'Speyside Malt',
    subtitle: '麦芽と蜂蜜',
    mood: '温かみ、フレンドリー、初心者にも優しい',
    tokens: [
      { name: 'Background', hex: '#1C1814', usage: 'ページ背景' },
      { name: 'Surface', hex: '#2C241C', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#C9952A', usage: 'Primary ボタン（蜂蜜）' },
      { name: 'Accent Hover', hex: '#DBA83A', usage: 'ホバー' },
      { name: 'Text', hex: '#F7F0E6', usage: '見出し・本文' },
      { name: 'Muted', hex: '#B5A48E', usage: '補足テキスト' },
      { name: 'Green', hex: '#5C7A52', usage: '成功・完了状態' },
      { name: 'Border', hex: 'rgba(230,210,170,0.12)', usage: '区切り線' },
    ],
    preview: {
      bg: '#1C1814',
      bgGlow: 'radial-gradient(900px at 50% -10%, rgba(201,149,42,0.12), transparent 45%)',
      surface: '#2C241C',
      surfaceBorder: 'rgba(230,210,170,0.12)',
      text: '#F7F0E6',
      textMuted: '#B5A48E',
      accent: '#C9952A',
      accentText: 'rgba(20,15,8,0.9)',
      accentHover: '#DBA83A',
      secondary: '#5C7A52',
      phase: { registering: '#7BA3C4', running: '#C9952A', published: '#5C7A52' },
    },
  },
  {
    id: 'ivory',
    group: 'classic',
    title: 'Tasting Room Ivory',
    subtitle: '明るいテイスティングルーム',
    mood: '紙のノート、昼間の会、清潔感。ダークUIからの大きな転換',
    tokens: [
      { name: 'Background', hex: '#F5F0E6', usage: 'ページ背景' },
      { name: 'Surface', hex: '#FFFFFF', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#9A5C1A', usage: 'Primary ボタン（銅）' },
      { name: 'Accent Hover', hex: '#B06E22', usage: 'ホバー' },
      { name: 'Text', hex: '#2C241C', usage: '見出し・本文' },
      { name: 'Muted', hex: '#7A6E62', usage: '補足テキスト' },
      { name: 'Ink', hex: '#3D3228', usage: '強調・見出し' },
      { name: 'Border', hex: 'rgba(60,50,40,0.12)', usage: '区切り線' },
    ],
    preview: {
      bg: '#F5F0E6',
      bgGlow: 'radial-gradient(600px at 100% 0%, rgba(154,92,26,0.08), transparent 50%)',
      surface: '#FFFFFF',
      surfaceBorder: 'rgba(60,50,40,0.12)',
      text: '#2C241C',
      textMuted: '#7A6E62',
      accent: '#9A5C1A',
      accentText: '#FFFDF9',
      accentHover: '#B06E22',
      secondary: '#E8E0D4',
      phase: { registering: '#2563EB', running: '#9A5C1A', published: '#15803D' },
    },
  },
  {
    id: 'heather',
    group: 'classic',
    title: 'Highland Heather',
    subtitle: 'ヘザーと高原の霧',
    mood: 'ハイランドの夕暮れ、ラベンダー、静かな高級感',
    tokens: [
      { name: 'Background', hex: '#16141C', usage: 'ページ背景' },
      { name: 'Surface', hex: '#242030', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#9B7BB8', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#B094CC', usage: 'ホバー' },
      { name: 'Text', hex: '#F0ECF5', usage: '見出し・本文' },
      { name: 'Muted', hex: '#9A94A8', usage: '補足テキスト' },
      { name: 'Mist', hex: '#6B6580', usage: '区切り・非アクティブ' },
      { name: 'Border', hex: 'rgba(200,180,230,0.12)', usage: '区切り線' },
    ],
    preview: {
      bg: '#16141C',
      bgGlow: 'radial-gradient(800px at 30% 0%, rgba(155,123,184,0.14), transparent 50%)',
      surface: '#242030',
      surfaceBorder: 'rgba(200,180,230,0.12)',
      text: '#F0ECF5',
      textMuted: '#9A94A8',
      accent: '#9B7BB8',
      accentText: '#16141C',
      accentHover: '#B094CC',
      secondary: '#3A3548',
      phase: { registering: '#7BA3C4', running: '#9B7BB8', published: '#C4B5D8' },
    },
  },
  {
    id: 'bourbon',
    group: 'classic',
    title: 'Bourbon Oak',
    subtitle: 'バーボン樽の焦げとキャラメル',
    mood: 'アメリカンオーク、焦げ目、甘いオレンジ。エネルギッシュ',
    tokens: [
      { name: 'Background', hex: '#14100C', usage: 'ページ背景' },
      { name: 'Surface', hex: '#221A14', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#D4782C', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#E88A3A', usage: 'ホバー' },
      { name: 'Text', hex: '#F5EDE4', usage: '見出し・本文' },
      { name: 'Muted', hex: '#A89480', usage: '補足テキスト' },
      { name: 'Char', hex: '#2A2018', usage: 'Secondary ボタン' },
      { name: 'Border', hex: 'rgba(240,200,150,0.10)', usage: '区切り線' },
    ],
    preview: {
      bg: '#14100C',
      bgGlow: 'radial-gradient(850px at 70% -5%, rgba(212,120,44,0.15), transparent 48%)',
      surface: '#221A14',
      surfaceBorder: 'rgba(240,200,150,0.10)',
      text: '#F5EDE4',
      textMuted: '#A89480',
      accent: '#D4782C',
      accentText: '#14100C',
      accentHover: '#E88A3A',
      secondary: '#2A2018',
      phase: { registering: '#60A5FA', running: '#D4782C', published: '#FBBF24' },
    },
  },
  {
    id: 'copper',
    group: 'classic',
    title: 'Coppersmith',
    subtitle: '蒸溜器の銅色',
    mood: '蒸溜所、金属の温かみ、クラフト感。工業×エレガント',
    tokens: [
      { name: 'Background', hex: '#121110', usage: 'ページ背景' },
      { name: 'Surface', hex: '#1E1C1A', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#B87333', usage: 'Primary ボタン（銅）' },
      { name: 'Accent Hover', hex: '#CC8444', usage: 'ホバー' },
      { name: 'Text', hex: '#EDEAE6', usage: '見出し・本文' },
      { name: 'Muted', hex: '#9C9590', usage: '補足テキスト' },
      { name: 'Patina', hex: '#4A6B5C', usage: '成功・完了（緑青錆）' },
      { name: 'Border', hex: 'rgba(220,180,140,0.11)', usage: '区切り線' },
    ],
    preview: {
      bg: '#121110',
      bgGlow: 'radial-gradient(700px at 50% 100%, rgba(184,115,51,0.12), transparent 50%)',
      surface: '#1E1C1A',
      surfaceBorder: 'rgba(220,180,140,0.11)',
      text: '#EDEAE6',
      textMuted: '#9C9590',
      accent: '#B87333',
      accentText: '#121110',
      accentHover: '#CC8444',
      secondary: '#2A2824',
      phase: { registering: '#78716C', running: '#B87333', published: '#4A6B5C' },
    },
  },
  {
    id: 'glen',
    group: 'classic',
    title: 'Midnight Glen',
    subtitle: '深夜の渓谷',
    mood: '深い森、月光、静寂。集中してテイスティングに向き合う',
    tokens: [
      { name: 'Background', hex: '#0A120E', usage: 'ページ背景' },
      { name: 'Surface', hex: '#142018', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#3D7A5C', usage: 'Primary ボタン（深緑）' },
      { name: 'Accent Hover', hex: '#4A9068', usage: 'ホバー' },
      { name: 'Text', hex: '#E4EBE6', usage: '見出し・本文' },
      { name: 'Muted', hex: '#849A8C', usage: '補足テキスト' },
      { name: 'Moonlight', hex: '#C0C8C4', usage: '強調・スコア' },
      { name: 'Border', hex: 'rgba(160,200,170,0.10)', usage: '区切り線' },
    ],
    preview: {
      bg: '#0A120E',
      bgGlow: 'radial-gradient(900px at 0% 50%, rgba(61,122,92,0.10), transparent 55%)',
      surface: '#142018',
      surfaceBorder: 'rgba(160,200,170,0.10)',
      text: '#E4EBE6',
      textMuted: '#849A8C',
      accent: '#3D7A5C',
      accentText: '#E4EBE6',
      accentHover: '#4A9068',
      secondary: '#1A2820',
      phase: { registering: '#64748B', running: '#3D7A5C', published: '#C0C8C4' },
    },
  },
  {
    id: 'champagne',
    group: 'classic',
    title: 'Champagne Finish',
    subtitle: '乾杯と結果発表',
    mood: 'ネイビー×シャンパンゴールド。クライマックス・祝福の色',
    tokens: [
      { name: 'Background', hex: '#0C1220', usage: 'ページ背景' },
      { name: 'Surface', hex: '#151D2E', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#E8C872', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#F0D484', usage: 'ホバー' },
      { name: 'Text', hex: '#F5F3EE', usage: '見出し・本文' },
      { name: 'Muted', hex: '#94A0B8', usage: '補足テキスト' },
      { name: 'Navy Deep', hex: '#080E18', usage: 'フッター・バナー' },
      { name: 'Border', hex: 'rgba(232,200,114,0.15)', usage: '区切り線' },
    ],
    preview: {
      bg: '#0C1220',
      bgGlow: 'radial-gradient(800px at 50% -10%, rgba(232,200,114,0.10), transparent 45%)',
      surface: '#151D2E',
      surfaceBorder: 'rgba(232,200,114,0.15)',
      text: '#F5F3EE',
      textMuted: '#94A0B8',
      accent: '#E8C872',
      accentText: '#0C1220',
      accentHover: '#F0D484',
      secondary: '#1E2840',
      phase: { registering: '#6366F1', running: '#E8C872', published: '#FDE68A' },
    },
  },
  // ── Bold / 現状に囚われない10案 ──
  {
    id: 'neon',
    group: 'bold',
    title: 'Neon Distillery',
    subtitle: 'サイバーパンク蒸溜所',
    mood: '真っ黒にシアンとマゼンタ。クラブ×SF。若者向けイベント向け',
    tokens: [
      { name: 'Background', hex: '#07070C', usage: 'ページ背景' },
      { name: 'Surface', hex: '#12121A', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#00E5FF', usage: 'Primary ボタン' },
      { name: 'Accent 2', hex: '#FF006E', usage: 'Secondary・強調' },
      { name: 'Text', hex: '#F0F4FF', usage: '見出し・本文' },
      { name: 'Muted', hex: '#6B7280', usage: '補足テキスト' },
      { name: 'Glow', hex: 'rgba(0,229,255,0.20)', usage: 'ネオン発光' },
      { name: 'Border', hex: 'rgba(0,229,255,0.25)', usage: '区切り線' },
    ],
    preview: {
      bg: '#07070C',
      bgGlow: 'radial-gradient(600px at 50% 0%, rgba(0,229,255,0.18), transparent 50%), radial-gradient(400px at 100% 100%, rgba(255,0,110,0.12), transparent 45%)',
      surface: '#12121A',
      surfaceBorder: 'rgba(0,229,255,0.25)',
      text: '#F0F4FF',
      textMuted: '#6B7280',
      accent: '#00E5FF',
      accentText: '#07070C',
      accentHover: '#33EEFF',
      secondary: '#1A1020',
      phase: { registering: '#FF006E', running: '#00E5FF', published: '#BF5AF2' },
    },
  },
  {
    id: 'swiss',
    group: 'bold',
    title: 'Swiss Signal',
    subtitle: '白黒＋赤一点',
    mood: 'スイスのグラフィックデザイン。情報設計が際立つブルータリズム',
    tokens: [
      { name: 'Background', hex: '#F5F5F5', usage: 'ページ背景' },
      { name: 'Surface', hex: '#FFFFFF', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#E60012', usage: 'Primary ボタン（唯一の色）' },
      { name: 'Accent Hover', hex: '#CC0010', usage: 'ホバー' },
      { name: 'Text', hex: '#111111', usage: '見出し・本文' },
      { name: 'Muted', hex: '#666666', usage: '補足テキスト' },
      { name: 'Grid', hex: '#E0E0E0', usage: '罫線・区切り' },
      { name: 'Border', hex: '#111111', usage: '強調ボーダー' },
    ],
    preview: {
      bg: '#F5F5F5',
      bgGlow: undefined,
      surface: '#FFFFFF',
      surfaceBorder: '#111111',
      text: '#111111',
      textMuted: '#666666',
      accent: '#E60012',
      accentText: '#FFFFFF',
      accentHover: '#CC0010',
      secondary: '#EEEEEE',
      phase: { registering: '#111111', running: '#E60012', published: '#111111' },
    },
  },
  {
    id: 'sakura',
    group: 'bold',
    title: 'Sakura Blush',
    subtitle: '桜と灰釉',
    mood: '日本酒・和菓子のような柔らかさ。女性参加者が多い会向け',
    tokens: [
      { name: 'Background', hex: '#F9F4F2', usage: 'ページ背景' },
      { name: 'Surface', hex: '#FFFBFA', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#C9738A', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#D8889C', usage: 'ホバー' },
      { name: 'Text', hex: '#3D3335', usage: '見出し・本文' },
      { name: 'Muted', hex: '#9A8588', usage: '補足テキスト' },
      { name: 'Blush', hex: '#F2D4DC', usage: 'バッジ・背景' },
      { name: 'Border', hex: 'rgba(201,115,138,0.20)', usage: '区切り線' },
    ],
    preview: {
      bg: '#F9F4F2',
      bgGlow: 'radial-gradient(500px at 80% 20%, rgba(242,212,220,0.6), transparent 55%)',
      surface: '#FFFBFA',
      surfaceBorder: 'rgba(201,115,138,0.20)',
      text: '#3D3335',
      textMuted: '#9A8588',
      accent: '#C9738A',
      accentText: '#FFFBFA',
      accentHover: '#D8889C',
      secondary: '#F2D4DC',
      phase: { registering: '#8BA4B4', running: '#C9738A', published: '#7A9E7E' },
    },
  },
  {
    id: 'arctic',
    group: 'bold',
    title: 'Arctic Glass',
    subtitle: '氷とガラス',
    mood: '北欧ミニマル、透明感、冷静な判断力。スコア入力に向く',
    tokens: [
      { name: 'Background', hex: '#EEF6FA', usage: 'ページ背景' },
      { name: 'Surface', hex: '#FFFFFF', usage: 'カード（ガラス風）' },
      { name: 'Accent', hex: '#0077B6', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#0096C7', usage: 'ホバー' },
      { name: 'Text', hex: '#1A3340', usage: '見出し・本文' },
      { name: 'Muted', hex: '#5C7A88', usage: '補足テキスト' },
      { name: 'Ice', hex: '#CAE8F5', usage: 'ハイライト背景' },
      { name: 'Border', hex: 'rgba(0,119,182,0.15)', usage: '区切り線' },
    ],
    preview: {
      bg: '#EEF6FA',
      bgGlow: 'radial-gradient(700px at 0% 100%, rgba(202,232,245,0.8), transparent 50%)',
      surface: '#FFFFFF',
      surfaceBorder: 'rgba(0,119,182,0.15)',
      text: '#1A3340',
      textMuted: '#5C7A88',
      accent: '#0077B6',
      accentText: '#FFFFFF',
      accentHover: '#0096C7',
      secondary: '#CAE8F5',
      phase: { registering: '#48CAE4', running: '#0077B6', published: '#2A9D8F' },
    },
  },
  {
    id: 'terracotta',
    group: 'bold',
    title: 'Terracotta Sun',
    subtitle: '南欧の土と日差し',
    mood: 'テラコッタ、オリーブ、夏のテラス。陽気で開放的',
    tokens: [
      { name: 'Background', hex: '#FAF0E4', usage: 'ページ背景' },
      { name: 'Surface', hex: '#FFF8F0', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#C45C3E', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#D46E50', usage: 'ホバー' },
      { name: 'Text', hex: '#2D1810', usage: '見出し・本文' },
      { name: 'Muted', hex: '#8A6A58', usage: '補足テキスト' },
      { name: 'Olive', hex: '#6B7A4A', usage: '成功・完了' },
      { name: 'Border', hex: 'rgba(196,92,62,0.18)', usage: '区切り線' },
    ],
    preview: {
      bg: '#FAF0E4',
      bgGlow: 'radial-gradient(600px at 100% 0%, rgba(255,200,120,0.25), transparent 50%)',
      surface: '#FFF8F0',
      surfaceBorder: 'rgba(196,92,62,0.18)',
      text: '#2D1810',
      textMuted: '#8A6A58',
      accent: '#C45C3E',
      accentText: '#FFF8F0',
      accentHover: '#D46E50',
      secondary: '#F0E0CC',
      phase: { registering: '#5B8FA8', running: '#C45C3E', published: '#6B7A4A' },
    },
  },
  {
    id: 'sumi',
    group: 'bold',
    title: 'Ink & Seal',
    subtitle: '墨と朱印',
    mood: '水墨画、和紙、落款の赤。伝統とモダンの融合',
    tokens: [
      { name: 'Background', hex: '#1C1C1A', usage: 'ページ背景（墨）' },
      { name: 'Surface', hex: '#F7F5F0', usage: 'カード（和紙）' },
      { name: 'Accent', hex: '#C41E3A', usage: 'Primary ボタン（朱印）' },
      { name: 'Accent Hover', hex: '#D42E4A', usage: 'ホバー' },
      { name: 'Text on dark', hex: '#E8E6E0', usage: '背景上の文字' },
      { name: 'Text on paper', hex: '#2A2820', usage: 'カード上の文字' },
      { name: 'Muted', hex: '#8A8880', usage: '補足' },
      { name: 'Border', hex: 'rgba(42,40,32,0.15)', usage: '区切り線' },
    ],
    preview: {
      bg: '#1C1C1A',
      bgGlow: 'radial-gradient(500px at 50% 50%, rgba(60,58,55,0.5), transparent 70%)',
      surface: '#F7F5F0',
      surfaceBorder: 'rgba(42,40,32,0.15)',
      text: '#E8E6E0',
      textMuted: '#8A8880',
      accent: '#C41E3A',
      accentText: '#F7F5F0',
      accentHover: '#D42E4A',
      secondary: '#2A2824',
      phase: { registering: '#8A8880', running: '#C41E3A', published: '#2A5040' },
    },
  },
  {
    id: 'terminal',
    group: 'bold',
    title: 'Phosphor Terminal',
    subtitle: 'CRT緑の端末',
    mood: '80年代端末、ハッカー美学。開発者・オタク向け会',
    tokens: [
      { name: 'Background', hex: '#0A0F0A', usage: 'ページ背景' },
      { name: 'Surface', hex: '#0F180F', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#33FF66', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#55FF88', usage: 'ホバー' },
      { name: 'Text', hex: '#33FF66', usage: '本文（モノクロ緑）' },
      { name: 'Muted', hex: '#1A8833', usage: '補足テキスト' },
      { name: 'Dim', hex: '#0D220D', usage: '非アクティブ背景' },
      { name: 'Border', hex: 'rgba(51,255,102,0.25)', usage: '区切り線' },
    ],
    preview: {
      bg: '#0A0F0A',
      bgGlow: 'radial-gradient(400px at 50% 50%, rgba(51,255,102,0.06), transparent 60%)',
      surface: '#0F180F',
      surfaceBorder: 'rgba(51,255,102,0.25)',
      text: '#33FF66',
      textMuted: '#1A8833',
      accent: '#33FF66',
      accentText: '#0A0F0A',
      accentHover: '#55FF88',
      secondary: '#0D220D',
      phase: { registering: '#1A8833', running: '#33FF66', published: '#AAFF00' },
    },
  },
  {
    id: 'coral',
    group: 'bold',
    title: 'Deep Coral',
    subtitle: '深海と珊瑚',
    mood: '海の深さに珊瑚の暖色。意外性があり記憶に残る',
    tokens: [
      { name: 'Background', hex: '#0B1628', usage: 'ページ背景' },
      { name: 'Surface', hex: '#152238', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#FF6B6B', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#FF8585', usage: 'ホバー' },
      { name: 'Text', hex: '#E8F0F8', usage: '見出し・本文' },
      { name: 'Muted', hex: '#7A90A8', usage: '補足テキスト' },
      { name: 'Teal', hex: '#2DD4BF', usage: 'リンク・バッジ' },
      { name: 'Border', hex: 'rgba(255,107,107,0.20)', usage: '区切り線' },
    ],
    preview: {
      bg: '#0B1628',
      bgGlow: 'radial-gradient(700px at 20% 80%, rgba(45,212,191,0.08), transparent 50%), radial-gradient(500px at 80% 20%, rgba(255,107,107,0.10), transparent 45%)',
      surface: '#152238',
      surfaceBorder: 'rgba(255,107,107,0.20)',
      text: '#E8F0F8',
      textMuted: '#7A90A8',
      accent: '#FF6B6B',
      accentText: '#0B1628',
      accentHover: '#FF8585',
      secondary: '#1A3050',
      phase: { registering: '#2DD4BF', running: '#FF6B6B', published: '#FFB347' },
    },
  },
  {
    id: 'dusk',
    group: 'bold',
    title: 'Dusk Horizon',
    subtitle: '夕暮れのグラデーション',
    mood: '紫の空にオレンジの地平線。ドラマチックで感情的',
    tokens: [
      { name: 'Background', hex: '#1A1033', usage: 'ページ背景' },
      { name: 'Surface', hex: '#261845', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#FF7A5C', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#FF9478', usage: 'ホバー' },
      { name: 'Text', hex: '#F5F0FF', usage: '見出し・本文' },
      { name: 'Muted', hex: '#A898C0', usage: '補足テキスト' },
      { name: 'Violet', hex: '#7C5CBF', usage: 'Secondary' },
      { name: 'Border', hex: 'rgba(255,122,92,0.20)', usage: '区切り線' },
    ],
    preview: {
      bg: '#1A1033',
      bgGlow: 'radial-gradient(800px at 50% 100%, rgba(255,122,92,0.20), transparent 50%), radial-gradient(600px at 50% 0%, rgba(124,92,191,0.15), transparent 45%)',
      surface: '#261845',
      surfaceBorder: 'rgba(255,122,92,0.20)',
      text: '#F5F0FF',
      textMuted: '#A898C0',
      accent: '#FF7A5C',
      accentText: '#1A1033',
      accentHover: '#FF9478',
      secondary: '#302060',
      phase: { registering: '#7C5CBF', running: '#FF7A5C', published: '#FFD166' },
    },
  },
  {
    id: 'lumen',
    group: 'bold',
    title: 'Lumen Strike',
    subtitle: '電光黄×漆黒',
    mood: '警告テープ、スポーツ、最高の視認性。迷わないUI',
    tokens: [
      { name: 'Background', hex: '#0B0B0B', usage: 'ページ背景' },
      { name: 'Surface', hex: '#161616', usage: 'カード・パネル' },
      { name: 'Accent', hex: '#E4FF00', usage: 'Primary ボタン' },
      { name: 'Accent Hover', hex: '#F0FF33', usage: 'ホバー' },
      { name: 'Text', hex: '#F5F5F5', usage: '見出し・本文' },
      { name: 'Muted', hex: '#888888', usage: '補足テキスト' },
      { name: 'Strike', hex: '#FFFFFF', usage: '強調テキスト' },
      { name: 'Border', hex: 'rgba(228,255,0,0.30)', usage: '区切り線' },
    ],
    preview: {
      bg: '#0B0B0B',
      bgGlow: 'radial-gradient(500px at 50% 0%, rgba(228,255,0,0.08), transparent 55%)',
      surface: '#161616',
      surfaceBorder: 'rgba(228,255,0,0.30)',
      text: '#F5F5F5',
      textMuted: '#888888',
      accent: '#E4FF00',
      accentText: '#0B0B0B',
      accentHover: '#F0FF33',
      secondary: '#222222',
      phase: { registering: '#FFFFFF', running: '#E4FF00', published: '#00FF88' },
    },
  },
];

function Swatch({ hex, name, usage }: PaletteToken) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg shrink-0 border border-white/10"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <p className="text-sm text-stone-200 font-medium">{name}</p>
        <p className="text-xs text-stone-500 font-mono truncate">{hex}</p>
        <p className="text-xs text-stone-600">{usage}</p>
      </div>
    </div>
  );
}

function MiniPreview({ palette }: { palette: Palette }) {
  const p = palette.preview;
  return (
    <div
      className="w-full max-w-[280px] rounded-2xl overflow-hidden border mx-auto"
      style={{ borderColor: p.surfaceBorder, background: p.bg, backgroundImage: p.bgGlow }}
    >
      {/* Phase banner */}
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: p.surfaceBorder, borderLeft: `4px solid ${p.phase.running}` }}
      >
        <span className="text-xs font-semibold" style={{ color: p.text }}>
          進行中
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${p.phase.running}22`, color: p.text }}>
          逐次
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-base font-semibold" style={{ color: p.text }}>
            第12回 ブラインド会
          </h3>
          <p className="text-xs mt-0.5" style={{ color: p.textMuted }}>
            Sample B · 田中
          </p>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: p.surface, border: `1px solid ${p.surfaceBorder}` }}
        >
          <p className="text-xs mb-2" style={{ color: p.textMuted }}>
            次のアクション
          </p>
          <button
            type="button"
            className="w-full py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: p.accent, color: p.accentText }}
          >
            回答を入力する
          </button>
          <button
            type="button"
            className="w-full mt-2 py-2 rounded-lg text-xs font-medium border"
            style={{
              background: p.secondary,
              color: p.text,
              borderColor: p.surfaceBorder,
            }}
          >
            参加者を変更
          </button>
        </div>

        {/* Phase pills */}
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              ['登録', p.phase.registering],
              ['進行', p.phase.running],
              ['公開', p.phase.published],
            ] as const
          ).map(([label, color]) => (
            <span
              key={label}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${color}25`, color }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ColorPalettesPage() {
  const [active, setActive] = useState<PaletteId>('amber');
  const palette = PALETTES.find((p) => p.id === active)!;
  const classicPalettes = PALETTES.filter((p) => p.group === 'classic');
  const boldPalettes = PALETTES.filter((p) => p.group === 'bold');

  const PaletteTab = ({ p }: { p: Palette }) => (
    <button
      key={p.id}
      type="button"
      onClick={() => setActive(p.id)}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active === p.id
          ? 'border-transparent'
          : 'bg-neutral-800 text-stone-400 hover:text-stone-200 border-white/10'
      }`}
      style={active === p.id ? { background: p.preview.accent, color: p.preview.accentText } : undefined}
    >
      {p.title}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-stone-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur-md px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-stone-500 tracking-widest uppercase mb-1">Color Exploration</p>
            <h1 className="text-xl font-semibold tracking-tight">Blind Dram — 配色 20案</h1>
          </div>
          <div className="flex gap-4 text-sm flex-wrap">
            <Link href="/design-mocks/tasting-note" className="text-[#c4a574]/90 hover:text-[#d4b584]">
              テイスティングノート
            </Link>
            <Link href="/design-mocks" className="text-stone-400 hover:text-stone-200">
              UIモック
            </Link>
            <Link href="/" className="text-stone-400 hover:text-stone-200">
              アプリ
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-2">Whisky / Classic（1–10）</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {classicPalettes.map((p) => (
                <PaletteTab key={p.id} p={p} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-2">Bold / Experimental（11–20）</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {boldPalettes.map((p) => (
                <PaletteTab key={p.id} p={p} />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-1">{palette.title}</h2>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm" style={{ color: palette.preview.accent }}>
              {palette.subtitle}
            </p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                palette.group === 'bold'
                  ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30'
                  : 'bg-stone-700/50 text-stone-400 border border-white/10'
              }`}
            >
              {palette.group === 'bold' ? 'Experimental' : 'Classic'}
            </span>
          </div>
          <p className="text-stone-400 leading-relaxed max-w-2xl">{palette.mood}</p>
        </section>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">UIプレビュー</h3>
            <MiniPreview palette={palette} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">カラートークン</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {palette.tokens.map((t) => (
                <Swatch key={t.name} {...t} />
              ))}
            </div>
          </div>
        </div>

        {/* All palettes overview */}
        <section className="mt-20">
          <h3 className="text-lg font-semibold mb-2">Classic — ウイスキー文脈（10案）</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
            {classicPalettes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                className={`text-left rounded-2xl overflow-hidden border transition-all ${
                  active === p.id ? 'ring-2 ring-[#C88A2B] ring-offset-2 ring-offset-neutral-950' : 'border-white/10'
                }`}
              >
                <div className="h-16 flex">
                  <div className="flex-1" style={{ background: p.preview.bg }} />
                  <div className="w-8" style={{ background: p.preview.accent }} />
                  <div className="w-8" style={{ background: p.preview.surface }} />
                </div>
                <div className="p-3 bg-neutral-900">
                  <p className="text-sm font-medium text-stone-200">{p.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{p.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
          <h3 className="text-lg font-semibold mb-2">Bold — 現状に囚われない（10案）</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {boldPalettes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                className={`text-left rounded-2xl overflow-hidden border transition-all ${
                  active === p.id ? 'ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-neutral-950' : 'border-white/10'
                }`}
              >
                <div className="h-16 flex">
                  <div className="flex-1" style={{ background: p.preview.bg }} />
                  <div className="w-8" style={{ background: p.preview.accent }} />
                  <div className="w-8" style={{ background: p.preview.surface }} />
                </div>
                <div className="p-3 bg-neutral-900">
                  <p className="text-sm font-medium text-stone-200">{p.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{p.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-12 p-6 rounded-2xl border border-white/10 bg-neutral-900/50">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Bold 10案 — 選び方の目安</h3>
          <ul className="text-sm text-stone-400 space-y-2 leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-stone-300">Neon Distillery</strong> — 若者向け・ナイトイベント。最大のインパクト。
            </li>
            <li>
              <strong className="text-stone-300">Swiss Signal</strong> — 情報設計重視。装飾を削ぎ落としたいとき。
            </li>
            <li>
              <strong className="text-stone-300">Sakura Blush</strong> — 柔らかく親しみやすい。和のテイスティング会。
            </li>
            <li>
              <strong className="text-stone-300">Arctic Glass</strong> — 冷静・クリーン。スコア入力の視認性。
            </li>
            <li>
              <strong className="text-stone-300">Terracotta Sun</strong> — 屋外・夏の会。開放的で陽気。
            </li>
            <li>
              <strong className="text-stone-300">Ink & Seal</strong> — 和モダン。伝統的な会の格式。
            </li>
            <li>
              <strong className="text-stone-300">Phosphor Terminal</strong> — 開発者・オタク文化。ユニークさ最優先。
            </li>
            <li>
              <strong className="text-stone-300">Deep Coral</strong> — 意外性と記憶に残るブランド。
            </li>
            <li>
              <strong className="text-stone-300">Dusk Horizon</strong> — 感情的・ドラマチックな結果発表。
            </li>
            <li>
              <strong className="text-stone-300">Lumen Strike</strong> — 視認性最優先。暗い会場でも迷わない。
            </li>
          </ul>
        </section>

        <section className="mt-6 p-6 rounded-2xl border border-white/10 bg-neutral-900/50">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Classic 10案 — 選び方の目安</h3>
          <ul className="text-sm text-stone-400 space-y-2 leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-stone-300">Amber Bar</strong> — 現行からの移行コストが最小。馴染みやすい。
            </li>
            <li>
              <strong className="text-stone-300">Sherry Cask</strong> — 結果発表・イベント感を強めたいとき。
            </li>
            <li>
              <strong className="text-stone-300">Islay Smoke</strong> — 差別化・ブランド個性を出したいとき。
            </li>
            <li>
              <strong className="text-stone-300">Speyside Malt</strong> — 温かく親しみやすい雰囲気にしたいとき。
            </li>
            <li>
              <strong className="text-stone-300">Tasting Room Ivory</strong> — 昼間の会・明るい会場向け（ライトモード）。
            </li>
            <li>
              <strong className="text-stone-300">Highland Heather</strong> — 落ち着いた高級感・スコットランドらしさ。
            </li>
            <li>
              <strong className="text-stone-300">Bourbon Oak</strong> — 活気・若い参加者向け。オレンジが目を引く。
            </li>
            <li>
              <strong className="text-stone-300">Coppersmith</strong> — 蒸溜所・クラフト感。銅の温かみ。
            </li>
            <li>
              <strong className="text-stone-300">Midnight Glen</strong> — 静かで集中できる。深緑の落ち着き。
            </li>
            <li>
              <strong className="text-stone-300">Champagne Finish</strong> — 結果公開・表彰の「祝福感」を最大化。
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
