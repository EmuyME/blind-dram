'use client';

import { JUDGEMENT_STYLES, type ReportTheme } from '@/lib/report-export/theme';
import { REPORT_LINE, REPORT_TYPE } from '@/lib/report-export/typography';
import type { Judgement } from '@/lib/report-data/types';

export function ScoringItemCell({
  item,
  theme,
  compact = false,
}: {
  item: { answer: string; truth: string; judgement: Judgement; earnedScore: number };
  theme: ReportTheme;
  compact?: boolean;
}) {
  const s = JUDGEMENT_STYLES[item.judgement];
  return (
    <td
      style={{
        padding: compact ? '6px 22px 6px 4px' : '8px 26px 8px 6px',
        verticalAlign: 'middle',
        background: s.bg,
        borderBottom: `1px solid ${theme.rule}`,
        position: 'relative',
        textAlign: 'center',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      <div
        style={{
          fontSize: compact ? REPORT_TYPE.answerMeta : REPORT_TYPE.answer,
          fontWeight: 700,
          lineHeight: REPORT_LINE.tight,
          color: theme.ink,
        }}
      >
        {item.answer}
      </div>
      <div style={{ marginTop: 2, fontSize: REPORT_TYPE.answerMeta, color: theme.inkMuted, lineHeight: REPORT_LINE.tight }}>
        {item.truth}（{item.earnedScore}pt）
      </div>
      <span
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: compact ? 18 : 20,
          height: compact ? 18 : 20,
          borderRadius: '50%',
          background: s.badgeBg,
          color: '#fff',
          fontSize: compact ? 10 : 11,
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
