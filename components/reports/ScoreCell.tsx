'use client';

import { JUDGEMENT_STYLES, type ReportTheme } from '@/lib/report-export/theme';
import { REPORT_LINE, REPORT_TYPE } from '@/lib/report-export/typography';
import type { Judgement } from '@/lib/report-data/types';

/** 個人レポート回答セル：回答を大きく、正答・点数を小さく、記号で正誤表示 */
export function ScoreCell({
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
        padding: compact ? '10px 24px 10px 8px' : '12px 28px 12px 10px',
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
          fontSize: compact ? REPORT_TYPE.tableBody : REPORT_TYPE.answer,
          fontWeight: 700,
          lineHeight: REPORT_LINE.tight,
          color: theme.ink,
        }}
      >
        {item.answer}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: REPORT_TYPE.answerMeta,
          color: theme.inkMuted,
          lineHeight: REPORT_LINE.tight,
        }}
      >
        / {item.truth}（{item.earnedScore}pt）
      </div>
      <span
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
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

/** @deprecated use ScoreCell */
export const ScoringItemCell = ScoreCell;
