'use client';

import { JUDGEMENT_STYLES } from '@/lib/report-export/theme';
import { REPORT_LINE, REPORT_TYPE } from '@/lib/report-export/typography';
import type { Judgement } from '@/lib/report-data/types';

export function ScoringItemCell({
  item,
}: {
  item: { answer: string; truth: string; judgement: Judgement; earnedScore: number };
}) {
  const style = JUDGEMENT_STYLES[item.judgement];
  return (
    <td
      style={{
        padding: '10px 8px',
        verticalAlign: 'top',
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        position: 'relative',
        minWidth: 96,
      }}
    >
      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
        <span
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: style.badgeBg,
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            marginTop: 1,
          }}
          aria-hidden
        >
          {style.symbol}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: REPORT_TYPE.answer,
              fontWeight: 700,
              lineHeight: REPORT_LINE.tight,
              color: '#1a1a1a',
              wordBreak: 'break-word',
            }}
          >
            {item.answer}
          </div>
          <div
            style={{
              fontSize: REPORT_TYPE.answerMeta,
              color: '#5a5a5a',
              marginTop: 3,
              lineHeight: REPORT_LINE.tight,
              wordBreak: 'break-word',
            }}
          >
            / {item.truth}（{item.earnedScore}pt）
          </div>
        </div>
      </div>
    </td>
  );
}
