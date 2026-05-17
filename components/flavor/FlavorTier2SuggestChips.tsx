'use client';

type Props = {
  /** 現在選ばれている Tier1（この順でブロックを並べる） */
  selectedTier1Tags: string[];
  /** セッションの flavor_chart.tier2_suggestions */
  tier2Suggestions: Record<string, string[]>;
  /** 現在の Tier2 語の一覧 */
  selectedTier2Terms: string[];
  onToggleTerm: (term: string) => void;
  disabled?: boolean;
};

/**
 * Tier1 ごとに紐づく Tier2 候補をチップ表示。タップで tier2_terms に追加・削除。
 */
export function FlavorTier2SuggestChips({
  selectedTier1Tags,
  tier2Suggestions,
  selectedTier2Terms,
  onToggleTerm,
  disabled,
}: Props) {
  const hasAny = selectedTier1Tags.some((t1) => (tier2Suggestions[t1]?.length ?? 0) > 0);

  if (!hasAny) {
    const hint =
      selectedTier1Tags.length === 0
        ? 'Tier1 を選ぶと、あらかじめ登録した Tier2 候補がここに表示されます。'
        : '選択中の Tier1 には登録された Tier2 候補がありません。下の欄から入力してください。';
    return <p className="text-sm text-stone-500 leading-relaxed">{hint}</p>;
  }

  return (
    <div className="space-y-4">
      {selectedTier1Tags.map((t1) => {
        const suggestions = tier2Suggestions[t1];
        if (!suggestions?.length) return null;
        return (
          <div key={t1} className="rounded-xl border border-white/10 bg-neutral-900/40 p-3">
            <div className="text-xs font-semibold text-stone-400 mb-2 tracking-wide">{t1}</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((term) => {
                const on = selectedTier2Terms.includes(term);
                return (
                  <button
                    key={`${t1}-${term}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleTerm(term)}
                    className={`px-3 py-2 rounded-full min-h-[40px] text-sm font-medium transition-all disabled:opacity-50 ${
                      on
                        ? 'bg-[#C88A2B] text-black/90'
                        : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                    }`}
                  >
                    {term}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
