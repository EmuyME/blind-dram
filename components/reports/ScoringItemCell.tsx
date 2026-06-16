'use client';

import { JUDGEMENT_STYLES } from '@/lib/report-export/theme';
import { REPORT_LINE, REPORT_TYPE } from '@/lib/report-export/typography';
import type { Judgement } from '@/lib/report-data/types';

export function ScoringItemCell({
  item,
}: {
  item: { answer: string; truth: string; judgement: Judgement; earnedScore: number };
}) {
  const s = JUDGEMENT_STYLES[item.judgement];
  return (
    <td
      style={{
        padding: '10px 28px 10px 8px',
        verticalAlign: 'middle',
        background: s.bg,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'relative',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: REPORT_TYPE.answer, fontWeight: 700, lineHeight: REPORT_LINE.tight, color: '#111' }}>
        {item.answer}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: REPORT_TYPE.answerMeta,
          color: '#444',
          lineHeight: REPORT_LINE.tight,
        }}
      >
        {item.truth}（{item.earnedScore}pt）
      </div>
      <span
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: s.badgeBg,
          color: '#fff',
          fontSize: 13,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
        aria-hidden
      >
        {s.symbol}
      </span>
    </td>
  );
}
