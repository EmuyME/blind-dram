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
        padding: layout.cellPadding,
        paddingRight: layout.padRight,
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
      <div style={{ fontSize: layout.answerFs, fontWeight: 700, lineHeight: 1.3, color: PERSONAL_V1.ink }}>{item.answer}</div>
      <div style={{ marginTop: layout.answerFs > 14 ? 5 : 3, fontSize: layout.metaFs, lineHeight: 1.3, color: PERSONAL_V1.inkMuted }}>
        / {item.truth}（{item.earnedScore}pt）
      </div>
      <span
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
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
