'use client';

import { JUDGEMENT_STYLES } from '@/lib/report-export/theme';
import type { Judgement } from '@/lib/report-data/types';

export function ScoringItemCell({ item }: { item: { answer: string; truth: string; judgement: Judgement; earnedScore: number } }) {
  const style = JUDGEMENT_STYLES[item.judgement];
  return (
    <td style={{ padding: 6, verticalAlign: 'top', background: style.bg, position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          right: 6,
          top: 4,
          fontSize: 28,
          opacity: 0.12,
          fontWeight: 900,
          color: style.color,
          lineHeight: 1,
        }}
        aria-hidden
      >
        {style.symbol}
      </span>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, paddingRight: 20 }}>{item.answer}</div>
      <div style={{ fontSize: 11, color: '#555', marginTop: 4, lineHeight: 1.3 }}>
        / {item.truth}（{item.earnedScore}pt）
      </div>
    </td>
  );
}
