'use client';

import { PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';
import type { Judgement } from '@/lib/report-data/types';
import { REPORT_FONTS } from '@/lib/report-export/theme';

/** 採点者の朱筆色（正答の訂正書き込み） */
const PEN = '#b23b2e';

/**
 * 採点セルの2段テキスト。
 * 上段＝提出した回答（黒インク・太字）。
 * 下段＝採点者の朱書き（正答を赤ペンで書き添える日本の採点慣習）。
 * 正解時は訂正不要なので朱書きを出さず、得点だけを静かに添える。
 */
export function PersonalScoreLines({
  answer,
  truth,
  earnedScore,
  judgement,
  answerFs,
  metaFs,
}: {
  answer: string;
  truth: string;
  earnedScore: number;
  judgement: Judgement;
  answerFs: number;
  metaFs: number;
}) {
  const needsCorrection = judgement === 'partial' || judgement === 'wrong';

  return (
    <div>
      <div
        style={{
          fontSize: answerFs,
          fontWeight: 700,
          lineHeight: 1.2,
          color: PERSONAL_V1.ink,
          letterSpacing: '0.01em',
        }}
      >
        {answer}
      </div>
      <div style={{ marginTop: 4, lineHeight: 1.2 }}>
        {needsCorrection && (
          <span
            style={{
              fontSize: metaFs,
              fontWeight: 600,
              color: PEN,
            }}
          >
            {truth}
          </span>
        )}
        <span
          style={{
            marginLeft: needsCorrection ? 7 : 0,
            fontSize: metaFs,
            fontWeight: 700,
            fontFamily: REPORT_FONTS.serif,
            color: needsCorrection ? PEN : PERSONAL_V1.inkSoft,
            letterSpacing: '0.02em',
            opacity: needsCorrection ? 0.9 : 1,
          }}
        >
          {earnedScore}pt
        </span>
      </div>
    </div>
  );
}

/** PersonalScoreLines 用の推定高さ（縦中央計算） */
export function personalScoreLinesContentH(answerFs: number, metaFs: number): number {
  return Math.round(answerFs * 1.2) + 4 + Math.round(metaFs * 1.2);
}
