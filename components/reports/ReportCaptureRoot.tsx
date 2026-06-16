'use client';

import { OverallReportView } from '@/components/reports/OverallReportView';
import { PersonalReportView } from '@/components/reports/PersonalReportView';
import { TournamentReportView } from '@/components/reports/TournamentReportView';
import {
  buildOverallReportData,
  buildPersonalReportData,
  buildTournamentReportData,
} from '@/lib/report-data/build';
import type { ResultsSnapshot } from '@/lib/report-data/results-snapshot';

import type { ReportCaptureKind } from '@/lib/capture-ranking-png';

export type { ReportCaptureKind };

export function ReportCaptureRoot({ results }: { results: ResultsSnapshot }) {
  const tournament = buildTournamentReportData(results);
  const overall = buildOverallReportData(results);

  return (
    <div data-report-capture-root>
      <div data-report-kind="tournament">
        <TournamentReportView data={tournament} />
      </div>
      <div data-report-kind="overall">
        <OverallReportView data={overall} />
      </div>
      {results.rankings.map((r) => {
        const pd = buildPersonalReportData(results, r.participant_id);
        if (!pd) return null;
        return (
          <div key={r.participant_id} data-report-kind="personal" data-participant-id={r.participant_id}>
            <PersonalReportView data={pd} />
          </div>
        );
      })}
    </div>
  );
}
