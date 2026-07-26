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
      accent: '#9a8470',
      pill: 'bg-stone-500/15 text-stone-200 border-stone-400/30',
    },
    ordering: {
      text: '順番決め中',
      accent: '#8b7355',
      pill: 'bg-stone-500/15 text-stone-200 border-stone-400/30',
    },
    running: {
      text: '進行中',
      accent: '#c4a574',
      pill: 'bg-bd-accent/15 text-bd-accent-dim border-bd-accent/40',
    },
    aggregating: {
      text: '集計中',
      accent: '#d4b584',
      pill: 'bg-bd-accent/10 text-bd-accent-dim border-bd-accent/30',
    },
    published: {
      text: '結果公開済み',
      accent: '#d4a853',
      pill: 'bg-bd-accent/15 text-bd-accent-dim border-bd-accent/35',
    },
    closed: {
      text: 'イベント終了',
      accent: '#8b7355',
      pill: 'bg-stone-500/15 text-stone-300 border-stone-400/25',
    },
  };

  const config = stateConfig[sessionState];
  const modeText = mode === 'sequential' ? '逐次' : '一斉';
  const sampleText = currentSample ? ` · サンプル ${currentSample.label}` : '';

  return (
    <div
      className="sticky top-0 z-50 border-b py-3 px-4 shadow-xl shadow-black/40 backdrop-blur-md"
      style={{
        borderColor: 'rgba(201, 184, 150, 0.18)',
        backgroundImage:
          'linear-gradient(180deg, rgba(26,20,16,0.96) 0%, rgba(42,31,24,0.92) 100%)',
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
