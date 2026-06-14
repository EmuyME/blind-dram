'use client';

import { ExportCanvas } from '@/components/results/export/ExportCanvas';
import {
  exportColors,
  maxScoresPerSample,
  scoreHeatBackground,
  truncateText,
} from '@/lib/results-export-design';
import { exportTableFontSize, shortDisplayName } from '@/lib/results-export-layout';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import type { ResultsPosterData } from '@/lib/results-poster';

/** サンプル行 × 参加者列のマトリクス（サンプル数が多いときも横に切れない） */
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
  const heatMax = maxScoresPerSample(results);
  const fontSize = exportTableFontSize(results.rankings.length);
  const headerFont = Math.max(12, fontSize - 2);

  return (
    <ExportCanvas exportKind="archive" pageLabel={`${results.session.title} — 総合順位 (${pageIndex}/${totalPages})`}>
      <p style={{ margin: '0 0 16px', fontSize: 20, color: exportColors.inkMuted, lineHeight: 1.4 }}>
        縦軸がサンプル、横軸が参加者です。色が濃いほど高得点。詳細は各サンプルカードをご覧ください。
      </p>
      <div style={{ borderRadius: 12, border: `1px solid ${exportColors.rule}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: '22%' }} />
            {results.rankings.map((r) => (
              <col key={r.participant_id} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.65)' }}>
              <th style={{ padding: '8px 4px', textAlign: 'center', color: exportColors.inkMuted, fontSize: headerFont }}>
                #
              </th>
              <th style={{ padding: '8px 6px', textAlign: 'left', color: exportColors.inkMuted, fontSize: headerFont }}>
                サンプル
              </th>
              {results.rankings.map((r) => (
                <th
                  key={r.participant_id}
                  style={{
                    padding: '8px 2px',
                    textAlign: 'center',
                    color: exportColors.inkMuted,
                    fontSize: headerFont,
                    lineHeight: 1.15,
                    wordBreak: 'break-all',
                  }}
                  title={disambiguatedDisplayName(r.display_name, r.participant_id, peers)}
                >
                  {shortDisplayName(disambiguatedDisplayName(r.display_name, r.participant_id, peers), 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.sample_details.map((sample, idx) => {
              const max = heatMax.get(sample.sample_id) ?? 0;
              return (
                <tr key={sample.sample_id} style={{ borderTop: `1px solid ${exportColors.rule}` }}>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                  <td
                    style={{
                      padding: '8px 6px',
                      fontWeight: 600,
                      fontSize: Math.max(12, fontSize - 1),
                      lineHeight: 1.2,
                      wordBreak: 'break-all',
                    }}
                    title={sample.sample_label}
                  >
                    {truncateText(sample.sample_label, 16)}
                  </td>
                  {results.rankings.map((r) => {
                    const cell = r.sample_scores?.find((s) => s.sample_id === sample.sample_id);
                    const score = cell?.score ?? 0;
                    return (
                      <td
                        key={r.participant_id}
                        style={{
                          padding: '8px 2px',
                          textAlign: 'center',
                          fontWeight: 700,
                          background: scoreHeatBackground(score, max),
                        }}
                      >
                        {cell != null ? score : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${exportColors.rule}`, background: 'rgba(255,255,255,0.45)' }}>
              <td colSpan={2} style={{ padding: '10px 6px', fontWeight: 800, fontSize: headerFont }}>
                合計
              </td>
              {results.rankings.map((r) => (
                <td
                  key={r.participant_id}
                  style={{
                    padding: '10px 2px',
                    textAlign: 'center',
                    fontWeight: 800,
                    color: exportColors.accentDark,
                    fontSize: fontSize + 1,
                  }}
                >
                  {r.total_score}
                </td>
              ))}
            </tr>
            <tr style={{ background: 'rgba(255,255,255,0.35)' }}>
              <td colSpan={2} style={{ padding: '8px 6px', fontWeight: 700, fontSize: headerFont }}>
                順位
              </td>
              {results.rankings.map((r) => (
                <td key={r.participant_id} style={{ padding: '8px 2px', textAlign: 'center', fontWeight: 700 }}>
                  {r.rank}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </ExportCanvas>
  );
}
