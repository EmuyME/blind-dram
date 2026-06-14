"use client";

import React from 'react';

export type CorrectnessValue = boolean | 'partial' | null | undefined;

export function CorrectnessBadge({
  value,
  size = 'sm',
  trueLabel = '正解',
  falseLabel = '不正解',
  partialLabel = '部分点',
  unknownLabel = '未判定',
  partialScore,
}: {
  value: CorrectnessValue;
  size?: 'sm' | 'md';
  trueLabel?: string;
  falseLabel?: string;
  partialLabel?: string;
  unknownLabel?: string;
  partialScore?: number;
}) {
  const isTrue = value === true;
  const isFalse = value === false;
  const isPartial = value === 'partial';
  const label = isTrue
    ? trueLabel
    : isFalse
      ? falseLabel
      : isPartial
        ? partialScore != null && Number.isFinite(partialScore)
          ? `${partialLabel} (${partialScore})`
          : partialLabel
        : unknownLabel;
  const icon = isTrue ? '✓' : isFalse ? '✗' : isPartial ? '◐' : '–';

  const base =
    'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight select-none whitespace-nowrap';
  const sizeClass = size === 'md' ? 'px-2.5 py-1 text-xs min-h-[24px]' : 'px-2 py-0.5 text-[11px] min-h-[20px]';

  const tone = isTrue
    ? 'bg-sky-500/15 text-sky-100 border-sky-300/40'
    : isFalse
      ? 'bg-bd-accent/15 text-bd-accent-dim border-bd-accent/40 border-dashed'
      : isPartial
        ? 'bg-amber-500/15 text-amber-100 border-amber-300/40'
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
