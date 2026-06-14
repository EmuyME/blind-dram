'use client';

import { ExportCanvas } from '@/components/results/export/ExportCanvas';
import {
  exportColors,
  formatGuessSummary,
  formatTruthLines,
  truncateText,
} from '@/lib/results-export-design';
import { formatSampleHeadingLabel } from '@/lib/json-helpers';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import type { ResultsPosterData, ResultsPosterSampleDetail } from '@/lib/results-poster';

function BottleImage({ url, alt }: { url?: string | null; alt: string }) {
  const w = 200;
  const h = 260;
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        style={{
          width: w,
          height: h,
          objectFit: 'cover',
          borderRadius: 12,
          border: `2px solid ${exportColors.rule}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        border: `2px dashed ${exportColors.rule}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: exportColors.inkLight,
        fontSize: 16,
        background: 'rgba(255,255,255,0.35)',
        flexShrink: 0,
      }}
    >
      写真なし
    </div>
  );
}

export function ResultsArchiveSampleCard({
  results,
  sample,
  pageIndex,
  totalPages,
}: {
  results: ResultsPosterData;
  sample: ResultsPosterSampleDetail;
  pageIndex: number;
  totalPages: number;
}) {
  const snap = sample.scoring_snapshot ?? results.scoring_snapshot;
  const truth = sample.truth;
  const peers = sample.participant_answers.map((a) => ({
    participant_id: a.participant_id,
    display_name: a.display_name,
  }));
  const truthLines = formatTruthLines(snap, truth);
  const notes = (truth.notes ?? '').trim();

  return (
    <ExportCanvas
      exportKind="archive"
      pageLabel={`${formatSampleHeadingLabel(sample.sample_label)} (${pageIndex}/${totalPages})`}
    >
      <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
        <BottleImage url={truth.bottle_image_url} alt={sample.sample_label} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 30,
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: exportColors.ink,
              lineHeight: 1.2,
            }}
          >
            {formatSampleHeadingLabel(sample.sample_label)}
          </h2>
          {sample.presenter_name && (
            <p style={{ margin: '6px 0 0', fontSize: 18, color: exportColors.inkMuted }}>
              持ち込み: {sample.presenter_name}
            </p>
          )}
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.55)',
              borderRadius: 10,
              border: `1px solid ${exportColors.rule}`,
            }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: exportColors.accentDark }}>正解</p>
            {truthLines.map((line) => (
              <p key={line} style={{ margin: '3px 0', fontSize: 17, lineHeight: 1.35 }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <p style={{ margin: '0 0 16px', fontSize: 17, color: exportColors.inkMuted, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>メモ: </span>
          {truncateText(notes, 100)}
        </p>
      )}

      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${exportColors.rule}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 17 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.65)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', width: '28%' }}>参加者</th>
              <th style={{ padding: '8px 6px', textAlign: 'right', width: 48 }}>点</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>推測</th>
            </tr>
          </thead>
          <tbody>
            {sample.participant_answers.map((a) => (
              <tr key={a.participant_id} style={{ borderTop: `1px solid ${exportColors.rule}` }}>
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                  {disambiguatedDisplayName(a.display_name, a.participant_id, peers)}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: exportColors.accentDark }}>
                  {a.score}
                </td>
                <td style={{ padding: '8px 10px', color: exportColors.inkMuted, lineHeight: 1.3 }}>
                  {formatGuessSummary(snap, a)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ExportCanvas>
  );
}
