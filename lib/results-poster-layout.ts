/** 結果ポスターのページ分割 */

import { isMobileCapture } from '@/lib/capture-device';

/** 1ページに載せるサンプル数（高解像度キャプチャの高さ上限に合わせる） */
export function samplesPerPosterPage(): number {
  return isMobileCapture() ? 3 : 4;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

export function buildPosterPagePlan(sampleCount: number): {
  rankingPage: number;
  samplePageCount: number;
  participantsPage: number;
  totalPages: number;
} {
  const perPage = samplesPerPosterPage();
  const samplePageCount = Math.max(1, Math.ceil(sampleCount / perPage));
  const totalPages = 1 + samplePageCount + 1;
  return {
    rankingPage: 1,
    samplePageCount,
    participantsPage: totalPages,
    totalPages,
  };
}
