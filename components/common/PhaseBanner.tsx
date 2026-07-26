'use client';

interface PhaseBannerProps {
  sessionState: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published' | 'closed';
  mode: 'sequential' | 'simultaneous';
  currentSample?: { id: string; label: string };
}

export function PhaseBanner({ sessionState, mode, currentSample }: PhaseBannerProps) {
  const stateConfig = {
    registering: { text: '参加登録中', accent: '#9a8470' },
    ordering: { text: '順番決め中', accent: '#8b7355' },
    running: { text: '進行中', accent: '#c4a574' },
    aggregating: { text: '集計中', accent: '#d4b584' },
    published: { text: '結果公開済み', accent: '#d4a853' },
    closed: { text: 'イベント終了', accent: '#8b7355' },
  };

  const config = stateConfig[sessionState];
  const modeText = mode === 'sequential' ? '逐次' : '一斉';
  const sampleText = currentSample ? ` · サンプル ${currentSample.label}` : '';

  return (
    <div
      className="sticky top-0 z-50 border-b py-2.5 px-4 backdrop-blur-md"
      style={{
        borderColor: 'rgba(201, 184, 150, 0.18)',
        backgroundColor: 'rgba(26,20,16,0.94)',
        borderLeft: `3px solid ${config.accent}`,
      }}
    >
      <div className="max-w-5xl mx-auto flex items-baseline justify-between gap-3">
        <span className="font-semibold text-sm md:text-base tracking-tight text-stone-100">
          {config.text}
          <span className="font-normal text-stone-400">{sampleText}</span>
        </span>
        <span className="text-xs text-stone-500 shrink-0">{modeText}</span>
      </div>
    </div>
  );
}
