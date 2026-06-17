'use client';

import { CaptureVAlign, scoreCellContentH } from '@/components/reports/personal/capture-align';
import { PERSONAL_JUDGEMENT_BG, PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';
import type { Judgement } from '@/lib/report-data/types';
import { JUDGEMENT_STYLES } from '@/lib/report-export/theme';

export type PersonalScoreCellLayout = {
  rowH: number;
  answerFs: number;
  metaFs: number;
  padRight: number;
  badgeSize: number;
  cellPadding: string;
};

function hPadOnly(padding: string, padRight: number): string {
  // Return left padding from the original padding string, override right with padRight
  const parts = padding.trim().split(/\s+/);
  const left = parts.length >= 4 ? parts[3] : parts.length === 2 ? parts[1] : parts[0];
  return `0 ${padRight}px 0 ${left}`;
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
  const contentH = scoreCellContentH(layout.answerFs, layout.metaFs);
  const badgeTop = Math.max(6, Math.round((layout.rowH - layout.badgeSize) / 2));

  return (
    <td
      style={{
        position: 'relative',
        padding: 0,
        verticalAlign: 'top',
        textAlign: 'left',
        background: bg,
        borderBottom: `1px solid ${PERSONAL_V1.rule}`,
        height: layout.rowH,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      <CaptureVAlign
        height={layout.rowH}
        contentH={contentH}
        padding={hPadOnly(layout.cellPadding, layout.padRight)}
        align="left"
      >
        <div>
          <div style={{ fontSize: layout.answerFs, fontWeight: 700, lineHeight: 1.25, color: PERSONAL_V1.ink }}>
            {item.answer}
          </div>
          <div style={{ marginTop: 4, fontSize: layout.metaFs, lineHeight: 1.25, color: PERSONAL_V1.inkMuted }}>
            / {item.truth}（{item.earnedScore}pt）
          </div>
        </div>
      </CaptureVAlign>
      <span
        style={{
          position: 'absolute',
          top: badgeTop,
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
