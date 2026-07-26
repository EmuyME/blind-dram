'use client';

import { FlavorTier2SuggestChips } from '@/components/flavor/FlavorTier2SuggestChips';
import { clampTier1Intensity } from '@/lib/json-helpers';

export type FlavorSectionData = {
  tier1_tags: string[];
  tier2_terms: string[];
  /** Tier1 タグごとの強さ 1（弱）〜5（強） */
  tier1_intensity?: Record<string, number>;
  text?: string;
};

export type FlavorTastingValue = {
  nose?: FlavorSectionData;
  palate?: FlavorSectionData;
  finish?: FlavorSectionData;
};

type Section = 'nose' | 'palate' | 'finish';

function norm(s?: FlavorSectionData): FlavorSectionData {
  const tier1_tags = s?.tier1_tags || [];
  const rawInt = s?.tier1_intensity || {};
  const tier1_intensity: Record<string, number> = {};
  for (const tag of tier1_tags) {
    const v = rawInt[tag];
    tier1_intensity[tag] =
      v !== undefined && v !== null ? clampTier1Intensity(v) : 3;
  }
  return {
    tier1_tags,
    tier2_terms: s?.tier2_terms || [],
    tier1_intensity,
    text: s?.text || '',
  };
}

type Props = {
  tier1Options: string[];
  tier2Suggestions: Record<string, string[]>;
  value: FlavorTastingValue;
  disabled?: boolean;
  /** 進捗ジャンプ用（例: section-nose） */
  sectionIdPrefix?: string;
  onChange: (next: FlavorTastingValue) => void;
};

export function FlavorTastingSections({
  tier1Options,
  tier2Suggestions,
  value,
  disabled = false,
  sectionIdPrefix = 'section',
  onChange,
}: Props) {
  const merge = (section: Section, patch: Partial<FlavorSectionData>) => {
    const cur = norm(value[section]);
    onChange({
      ...value,
      [section]: { ...cur, ...patch },
    });
  };

  const toggleTier1 = (section: Section, tag: string) => {
    const cur = norm(value[section]);
    const selecting = !cur.tier1_tags.includes(tag);
    const tier1_tags = selecting
      ? [...cur.tier1_tags, tag]
      : cur.tier1_tags.filter((t) => t !== tag);
    const tier1_intensity = { ...cur.tier1_intensity };
    if (selecting) {
      tier1_intensity[tag] = tier1_intensity[tag] ?? 3;
    } else {
      delete tier1_intensity[tag];
    }
    merge(section, { tier1_tags, tier1_intensity });
  };

  const setTier1Intensity = (section: Section, tag: string, level: number) => {
    const cur = norm(value[section]);
    if (!cur.tier1_tags.includes(tag)) return;
    merge(section, {
      tier1_intensity: { ...cur.tier1_intensity, [tag]: clampTier1Intensity(level) },
    });
  };

  const toggleTier2 = (section: Section, term: string) => {
    const t = term.trim();
    if (!t) return;
    const cur = norm(value[section]);
    const tier2_terms = cur.tier2_terms.includes(t)
      ? cur.tier2_terms.filter((x) => x !== t)
      : [...cur.tier2_terms, t];
    merge(section, { tier2_terms });
  };

  const renderSection = (section: Section, title: string, tier2Placeholder: string) => {
    const cur = norm(value[section]);
    return (
      <div
        id={`${sectionIdPrefix}-${section}`}
        className="ui-card p-6 space-y-4 scroll-mt-24"
      >
        <h2 className="text-xl font-semibold text-stone-100 tracking-tight">{title}</h2>

        <div>
          <label className="block text-base font-medium text-stone-100 mb-2">Tier1（複数選択可）</label>
          <div className="flex flex-wrap gap-2">
            {tier1Options.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTier1(section, tag)}
                disabled={disabled}
                className={`px-4 py-2 rounded-full min-h-[44px] font-medium transition-all disabled:opacity-50 ${
                  cur.tier1_tags.includes(tag)
                    ? 'bg-bd-ink text-bd-paper'
                    : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {cur.tier1_tags.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4 space-y-3">
            <p className="text-sm font-medium text-stone-200">Tier1 の強さ（1＝弱い 〜 5＝強い）</p>
            <p className="text-xs text-stone-500">各項目を選んだら、同じラウンド内の Nose / Palate / Finish ごとに 5 段階を付けます。</p>
            <div className="space-y-3">
              {cur.tier1_tags.map((tag) => {
                const level =
                  cur.tier1_intensity?.[tag] != null
                    ? clampTier1Intensity(cur.tier1_intensity[tag])
                    : 3;
                return (
                  <div
                    key={tag}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="text-stone-200 text-sm font-medium shrink-0 min-w-[8rem]">
                      {tag}
                    </span>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${tag} の強さ`}>
                      {([1, 2, 3, 4, 5] as const).map((lv) => (
                        <button
                          key={lv}
                          type="button"
                          disabled={disabled}
                          onClick={() => setTier1Intensity(section, tag, lv)}
                          className={`min-h-[40px] min-w-[40px] rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                            level === lv
                              ? 'bg-bd-ink text-bd-paper ring-2 ring-bd-accent/50 ring-offset-2 ring-offset-neutral-900'
                              : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                          }`}
                        >
                          {lv}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="block text-base font-medium text-stone-100 mb-2">Tier2（登録リストから選択）</label>
          <FlavorTier2SuggestChips
            selectedTier1Tags={cur.tier1_tags}
            tier2Suggestions={tier2Suggestions}
            selectedTier2Terms={cur.tier2_terms}
            onToggleTerm={(term) => toggleTier2(section, term)}
            disabled={disabled}
          />
          <div>
            <label className="block text-sm font-medium text-stone-200 mb-1">
              リストにない語（カンマ区切りで追記）
            </label>
            <input
              type="text"
              value={cur.tier2_terms.join(', ')}
              onChange={(e) =>
                merge(section, {
                  tier2_terms: e.target.value.split(',').map((s) => s.trim()).filter((s) => s),
                })
              }
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder={tier2Placeholder}
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <label className="block text-base font-medium text-stone-100 mb-2">コメント（任意）</label>
          <textarea
            value={cur.text || ''}
            onChange={(e) => merge(section, { text: e.target.value })}
            className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[100px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="テイスティングの感想を自由に入力"
            disabled={disabled}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {renderSection('nose', 'Nose（香り）', '例: レモン, バニラ')}
      {renderSection('palate', 'Palate（味わい）', '例: オレンジ, キャラメル')}
      {renderSection('finish', 'Finish（余韻）', '例: キャラメル, オーク')}
    </>
  );
}
