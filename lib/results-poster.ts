/** 結果ポスター画像（完全版）用の型・ヘルパー */

import type { ItemGradesMap } from '@/lib/scoring-schema';
import type { RankingMatrixParticipant } from '@/lib/rankingMatrix';

export type ResultsPosterFlavorSection = {
  tier1_tags?: string[];
  tier2_terms?: string[];
  text?: string | null;
  tier1_intensity?: Record<string, number>;
};

export type ResultsPosterSampleDetail = {
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
    true_bottler_name?: string | null;
    true_distillation_year?: number | null;
    true_bottling_year?: number | null;
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
    guessed_other1?: string | null;
    guessed_other2?: string | null;
    is_correct_distillery: boolean;
    is_correct?: boolean | null;
    item_grades?: ItemGradesMap | null;
    score: number;
  }>;
  comments?: Array<{
    participant_id: string;
    display_name: string;
    nose: ResultsPosterFlavorSection;
    palate: ResultsPosterFlavorSection;
    finish: ResultsPosterFlavorSection;
  }>;
};

export type ResultsPosterData = {
  session: {
    title: string;
    mode: 'sequential' | 'simultaneous';
    public_results?: boolean;
  };
  scoring_snapshot?: unknown;
  rankings: RankingMatrixParticipant[];
  sample_details: ResultsPosterSampleDetail[];
};

export function flavorSectionHasContent(section: ResultsPosterFlavorSection | undefined | null): boolean {
  if (!section) return false;
  return (
    (section.tier1_tags?.length ?? 0) > 0 ||
    (section.tier2_terms?.length ?? 0) > 0 ||
    !!((section.text ?? '').trim().length > 0)
  );
}

export function flavorCommentRowHasContent(
  comment:
    | {
        nose?: ResultsPosterFlavorSection;
        palate?: ResultsPosterFlavorSection;
        finish?: ResultsPosterFlavorSection;
      }
    | undefined
    | null,
): boolean {
  if (!comment) return false;
  return (
    flavorSectionHasContent(comment.nose) ||
    flavorSectionHasContent(comment.palate) ||
    flavorSectionHasContent(comment.finish)
  );
}

/** 参加者フレーバーコメントが1件でもあれば true（全部入れる / 全部入れない の判定） */
export function resultsHaveAnyFlavorComments(results: ResultsPosterData): boolean {
  for (const sample of results.sample_details) {
    for (const comment of sample.comments ?? []) {
      if (flavorCommentRowHasContent(comment)) return true;
    }
  }
  return false;
}

export function sessionModeLabel(mode: 'sequential' | 'simultaneous'): string {
  return mode === 'sequential' ? '逐次モード' : '同時モード';
}

/** ポスター内の img をキャプチャ前に読み込み */
export async function preloadImagesInElement(el: HTMLElement): Promise<void> {
  const imgs = el.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          if (!img.complete) {
            const src = img.src;
            img.src = '';
            img.src = src;
          }
        }),
    ),
  );
}
