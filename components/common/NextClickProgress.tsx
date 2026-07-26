'use client';

import { disambiguatedDisplayName } from '@/lib/participant-display';

type Person = { participant_id: string; display_name: string };

/** 「次へ」待ちの進捗：押した人 / 未押下を並べて見せる */
export function NextClickProgress({
  clickedCount,
  totalCount,
  notClicked,
  clicked,
  peers,
}: {
  clickedCount: number;
  totalCount: number;
  notClicked: Person[];
  clicked?: Person[];
  peers: Array<{ participant_id: string; display_name: string }>;
}) {
  const pct = totalCount > 0 ? Math.round((clickedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-200">次へ待ち</p>
        <p className="text-sm text-stone-400 tabular-nums">
          {clickedCount}/{totalCount}人（{pct}%）
        </p>
      </div>
      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-bd-accent/80 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-300/90 mb-2">押した（{clickedCount}）</p>
          {clicked && clicked.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {clicked.map((p) => (
                <span
                  key={p.participant_id}
                  className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-xs text-emerald-100"
                >
                  {disambiguatedDisplayName(p.display_name, p.participant_id, peers)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500">まだいません</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-300/90 mb-2">未押下（{notClicked.length}）</p>
          {notClicked.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {notClicked.map((p) => (
                <span
                  key={p.participant_id}
                  className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 text-xs text-amber-100"
                >
                  {disambiguatedDisplayName(p.display_name, p.participant_id, peers)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500">全員完了</p>
          )}
        </div>
      </div>
    </div>
  );
}
