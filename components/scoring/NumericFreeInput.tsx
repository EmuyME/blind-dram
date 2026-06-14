'use client';

import { useState } from 'react';

type Props = {
  name: string;
  label: string;
  value: string | number | null | undefined;
  onChange: (next: string | undefined) => void;
  disabled?: boolean;
  decimal?: boolean;
  min?: number;
  max?: number;
  className?: string;
};

function valueToDraft(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

/** iOS/Android で type=number の制御値が固まるのを避ける自由数値入力 */
export function NumericFreeInput({
  name,
  label,
  value,
  onChange,
  disabled,
  decimal = false,
  min,
  max,
  className,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(() => valueToDraft(value));
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue && !isFocused) {
    setPrevValue(value);
    setDraft(valueToDraft(value));
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim().replace(/%/g, '');
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n)) {
      onChange(undefined);
      return;
    }
    if (min != null && n < min) return;
    if (max != null && n > max) return;
    if (decimal) {
      onChange(String(Math.round(n * 10) / 10));
    } else {
      onChange(String(Math.trunc(n)));
    }
  };

  const baseClass =
    className ??
    'w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50';

  return (
    <div>
      <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        name={name}
        autoComplete="off"
        enterKeyHint="done"
        value={draft}
        disabled={disabled}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          commit(draft);
        }}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '' || /^-?\d*\.?\d*$/.test(next)) {
            setDraft(next);
          }
        }}
        className={baseClass}
      />
    </div>
  );
}
