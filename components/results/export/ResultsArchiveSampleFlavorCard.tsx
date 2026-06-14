'use client';

import { ExportCanvas } from '@/components/results/export/ExportCanvas';
import { exportColors, truncateText } from '@/lib/results-export-design';
import { formatSampleHeadingLabel } from '@/lib/json-helpers';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import {
  flavorCommentRowHasContent,
  flavorSectionHasContent,
  type ResultsPosterFlavorSection,
  type ResultsPosterSampleDetail,
} from '@/lib/results-poster';

function FlavorLine({ label, section }: { label: string; section: ResultsPosterFlavorSection }) {
  if (!flavorSectionHasContent(section)) return null;
  const tier1 = (section.tier1_tags ?? []).join('、');
  const tier2 = (section.tier2_terms ?? []).join('、');
  const text = (section.text ?? '').trim();
  const body = [tier1, tier2, text].filter(Boolean).join(' / ');
  return (
    <p style={{ margin: '4px 0 0', fontSize: 16, color: exportColors.inkMuted, lineHeight: 1.35 }}>
      <span style={{ fontWeight: 700, color: exportColors.accentDark }}>{label}: </span>
      {truncateText(body, 80)}
    </p>
  );
}

export function ResultsArchiveSampleFlavorCard({
  sample,
  pageIndex,
  totalPages,
}: {
  sample: ResultsPosterSampleDetail;
  pageIndex: number;
  totalPages: number;
}) {
  const peers = (sample.comments ?? []).map((c) => ({
    participant_id: c.participant_id,
    display_name: c.display_name,
  }));
  const comments = (sample.comments ?? []).filter((c) => flavorCommentRowHasContent(c));

  return (
    <ExportCanvas
      exportKind="archive"
      pageLabel={`${formatSampleHeadingLabel(sample.sample_label)} — フレーバー (${pageIndex}/${totalPages})`}
    >
      <p style={{ margin: '0 0 20px', fontSize: 20, color: exportColors.inkMuted }}>
        このサンプルについて参加者が記入したフレーバーコメントです。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comments.map((c) => (
          <div
            key={c.participant_id}
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              border: `1px solid ${exportColors.rule}`,
              background: 'rgba(255,255,255,0.5)',
            }}
          >
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: exportColors.ink }}>
              {disambiguatedDisplayName(c.display_name, c.participant_id, peers)}
            </p>
            <FlavorLine label="Nose" section={c.nose} />
            <FlavorLine label="Palate" section={c.palate} />
            <FlavorLine label="Finish" section={c.finish} />
          </div>
        ))}
      </div>
    </ExportCanvas>
  );
}
