'use client';

import { ResultsArchiveRankingCard } from '@/components/results/export/ResultsArchiveRankingCard';
import { ResultsArchiveSampleCard } from '@/components/results/export/ResultsArchiveSampleCard';
import { ResultsShareCard } from '@/components/results/export/ResultsShareCard';
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

  const archiveTotal = 1 + results.sample_details.length;

  return (
    <div data-export-capture-root>
      <ResultsShareCard results={results} resultsPageUrl={url} />
      <ResultsArchiveRankingCard results={results} pageIndex={1} totalPages={archiveTotal} />
      {results.sample_details.map((sample, index) => (
        <ResultsArchiveSampleCard
          key={sample.sample_id}
          results={results}
          sample={sample}
          pageIndex={index + 2}
          totalPages={archiveTotal}
        />
      ))}
    </div>
  );
}
