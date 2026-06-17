/** レポート画像用データ型 */

export type Judgement = 'correct' | 'partial' | 'wrong' | 'unjudged';

import { SCORING_ITEM_KEYS, type ScoringItemKey } from '@/lib/scoring-schema';

/** 採点スキーマと同期（other1/other2 含む） */
export const REPORT_ITEM_KEYS = SCORING_ITEM_KEYS;
export type ReportItemKey = ScoringItemKey;

export type ReportTruthFields = {
  region: string;
  distillery: string;
  age: string;
  abv: string;
  cask: string;
  other1?: string;
  other2?: string;
};

export type ReportRoundItem = {
  label: string;
  maxScore: number;
  answer: string;
  truth: string;
  judgement: Judgement;
  earnedScore: number;
};

export type TournamentReportData = {
  sessionTitle: string;
  basic: { date: string; participantCount: number; sampleCount: number };
  rankings: Array<{ rank: number; participantId: string; name: string; totalScore: number }>;
  scoreSummary: {
    totalScore: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    medianScore: number;
  };
  bottles: Array<{
    roundNo: number;
    sampleId: string;
    sampleName: string;
    presenterName: string;
    truth: ReportTruthFields;
  }>;
  bottleScores: Array<{
    roundNo: number;
    sampleId: string;
    sampleName: string;
    presenterName: string;
    participantScores: Array<{ participantId: string; name: string; score: number }>;
    totalScore: number;
  }>;
};

export type OverallReportData = {
  sessionTitle: string;
  basic: {
    date: string;
    participantCount: number;
    sampleCount: number;
    totalScore: number;
    averageScore: number;
  };
  highlights: {
    winner: { participantId: string; name: string; totalScore: number };
    highestScore: {
      participantId: string;
      participantName: string;
      sampleId: string;
      sampleName: string;
      score: number;
      othersCount: number;
    };
    lowestScore: {
      participantId: string;
      participantName: string;
      sampleId: string;
      sampleName: string;
      score: number;
      othersCount: number;
    };
    hardestBottle: {
      sampleId: string;
      sampleName: string;
      presenterName: string;
      totalScore: number;
      averageScore: number;
    };
    bestPerformedBottle: {
      sampleId: string;
      sampleName: string;
      presenterName: string;
      totalScore: number;
      averageScore: number;
    };
    mostDivisiveBottle: {
      sampleId: string;
      sampleName: string;
      presenterName: string;
      standardDeviation: number;
    };
  };
  bottleDifficulty: Array<{
    rank: number;
    roundNo: number;
    sampleId: string;
    sampleName: string;
    presenterName: string;
    totalScore: number;
    averageScore: number;
  }>;
  cumulativeScores: Array<{
    roundNo: number;
    scores: Array<{ participantId: string; participantName: string; cumulativeScore: number }>;
  }>;
};

export type PersonalReportData = {
  sessionTitle: string;
  sessionDate: string;
  participant: {
    participantId: string;
    name: string;
    rank: number;
    totalScore: number;
    averageScore: number;
    diffFromOverallAverage: number;
  };
  analysis: {
    categoryScores: Array<{
      key: ReportItemKey;
      label: string;
      earnedScore: number;
      maxScore: number;
      rate: number;
    }>;
    highestBottle: {
      sampleId: string;
      sampleName: string;
      presenterName: string;
      score: number;
      othersCount: number;
    };
    lowestBottle: {
      sampleId: string;
      sampleName: string;
      presenterName: string;
      score: number;
      othersCount: number;
    };
  };
  rounds: Array<{
    roundNo: number;
    sampleId: string;
    sampleName: string;
    presenterName: string;
    totalScore: number;
    maxTotalScore: number;
    items: Record<ReportItemKey, ReportRoundItem>;
  }>;
  itemMaxScores: Record<ReportItemKey, number>;
  /** 有効な採点項目（enabled かつ maxPoints > 0） */
  activeItemKeys: ReportItemKey[];
  maxTotalScorePerRound: number;
};
