"use client";

import React from 'react';

type Flavor = {
  tier1_tags?: string[] | null;
  tier2_terms?: string[] | null;
  text?: string | null;
};

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' }) {
  const toneClass =
    tone === 'accent'
      ? 'bg-[#C88A2B]/15 text-[#E7C27B] border-[#C88A2B]/30'
      : 'bg-neutral-800 text-stone-200 border-white/10';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

export function FlavorChips({
  label,
  flavor,
  defaultCollapsed = true,
}: {
  label: string;
  flavor: Flavor | null | undefined;
  defaultCollapsed?: boolean;
}) {
  const tier1 = (flavor?.tier1_tags || []).filter(Boolean);
  const tier2 = (flavor?.tier2_terms || []).filter(Boolean);
  const text = (flavor?.text || '').trim();

  const hasAny = tier1.length > 0 || tier2.length > 0 || !!text;
  if (!hasAny) return null;

  return (
    <details className="rounded-xl border border-white/10 bg-neutral-900/30 p-3" open={!defaultCollapsed}>
      <summary className="cursor-pointer select-none flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-stone-100">{label}</span>
        <span className="text-xs text-stone-400">
          {tier1.length + tier2.length + (text ? 1 : 0)}項目
        </span>
      </summary>

      <div className="mt-3 space-y-3">
        {tier1.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-stone-400 mb-2">Tier1</div>
            <div className="flex flex-wrap gap-2">
              {tier1.map((t) => (
                <Chip key={`t1-${label}-${t}`} tone="accent">
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {tier2.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-stone-400 mb-2">Tier2</div>
            <div className="flex flex-wrap gap-2">
              {tier2.map((t) => (
                <Chip key={`t2-${label}-${t}`}>{t}</Chip>
              ))}
            </div>
          </div>
        )}

        {!!text && (
          <div>
            <div className="text-xs font-semibold text-stone-400 mb-2">コメント</div>
            <div className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">{text}</div>
          </div>
        )}
      </div>
    </details>
  );
}

