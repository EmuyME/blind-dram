'use client';

import { CaptureVAlign } from '@/components/reports/personal/capture-align';
import { PersonalJudgementMark } from '@/components/reports/personal/PersonalJudgementMark';
import {
  PersonalScoreLines,
  personalScoreLinesContentH,
} from '@/components/reports/personal/PersonalScoreLines';
import { PERSONAL_JUDGEMENT_BG, PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';
import type { Judgement } from '@/lib/report-data/types';

export type PersonalScoreCellLayout = {
  rowH: number;
  answerFs: number;
  metaFs: number;
  padRight: number;
  badgeSize: number;
  cellPadding: string;
};

/** テキストまでの最低余白 */
const SCORE_PAD_LEFT_MIN = 12;

function hPadOnly(padding: string, padRight: number): string {
  const parts = padding.trim().split(/\s+/);
  const rawLeft = parts.length >= 4 ? parts[3] : parts.length === 2 ? parts[1] : parts[0];
  const parsed = parseInt(String(rawLeft), 10);
  const left = Math.max(Number.isFinite(parsed) ? parsed : 10, SCORE_PAD_LEFT_MIN);
  const right = Math.max(padRight > 24 ? 10 : 8, 10);
  return `0 ${right}px 0 ${left}px`;
}

/** 個人レポート回答セル：上段＝提出、下段＝正答＋得点（ラベルなし） */
export function PersonalScoreCell({
  item,
  layout,
}: {
  item: { answer: string; truth: string; judgement: Judgement; earnedScore: number };
  layout: PersonalScoreCellLayout;
}) {
  const bg = PERSONAL_JUDGEMENT_BG[item.judgement];
  const contentH = personalScoreLinesContentH(layout.answerFs, layout.metaFs);

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
        overflow: 'hidden',
      }}
    >
      <PersonalJudgementMark judgement={item.judgement} rowH={layout.rowH} />
      <CaptureVAlign
        height={layout.rowH}
        contentH={contentH}
        padding={hPadOnly(layout.cellPadding, layout.padRight)}
        align="left"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <PersonalScoreLines
          answer={item.answer}
          truth={item.truth}
          earnedScore={item.earnedScore}
          judgement={item.judgement}
          answerFs={layout.answerFs}
          metaFs={layout.metaFs}
        />
      </CaptureVAlign>
    </td>
  );
}
