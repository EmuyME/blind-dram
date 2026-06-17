export type Judgement = 'correct' | 'partial' | 'wrong' | 'unjudged';

export type ScoreItem = {
  answer: string;
  truth: string;
  judgement: Judgement;
  points: number;
};

export type ScoringColumn = {
  key: string;
  label: string;
  points: number;
};

export type RoundRow = {
  no: number;
  sample: string;
  presenter: string;
  items: Record<string, ScoreItem>;
  total: number;
};

export type CategoryScore = {
  label: string;
  earned: number;
  max: number;
  rate: number;
};

export type PersonalReportMockData = {
  sessionTitle: string;
  sessionDate: string;
  participantName: string;
  results: {
    rank: number;
    totalScore: number;
    averageScore: number;
    diffFromAverage: number;
  };
  categories: CategoryScore[];
  scoringColumns: ScoringColumn[];
  highestBottle: { name: string; score: number };
  lowestBottle: { name: string; score: number };
  rounds: RoundRow[];
  maxTotalPerRound: number;
};

export type MockScenario = 'standard' | 'many-categories' | 'many-rounds' | 'stress';

const PRESENTERS = ['佐藤', '鈴木', '山田', '伊藤', '高橋', '渡辺', '中村', '小林'];
const SAMPLES = ['Glenfarclas 15', 'Talisker 10', 'Glenlivet 12', 'Macallan 18', 'Ardbeg 10', 'Lagavulin 16', 'Bowmore 15', 'Laphroaig 10'];

const BASE_COLUMNS: ScoringColumn[] = [
  { key: 'cask', label: 'カスク', points: 4 },
  { key: 'region', label: '地域', points: 4 },
  { key: 'age', label: '年数', points: 4 },
  { key: 'abv', label: '度数', points: 4 },
  { key: 'distillery', label: '蒸溜所', points: 9 },
];

const EXTRA_COLUMNS: ScoringColumn[] = [
  { key: 'other1', label: 'その他①', points: 3 },
  { key: 'other2', label: 'その他②', points: 3 },
];

function item(answer: string, truth: string, judgement: Judgement, points: number): ScoreItem {
  return { answer, truth, judgement, points };
}

function roundTemplate(no: number, columns: ScoringColumn[]): RoundRow {
  const patterns: Record<string, ScoreItem>[] = [
    {
      cask: item('シェリー樽', 'シェリー樽', 'correct', 4),
      region: item('スペイサイド', 'スペイサイド', 'correct', 4),
      age: item('12年', '15年', 'partial', 2),
      abv: item('43%', '46%', 'wrong', 0),
      distillery: item('Glenfarclas', 'Glenfarclas', 'correct', 9),
      other1: item('非ピート', '非ピート', 'correct', 3),
      other2: item('シングル', 'シングル', 'correct', 3),
    },
    {
      cask: item('バーボン樽', 'バーボン樽', 'correct', 4),
      region: item('ハイランド', 'スペイサイド', 'wrong', 0),
      age: item('10年', '10年', 'correct', 4),
      abv: item('40%', '40%', 'correct', 4),
      distillery: item('Glenlivet', 'Glenlivet', 'correct', 9),
      other1: item('ピート弱', '非ピート', 'partial', 1),
      other2: item('シングル', 'シングル', 'correct', 3),
    },
    {
      cask: item('リフィル樽', 'バーボン樽', 'wrong', 0),
      region: item('アイラ', 'アイラ', 'correct', 4),
      age: item('12年', '12年', 'correct', 4),
      abv: item('43%', '43%', 'correct', 4),
      distillery: item('Talisker', 'Ardbeg', 'wrong', 0),
      other1: item('ピート強', 'ピート強', 'correct', 3),
      other2: item('シングル', 'ブレンド', 'wrong', 0),
    },
    {
      cask: item('シェリー樽', 'シェリー樽', 'correct', 4),
      region: item('スペイサイド', 'スペイサイド', 'correct', 4),
      age: item('18年', '18年', 'correct', 4),
      abv: item('46%', '46%', 'correct', 4),
      distillery: item('Macallan', 'Macallan', 'correct', 9),
      other1: item('非ピート', '非ピート', 'correct', 3),
      other2: item('シングル', 'シングル', 'correct', 3),
    },
  ];

  const pat = patterns[(no - 1) % patterns.length];
  const items: Record<string, ScoreItem> = {};
  let total = 0;
  for (const col of columns) {
    const cell = pat[col.key] ?? item('—', '—', 'unjudged', 0);
    items[col.key] = cell;
    total += cell.points;
  }

  return {
    no,
    sample: `Sample ${String.fromCharCode(64 + ((no - 1) % 26) + 1)}`,
    presenter: PRESENTERS[(no - 1) % PRESENTERS.length],
    items,
    total,
  };
}

function buildRounds(count: number, columns: ScoringColumn[]): RoundRow[] {
  return Array.from({ length: count }, (_, i) => roundTemplate(i + 1, columns));
}

function buildCategories(columns: ScoringColumn[], rounds: RoundRow[]): CategoryScore[] {
  return columns.map((col) => {
    const earned = rounds.reduce((s, r) => s + (r.items[col.key]?.points ?? 0), 0);
    const max = col.points * rounds.length;
    const rate = max > 0 ? Math.round((earned / max) * 100) : 0;
    return { label: col.label, earned, max, rate };
  });
}

function buildMock(columns: ScoringColumn[], roundCount: number): PersonalReportMockData {
  const rounds = buildRounds(roundCount, columns);
  const categories = buildCategories(columns, rounds);
  const sorted = [...categories].sort((a, b) => b.rate - a.rate);
  const totalScore = rounds.reduce((s, r) => s + r.total, 0);
  const maxTotalPerRound = columns.reduce((s, c) => s + c.points, 0);
  const byRound = [...rounds].sort((a, b) => b.total - a.total);

  return {
    sessionTitle: '第12回 ブラインドウイスキー会',
    sessionDate: '2026年5月24日',
    participantName: '田中 美咲',
    results: {
      rank: 2,
      totalScore,
      averageScore: Math.round((totalScore / rounds.length) * 10) / 10,
      diffFromAverage: 2.3,
    },
    categories,
    scoringColumns: columns,
    highestBottle: { name: SAMPLES[(rounds.length - 1) % SAMPLES.length], score: byRound[0]?.total ?? 0 },
    lowestBottle: { name: SAMPLES[rounds.length % SAMPLES.length], score: byRound[byRound.length - 1]?.total ?? 0 },
    rounds,
    maxTotalPerRound,
  };
}

const SCENARIOS: Record<MockScenario, () => PersonalReportMockData> = {
  standard: () => buildMock(BASE_COLUMNS, 4),
  'many-categories': () => buildMock([...BASE_COLUMNS, ...EXTRA_COLUMNS], 4),
  'many-rounds': () => buildMock(BASE_COLUMNS, 12),
  stress: () => buildMock([...BASE_COLUMNS, ...EXTRA_COLUMNS], 14),
};

export const MOCK_SCENARIO_LABELS: Record<MockScenario, string> = {
  standard: '標準（4ラウンド / 5部門）',
  'many-categories': '部門多（4ラウンド / 7部門）',
  'many-rounds': 'ラウンド多（12ラウンド / 5部門）',
  stress: '最大負荷（14ラウンド / 7部門）',
};

export function getMockData(scenario: MockScenario = 'standard'): PersonalReportMockData {
  return SCENARIOS[scenario]();
}

/** @deprecated getMockData('standard') を使用 */
export const MOCK = getMockData('standard');
