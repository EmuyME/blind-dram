'use client';

import { useCallback, useEffect, useState } from 'react';

type ParticipantRow = {
  id: string;
  display_name: string;
  brought_count: number;
};

/** 登録待ち中に参加者数・名簿をポーリング表示 */
export function RegistrationWaitingList({
  joinToken,
  highlightName,
}: {
  joinToken: string;
  highlightName?: string | null;
}) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!joinToken) return;
    try {
      const res = await fetch(`/api/participants/list?join_token=${encodeURIComponent(joinToken)}`);
      const result = await res.json();
      if (res.ok && Array.isArray(result.data?.participants)) {
        setParticipants(result.data.participants);
      }
    } catch {
      // サイレント（次ポーリングで再試行）
    } finally {
      setLoaded(true);
    }
  }, [joinToken]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className="ui-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-stone-100 tracking-tight">参加状況</h3>
        <span className="text-sm text-stone-400 tabular-nums">
          {loaded ? `${participants.length}人` : '…'}
        </span>
      </div>
      {!loaded ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 rounded-lg bg-neutral-800" />
          <div className="h-8 rounded-lg bg-neutral-800/70" />
        </div>
      ) : participants.length === 0 ? (
        <p className="text-sm text-stone-400 leading-relaxed">まだ参加者がいません。オーナーが締め切るまでお待ちください。</p>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto">
          {participants.map((p) => {
            const isMe = Boolean(highlightName && p.display_name === highlightName);
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 min-h-[44px] ${
                  isMe
                    ? 'border-bd-accent/40 bg-bd-accent/10'
                    : 'border-white/10 bg-neutral-900/40'
                }`}
              >
                <span className="text-sm font-medium text-stone-100 truncate">
                  {p.display_name}
                  {isMe && <span className="ml-2 text-xs text-bd-accent-dim">あなた</span>}
                </span>
                {p.brought_count > 0 && (
                  <span className="text-xs text-stone-400 shrink-0">持込 {p.brought_count}本</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-stone-500">数秒ごとに自動更新されます</p>
    </div>
  );
}
