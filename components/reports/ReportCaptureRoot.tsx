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

import type { ReportCaptureFilter, ReportCaptureKind } from '@/lib/capture-ranking-png';

export type { ReportCaptureKind, ReportCaptureFilter };

type Props = {
  results: ResultsSnapshot;
  /** 指定時はそのレポートだけ描画（iPhone のメモリ負荷対策） */
  filter?: ReportCaptureFilter | 'all';
};

export function ReportCaptureRoot({ results, filter = 'all' }: Props) {
  const showAll = filter === 'all';
  const showTournament = showAll || filter.kind === 'tournament';
  const showOverall = showAll || filter.kind === 'overall';
  const showPersonal = showAll || filter.kind === 'personal';
  const personalId = !showAll && filter.kind === 'personal' ? filter.participantId : undefined;

  const tournament = showTournament ? buildTournamentReportData(results) : null;
  const overall = showOverall ? buildOverallReportData(results) : null;

  return (
    <div data-report-capture-root>
      {tournament && (
        <div data-report-kind="tournament">
          <TournamentReportView data={tournament} />
        </div>
      )}
      {overall && (
        <div data-report-kind="overall">
          <OverallReportView data={overall} />
        </div>
      )}
      {showPersonal &&
        results.rankings
          .filter((r) => !personalId || r.participant_id === personalId)
          .map((r) => {
            const pd = buildPersonalReportData(results, r.participant_id);
            if (!pd) return null;
            return (
              <div
                key={r.participant_id}
                data-report-kind="personal"
                data-participant-id={r.participant_id}
              >
                <PersonalReportView data={pd} />
              </div>
            );
          })}
    </div>
  );
}
