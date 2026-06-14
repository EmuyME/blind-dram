/** アーカイブ画像のページ構成・ファイル名 */

import { sanitizeDownloadBasename } from '@/lib/rankingMatrix';
import {
  flavorCommentRowHasContent,
  resultsHaveAnyFlavorComments,
  type ResultsPosterData,
  type ResultsPosterSampleDetail,
} from '@/lib/results-poster';

export function sampleHasFlavorComments(sample: ResultsPosterSampleDetail): boolean {
  return (sample.comments ?? []).some((c) => flavorCommentRowHasContent(c));
}

export type ArchiveExportPage =
  | { kind: 'ranking' }
  | { kind: 'sample'; sampleId: string }
  | { kind: 'sample-flavor'; sampleId: string };

export function buildArchiveExportPages(results: ResultsPosterData): ArchiveExportPage[] {
  const pages: ArchiveExportPage[] = [{ kind: 'ranking' }];
  const includeFlavors = resultsHaveAnyFlavorComments(results);

  for (const sample of results.sample_details) {
    pages.push({ kind: 'sample', sampleId: sample.sample_id });
    if (includeFlavors && sampleHasFlavorComments(sample)) {
      pages.push({ kind: 'sample-flavor', sampleId: sample.sample_id });
    }
  }
  return pages;
}

export function archiveExportTotalPages(results: ResultsPosterData): number {
  return buildArchiveExportPages(results).length;
}

export function buildArchiveExportFilenames(title: string, results: ResultsPosterData): string[] {
  const base = sanitizeDownloadBasename(title, 'archive');
  const day = new Date().toISOString().split('T')[0];
  const pages = buildArchiveExportPages(results);
  let sampleNo = 0;

  return pages.map((page, index) => {
    const num = String(index + 1).padStart(2, '0');
    if (page.kind === 'ranking') {
      return `${base}_archive_${day}_${num}_順位.png`;
    }
    const sample = results.sample_details.find((s) => s.sample_id === page.sampleId);
    const safe = sanitizeDownloadBasename(sample?.sample_label ?? `sample${sampleNo}`, 'sample');
    if (page.kind === 'sample') {
      sampleNo += 1;
      return `${base}_archive_${day}_${num}_${safe}.png`;
    }
    return `${base}_archive_${day}_${num}_${safe}_フレーバー.png`;
  });
}

/** 表ヘッダー用の短い表示名 */
export function shortDisplayName(name: string, maxLen = 8): string {
  const t = name.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** 参加者列数に応じた表フォントサイズ */
export function exportTableFontSize(columnCount: number): number {
  if (columnCount <= 5) return 18;
  if (columnCount <= 7) return 16;
  if (columnCount <= 9) return 14;
  return 12;
}
