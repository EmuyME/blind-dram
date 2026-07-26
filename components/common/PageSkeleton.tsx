'use client';

/** 主要画面の初期読み込み用スケルトン */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4" aria-busy="true" aria-label="読み込み中">
      <div className="max-w-2xl mx-auto mt-8 space-y-4 animate-pulse">
        <div className="h-8 w-2/3 rounded-lg bg-neutral-800" />
        <div className="h-4 w-1/3 rounded bg-neutral-800/80" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-neutral-800/60 p-6 space-y-3"
          >
            <div className="h-4 w-1/2 rounded bg-neutral-700" />
            <div className="h-3 w-full rounded bg-neutral-700/70" />
            <div className="h-3 w-5/6 rounded bg-neutral-700/50" />
            <div className="mt-4 h-11 w-full rounded-xl bg-neutral-700/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
