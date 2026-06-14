'use client';

import { ResultsArchiveRankingCard } from '@/components/results/export/ResultsArchiveRankingCard';
import { ResultsArchiveSampleCard } from '@/components/results/export/ResultsArchiveSampleCard';
import { ResultsArchiveSampleFlavorCard } from '@/components/results/export/ResultsArchiveSampleFlavorCard';
import { ResultsShareCard } from '@/components/results/export/ResultsShareCard';
import { buildArchiveExportPages, archiveExportTotalPages } from '@/lib/results-export-layout';
import { buildResultsPageUrl } from '@/lib/results-share';
import type { ResultsPosterData } from '@/lib/results-poster';

export type ResultsExportCaptureProps = {
  results: ResultsPosterData;
  joinToken: string;
  ownerToken?: string | null;
  resultsPageUrl?: string;
};

export function ResultsExportCapture({
  results,
  joinToken,
  ownerToken,
  resultsPageUrl,
}: ResultsExportCaptureProps) {
  const url =
    resultsPageUrl ??
    (typeof window !== 'undefined'
      ? buildResultsPageUrl(
          window.location.origin,
          joinToken,
          ownerToken,
          results.session.public_results !== false,
        )
      : '');

  const totalPages = archiveExportTotalPages(results);
  const pages = buildArchiveExportPages(results);
  let pageIndex = 0;

  return (
    <div data-export-capture-root>
      <ResultsShareCard results={results} resultsPageUrl={url} />
      {pages.map((page) => {
        pageIndex += 1;
        const idx = pageIndex;
        if (page.kind === 'ranking') {
          return (
            <ResultsArchiveRankingCard
              key="ranking"
              results={results}
              pageIndex={idx}
              totalPages={totalPages}
            />
          );
        }
        const sample = results.sample_details.find((s) => s.sample_id === page.sampleId);
        if (!sample) return null;
        if (page.kind === 'sample') {
          return (
            <ResultsArchiveSampleCard
              key={`sample-${sample.sample_id}`}
              results={results}
              sample={sample}
              pageIndex={idx}
              totalPages={totalPages}
            />
          );
        }
        return (
          <ResultsArchiveSampleFlavorCard
            key={`flavor-${sample.sample_id}`}
            sample={sample}
            pageIndex={idx}
            totalPages={totalPages}
          />
        );
      })}
    </div>
  );
}
