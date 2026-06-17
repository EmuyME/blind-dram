'use client';

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

function parsePadding(padding: string): { top: string; right: string; bottom: string; left: string } {
  const parts = padding.trim().split(/\s+/);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
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
  const pad = parsePadding(layout.cellPadding);

  return (
    <td
      style={{
        position: 'relative',
        padding: 0,
        verticalAlign: 'middle',
        textAlign: 'left',
        background: bg,
        borderBottom: `1px solid ${PERSONAL_V1.rule}`,
        minHeight: layout.rowH,
        height: layout.rowH,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      <div
        style={{
          boxSizing: 'border-box',
          minHeight: layout.rowH,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: pad.top,
          paddingBottom: pad.bottom,
          paddingLeft: pad.left,
          paddingRight: layout.padRight,
        }}
      >
        <div style={{ fontSize: layout.answerFs, fontWeight: 700, lineHeight: 1.25, color: PERSONAL_V1.ink }}>{item.answer}</div>
        <div style={{ marginTop: 4, fontSize: layout.metaFs, lineHeight: 1.25, color: PERSONAL_V1.inkMuted }}>
          / {item.truth}（{item.earnedScore}pt）
        </div>
      </div>
      <span
        style={{
          position: 'absolute',
          top: '50%',
          right: 6,
          transform: 'translateY(-50%)',
          width: layout.badgeSize,
          height: layout.badgeSize,
          borderRadius: '50%',
          background: badge.badgeBg,
          color: '#fff',
          fontSize: layout.badgeSize <= 20 ? 10 : 11,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
        aria-hidden
      >
        {badge.symbol}
      </span>
    </td>
  );
}
