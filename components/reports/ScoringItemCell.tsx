'use client';

import { JUDGEMENT_STYLES } from '@/lib/report-export/theme';
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
        padding: 8,
        verticalAlign: 'top',
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: style.badgeBg,
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            marginTop: 2,
          }}
          aria-hidden
        >
          {style.symbol}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: '#1a1a1a' }}>{item.answer}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4, lineHeight: 1.35 }}>
            / {item.truth}（{item.earnedScore}pt）
          </div>
        </div>
      </div>
      <span
        style={{
          position: 'absolute',
          right: 4,
          bottom: 2,
          fontSize: 36,
          opacity: 0.06,
          fontWeight: 900,
          color: style.color,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        {style.symbol}
      </span>
    </td>
  );
}
