'use client';

import { ExportCanvas } from '@/components/results/export/ExportCanvas';
import { exportColors, maxScoresPerSample, scoreHeatBackground } from '@/lib/results-export-design';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import type { ResultsPosterData } from '@/lib/results-poster';

export function ResultsArchiveRankingCard({
  results,
  pageIndex,
  totalPages,
}: {
  results: ResultsPosterData;
  pageIndex: number;
  totalPages: number;
}) {
  const peers = results.rankings.map((r) => ({
    participant_id: r.participant_id,
    display_name: r.display_name,
  }));
  const samples = results.rankings[0]?.sample_scores ?? [];
  const heatMax = maxScoresPerSample(results);

  return (
    <ExportCanvas exportKind="archive" pageLabel={`${results.session.title} — 総合順位 (${pageIndex}/${totalPages})`}>
      <p style={{ margin: '0 0 20px', fontSize: 22, color: exportColors.inkMuted }}>
        色が濃いほど高得点。各サンプルの詳細は個別カードをご覧ください。
      </p>
      <div style={{ overflow: 'hidden', borderRadius: 12, border: `1px solid ${exportColors.rule}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 20 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.6)' }}>
              <th style={{ padding: '12px 8px', textAlign: 'left', color: exportColors.inkMuted }}>順</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', color: exportColors.inkMuted }}>参加者</th>
              <th style={{ padding: '12px 8px', textAlign: 'right', color: exportColors.inkMuted }}>計</th>
              {samples.map((s) => (
                <th
                  key={s.sample_id}
                  style={{
                    padding: '10px 4px',
                    textAlign: 'center',
                    color: exportColors.inkMuted,
                    fontSize: 16,
                    lineHeight: 1.2,
                    maxWidth: 72,
                  }}
                >
                  {s.sample_label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.rankings.map((r) => (
              <tr key={r.participant_id} style={{ borderTop: `1px solid ${exportColors.rule}` }}>
                <td style={{ padding: '10px 8px', fontWeight: 800 }}>{r.rank}</td>
                <td style={{ padding: '10px 8px', fontWeight: 600, maxWidth: 140 }}>
                  {disambiguatedDisplayName(r.display_name, r.participant_id, peers)}
                </td>
                <td
                  style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: exportColors.accentDark,
                    fontSize: 22,
                  }}
                >
                  {r.total_score}
                </td>
                {r.sample_scores?.map((s) => (
                  <td
                    key={s.sample_id}
                    style={{
                      padding: '10px 4px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 18,
                      background: scoreHeatBackground(s.score, heatMax.get(s.sample_id) ?? s.score),
                    }}
                  >
                    {s.score}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ExportCanvas>
  );
}
