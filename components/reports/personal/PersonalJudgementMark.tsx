'use client';

import type { Judgement } from '@/lib/report-data/types';

/** 採点マークのインク色 */
export const PERSONAL_JUDGEMENT_MARK: Record<Judgement, { ink: string; rail: string }> = {
  correct: { ink: '#2a6b42', rail: '#3d8f58' },
  partial: { ink: '#8a6e18', rail: '#b8942e' },
  wrong: { ink: '#9a3a3a', rail: '#b85555' },
  unjudged: { ink: '#6a6570', rail: '#9a959c' },
};

/**
 * 同じ viewBox 内に描いた SVG マーク（○△×のフォント差を排除）。
 * セル中央に固定サイズで配置。html2canvas 向けに transform 不使用。
 */
export function PersonalJudgementMark({
  judgement,
  rowH,
}: {
  judgement: Judgement;
  rowH: number;
  size?: number;
  top?: number;
  right?: number;
}) {
  const mark = PERSONAL_JUDGEMENT_MARK[judgement];
  // 行高に対して一定比率。全セルで同じ計算 → サイズ統一
  const box = Math.round(rowH * 0.82);
  const top = Math.max(0, Math.round((rowH - box) / 2));

  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top,
        // 右端に寄せ、少しだけ切らせる＝スタンプ風の意図的な配置
        right: -Math.round(box * 0.18),
        width: box,
        height: box,
        opacity: 0.1,
        pointerEvents: 'none',
      }}
    >
      <JudgementMarkSvg judgement={judgement} color={mark.ink} />
    </span>
  );
}

function JudgementMarkSvg({ judgement, color }: { judgement: Judgement; color: string }) {
  const common = {
    width: '100%',
    height: '100%',
    viewBox: '0 0 64 64',
    fill: 'none' as const,
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  };

  // すべて中心 (32,32) 基準・外接円半径 ~24 で視覚サイズを揃える
  if (judgement === 'correct') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="22" stroke={color} strokeWidth="5" />
      </svg>
    );
  }

  if (judgement === 'partial') {
    // 正三角形。重心が viewBox 中央付近に来るよう上寄せ
    return (
      <svg {...common}>
        <path
          d="M32 6 L54 48 L10 48 Z"
          stroke={color}
          strokeWidth="5"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (judgement === 'wrong') {
    return (
      <svg {...common}>
        <path
          d="M16 16 L48 48 M48 16 L16 48"
          stroke={color}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // unjudged: 短い横線
  return (
    <svg {...common}>
      <path d="M18 32 H46" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** セル左端の色レール */
export function personalJudgementRail(judgement: Judgement): string {
  return PERSONAL_JUDGEMENT_MARK[judgement].rail;
}
