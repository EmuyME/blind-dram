"use client";

interface PhaseBannerProps {
  sessionState: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published' | 'closed';
  mode: 'sequential' | 'simultaneous';
  currentSample?: { id: string; label: string };
}

export function PhaseBanner({ sessionState, mode, currentSample }: PhaseBannerProps) {
  const stateConfig = {
    registering: {
      text: '参加登録中',
      accent: '#38bdf8',
      pill: 'bg-sky-500/15 text-sky-100 border-sky-400/35',
    },
    ordering: {
      text: '順番決め中',
      accent: '#a78bfa',
      pill: 'bg-violet-500/15 text-violet-100 border-violet-400/35',
    },
    running: {
      text: '進行中',
      accent: '#c88a2b',
      pill: 'bg-amber-500/10 text-[#E7C27B] border-[#C88A2B]/40',
    },
    aggregating: {
      text: '集計中',
      accent: '#fbbf24',
      pill: 'bg-amber-400/15 text-amber-100 border-amber-300/35',
    },
    published: {
      text: '結果公開済み',
      accent: '#7dd3fc',
      pill: 'bg-sky-500/15 text-sky-100 border-sky-400/35',
    },
    closed: {
      text: 'イベント終了',
      accent: '#94a3b8',
      pill: 'bg-slate-500/15 text-slate-200 border-slate-400/25',
    },
  };

  const config = stateConfig[sessionState];
  const modeText = mode === 'sequential' ? '逐次' : '一斉';
  const sampleText = currentSample ? ` · Sample ${currentSample.label}` : '';

  return (
    <div
      className="sticky top-0 z-50 border-b border-white/10 py-3 px-4 shadow-xl shadow-black/40 backdrop-blur-md"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(15,15,15,0.92) 0%, rgba(23,23,23,0.88) 100%)`,
        borderLeft: `4px solid ${config.accent}`,
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="font-semibold text-base md:text-lg tracking-tight text-stone-100">
              {config.text}
              <span className="font-normal text-stone-400">{sampleText}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.pill}`}
            >
              {modeText}モード
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
