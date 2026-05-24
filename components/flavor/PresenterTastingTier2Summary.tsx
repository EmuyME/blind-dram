'use client';

import type { PresenterTastingTier2BySection } from '@/lib/json-helpers';

const SEC_LABEL: Record<keyof PresenterTastingTier2BySection, string> = {
  nose: 'Nose',
  palate: 'Palate',
  finish: 'Finish',
};

export function PresenterTastingTier2Summary({ data }: { data: PresenterTastingTier2BySection }) {
  const sections = (['nose', 'palate', 'finish'] as const).filter((s) => data[s].length > 0);
  if (sections.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4 space-y-3">
      <h5 className="text-sm font-semibold text-stone-200 tracking-tight">Tier2（プレゼンター入力）</h5>
      {sections.map((sec) => (
        <div key={sec}>
          <div className="text-xs font-semibold text-stone-500 mb-1.5">{SEC_LABEL[sec]}</div>
          <div className="flex flex-wrap gap-2">
            {data[sec].map((term) => (
              <span
                key={`${sec}-${term}`}
                className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold bg-bd-accent/15 text-bd-accent-dim border-bd-accent/30"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
