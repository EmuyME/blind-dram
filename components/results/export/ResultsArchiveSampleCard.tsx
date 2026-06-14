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
import {
  flavorCommentRowHasContent,
  flavorSectionHasContent,
  resultsHaveAnyFlavorComments,
  type ResultsPosterData,
  type ResultsPosterFlavorSection,
  type ResultsPosterSampleDetail,
} from '@/lib/results-poster';

function FlavorCell({ section }: { section: ResultsPosterFlavorSection }) {
  if (!flavorSectionHasContent(section)) return <>—</>;
  const tier1 = (section.tier1_tags ?? []).join('、');
  const tier2 = (section.tier2_terms ?? []).join('、');
  const text = (section.text ?? '').trim();
  const combined = [tier1, tier2, text].filter(Boolean).join(' / ');
  return <>{truncateText(combined, 36)}</>;
}

function BottleImage({ url, alt }: { url?: string | null; alt: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        style={{
          width: 280,
          height: 360,
          objectFit: 'cover',
          borderRadius: 16,
          border: `3px solid ${exportColors.rule}`,
          boxShadow: '0 12px 32px rgba(44,36,24,0.12)',
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 280,
        height: 360,
        borderRadius: 16,
        border: `2px dashed ${exportColors.rule}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: exportColors.inkLight,
        fontSize: 20,
        background: 'rgba(255,255,255,0.35)',
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
  const includeFlavors = resultsHaveAnyFlavorComments(results);
  const notes = (truth.notes ?? '').trim();

  return (
    <ExportCanvas
      exportKind="archive"
      pageLabel={`${formatSampleHeadingLabel(sample.sample_label)} (${pageIndex}/${totalPages})`}
    >
      <div style={{ display: 'flex', gap: 32, marginBottom: 28 }}>
        <BottleImage url={truth.bottle_image_url} alt={sample.sample_label} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 36,
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: exportColors.ink,
            }}
          >
            {formatSampleHeadingLabel(sample.sample_label)}
          </h2>
          {sample.presenter_name && (
            <p style={{ margin: '8px 0 0', fontSize: 22, color: exportColors.inkMuted }}>
              持ち込み: {sample.presenter_name}
            </p>
          )}
          <div
            style={{
              marginTop: 20,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.55)',
              borderRadius: 12,
              border: `1px solid ${exportColors.rule}`,
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: exportColors.accentDark }}>正解</p>
            {truthLines.map((line) => (
              <p key={line} style={{ margin: '4px 0', fontSize: 20, lineHeight: 1.35 }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <p style={{ margin: '0 0 20px', fontSize: 20, color: exportColors.inkMuted, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>メモ: </span>
          {truncateText(notes, 120)}
        </p>
      )}

      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${exportColors.rule}`, marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 19 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.65)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>参加者</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', width: 56 }}>点</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>推測</th>
            </tr>
          </thead>
          <tbody>
            {sample.participant_answers.map((a) => (
              <tr key={a.participant_id} style={{ borderTop: `1px solid ${exportColors.rule}` }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                  {disambiguatedDisplayName(a.display_name, a.participant_id, peers)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: exportColors.accentDark }}>
                  {a.score}
                </td>
                <td style={{ padding: '10px 12px', color: exportColors.inkMuted }}>
                  {formatGuessSummary(snap, a)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {includeFlavors && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: exportColors.accentDark }}>
            フレーバーコメント
          </p>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${exportColors.rule}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.65)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>参加者</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>N</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>P</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>F</th>
                </tr>
              </thead>
              <tbody>
                {(sample.comments ?? [])
                  .filter((c) => flavorCommentRowHasContent(c))
                  .map((c) => (
                    <tr key={c.participant_id} style={{ borderTop: `1px solid ${exportColors.rule}` }}>
                      <td style={{ padding: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {disambiguatedDisplayName(c.display_name, c.participant_id, peers)}
                      </td>
                      <td style={{ padding: '8px', color: exportColors.inkMuted }}>
                        <FlavorCell section={c.nose} />
                      </td>
                      <td style={{ padding: '8px', color: exportColors.inkMuted }}>
                        <FlavorCell section={c.palate} />
                      </td>
                      <td style={{ padding: '8px', color: exportColors.inkMuted }}>
                        <FlavorCell section={c.finish} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ExportCanvas>
  );
}
