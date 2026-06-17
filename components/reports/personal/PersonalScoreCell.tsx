'use client';

import { CaptureVAlign } from '@/components/reports/personal/capture-align';
import { PERSONAL_JUDGEMENT_BG } from '@/components/reports/personal/personal-tokens';
import type { Judgement } from '@/lib/report-data/types';
import { JUDGEMENT_STYLES } from '@/lib/report-export/theme';
import { PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';

export type PersonalScoreCellLayout = {
  rowH: number;
  answerFs: number;
  metaFs: number;
  padRight: number;
  badgeSize: number;
  cellPadding: string;
};

function cellPadding(padding: string, padRight: number): string {
  const parts = padding.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0]} ${padRight}px ${parts[0]} ${parts[0]}`;
  if (parts.length === 2) return `${parts[0]} ${padRight}px ${parts[0]} ${parts[1]}`;
  if (parts.length === 3) return `${parts[0]} ${padRight}px ${parts[2]} ${parts[1]}`;
  return `${parts[0]} ${padRight}px ${parts[2]} ${parts[3]}`;
}

/** 個人レポート回答セル：上段回答・下段正答、左揃え、バッジ右上 */
export function PersonalScoreCell({
  item,
  layout,
}: {
  item: { answer: string; truth: string; judgement: Judgement; earnedScore: number };
  layout: PersonalScoreCellLayout;
}) {
  const badge = JUDGEMENT_STYLES[item.judgement];
  const bg = PERSONAL_JUDGEMENT_BG[item.judgement];

  return (
    <td
      style={{
        position: 'relative',
        padding: 0,
        verticalAlign: 'middle',
        textAlign: 'left',
        background: bg,
        borderBottom: `1px solid ${PERSONAL_V1.rule}`,
        height: layout.rowH,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      <CaptureVAlign height={layout.rowH} padding={cellPadding(layout.cellPadding, layout.padRight)} align="left">
        <div style={{ fontSize: layout.answerFs, fontWeight: 700, lineHeight: 1.25, color: PERSONAL_V1.ink }}>{item.answer}</div>
        <div style={{ marginTop: 4, fontSize: layout.metaFs, lineHeight: 1.25, color: PERSONAL_V1.inkMuted }}>
          / {item.truth}（{item.earnedScore}pt）
        </div>
      </CaptureVAlign>
      <span
        style={{
          position: 'absolute',
          top: Math.max(6, Math.round((layout.rowH - layout.badgeSize) / 2)),
          right: 8,
          width: layout.badgeSize,
          height: layout.badgeSize,
          borderRadius: '50%',
          background: badge.badgeBg,
          color: '#fff',
          fontSize: layout.badgeSize <= 20 ? 10 : 11,
          fontWeight: 800,
          lineHeight: `${layout.badgeSize}px`,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
        aria-hidden
      >
        {badge.symbol}
      </span>
    </td>
  );
}
