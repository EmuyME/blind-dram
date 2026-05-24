"use client";

import React from 'react';

type Correctness = boolean | null | undefined;

export function CorrectnessBadge({
  value,
  size = 'sm',
  trueLabel = '正解',
  falseLabel = '不正解',
  unknownLabel = '未判定',
}: {
  value: Correctness;
  size?: 'sm' | 'md';
  trueLabel?: string;
  falseLabel?: string;
  unknownLabel?: string;
}) {
  const isTrue = value === true;
  const isFalse = value === false;
  const label = isTrue ? trueLabel : isFalse ? falseLabel : unknownLabel;
  const icon = isTrue ? '✓' : isFalse ? '✗' : '–';

  const base =
    'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight select-none whitespace-nowrap';
  const sizeClass = size === 'md' ? 'px-2.5 py-1 text-xs min-h-[24px]' : 'px-2 py-0.5 text-[11px] min-h-[20px]';

  // 色覚対応: 赤/緑の対立に依存しない配色 + 記号/ラベルで判別
  const tone = isTrue
    ? 'bg-sky-500/15 text-sky-100 border-sky-300/40'
    : isFalse
      ? 'bg-bd-accent/15 text-bd-accent-dim border-bd-accent/40 border-dashed'
      : 'bg-neutral-800/80 text-stone-300 border-white/10 border-dotted';

  return (
    <span className={`${base} ${sizeClass} ${tone}`} aria-label={label} title={label}>
      <span className="font-black" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

