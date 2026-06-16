/** 結果 API レスポンス（レポート生成の入力） */

import type { ItemGradesMap } from '@/lib/scoring-schema';

export type ResultsSnapshot = {
  session: {
    id: string;
    title: string;
    mode: 'sequential' | 'simultaneous';
    created_at?: string | null;
  };
  scoring_snapshot?: unknown;
  rankings: Array<{
    rank: number;
    participant_id: string;
    display_name: string;
    total_score: number;
    sample_scores: Array<{ sample_id: string; sample_label: string; score: number }>;
  }>;
  sample_details: Array<{
    sample_id: string;
    sample_label: string;
    presenter_name?: string | null;
    scoring_snapshot?: unknown;
    truth: {
      true_cask: string;
      true_region: string;
      true_age: number | string | null;
      true_abv: number | string | null;
      true_distillery: string;
      true_other1?: string | null;
      true_other2?: string | null;
      notes?: string | null;
      bottle_image_url?: string | null;
    };
    participant_answers: Array<{
      participant_id: string;
      display_name: string;
      guessed_cask: string;
      guessed_region: string;
      guessed_age: number | string | null;
      guessed_abv: number | string | null;
      guessed_distillery: string;
      is_correct?: boolean | null;
      item_grades?: ItemGradesMap | null;
      score: number;
    }>;
  }>;
};
