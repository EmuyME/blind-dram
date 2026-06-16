'use client';

import { HighlightCard, ReportShell, SectionTitle, StatCard } from '@/components/reports/ReportShell';
import type { OverallReportData } from '@/lib/report-data/types';
import { CHART_COLORS, REPORT_THEMES } from '@/lib/report-export/theme';

function CumulativeChart({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const rounds = data.cumulativeScores;
  if (rounds.length === 0) return null;
  const w = 1080;
  const h = 320;
  const pad = { l: 56, r: 140, t: 24, b: 40 };
  const maxY = Math.max(
    ...rounds.flatMap((r) => r.scores.map((s) => s.cumulativeScore)),
    1,
  );
  const participants = rounds[0].scores;

  const x = (roundNo: number) =>
    pad.l + ((roundNo - 1) / Math.max(1, rounds.length - 1)) * (w - pad.l - pad.r);
  const y = (score: number) => pad.t + (1 - score / maxY) * (h - pad.t - pad.b);

  return (
    <svg width={w} height={h} style={{ display: 'block', margin: '0 auto' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = pad.t + (1 - t) * (h - pad.t - pad.b);
        const val = Math.round(maxY * t);
        return (
          <g key={t}>
            <line x1={pad.l} y1={yy} x2={w - pad.r} y2={yy} stroke={theme.rule} strokeWidth={1} />
            <text x={pad.l - 8} y={yy + 4} textAnchor="end" fontSize={11} fill={theme.inkMuted}>
              {val}
            </text>
          </g>
        );
      })}
      {rounds.map((r) => (
        <text key={r.roundNo} x={x(r.roundNo)} y={h - 8} textAnchor="middle" fontSize={12} fill={theme.inkMuted}>
          R{r.roundNo}
        </text>
      ))}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const pts = rounds.map((r) => {
          const s = r.scores.find((sc) => sc.participantId === p.participantId);
          return `${x(r.roundNo)},${y(s?.cumulativeScore ?? 0)}`;
        });
        const last = rounds[rounds.length - 1].scores.find((s) => s.participantId === p.participantId);
        return (
          <g key={p.participantId}>
            <polyline fill="none" stroke={color} strokeWidth={2} points={pts.join(' ')} />
            {last && (
              <text x={w - pad.r + 8} y={y(last.cumulativeScore) + 4} fontSize={11} fill={color}>
                {p.participantName.slice(0, 6)} {last.cumulativeScore}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DifficultyBars({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const maxAvg = Math.max(...data.bottleDifficulty.map((b) => b.averageScore), 1);
  const barH = 22;
  const gap = 8;
  return (
    <div style={{ marginTop: 8 }}>
      {data.bottleDifficulty.map((b) => (
        <div key={b.sampleId} style={{ display: 'flex', alignItems: 'center', marginBottom: gap, fontSize: 13 }}>
          <span style={{ width: 100, flexShrink: 0 }}>{b.sampleName}</span>
          <div style={{ flex: 1, height: barH, background: theme.paperAlt, borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(b.averageScore / maxAvg) * 100}%`,
                height: '100%',
                background: theme.headerBg,
                borderRadius: 4,
              }}
            />
          </div>
          <span style={{ width: 48, textAlign: 'right', marginLeft: 8, fontWeight: 700 }}>{b.averageScore}</span>
        </div>
      ))}
    </div>
  );
}

export function OverallReportView({ data }: { data: OverallReportData }) {
  const theme = REPORT_THEMES.overall;
  const h = data.highlights;

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionTitle theme={theme}>基本情報</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <StatCard theme={theme} label="開催日" value={data.basic.date} />
        <StatCard theme={theme} label="参加者" value={`${data.basic.participantCount}名`} />
        <StatCard theme={theme} label="出題数" value={`${data.basic.sampleCount}本`} />
        <StatCard theme={theme} label="総得点" value={`${data.basic.totalScore}pt`} />
        <StatCard theme={theme} label="平均得点" value={`${data.basic.averageScore}pt`} />
      </div>

      <SectionTitle theme={theme}>大会ハイライト</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <HighlightCard
          theme={theme}
          title="優勝者"
          lines={[`${h.winner.name}`, `${h.winner.totalScore}pt`]}
        />
        <HighlightCard
          theme={theme}
          title="最高得点"
          lines={[
            `${h.highestScore.participantName}`,
            `${h.highestScore.sampleName} ${h.highestScore.score}pt`,
            h.highestScore.othersCount > 0 ? `ほか${h.highestScore.othersCount}件` : '',
          ].filter(Boolean)}
        />
        <HighlightCard
          theme={theme}
          title="最低得点"
          lines={[
            `${h.lowestScore.participantName}`,
            `${h.lowestScore.sampleName} ${h.lowestScore.score}pt`,
            h.lowestScore.othersCount > 0 ? `ほか${h.lowestScore.othersCount}件` : '',
          ].filter(Boolean)}
        />
        <HighlightCard
          theme={theme}
          title="最難関ボトル"
          lines={[
            h.hardestBottle.sampleName,
            `合計 ${h.hardestBottle.totalScore}pt / 平均 ${h.hardestBottle.averageScore}pt`,
          ]}
        />
        <HighlightCard
          theme={theme}
          title="健闘ボトル"
          lines={[
            h.bestPerformedBottle.sampleName,
            `合計 ${h.bestPerformedBottle.totalScore}pt / 平均 ${h.bestPerformedBottle.averageScore}pt`,
          ]}
        />
        <HighlightCard
          theme={theme}
          title="差が付いたボトル"
          lines={[
            h.mostDivisiveBottle.sampleName,
            `標準偏差 ${h.mostDivisiveBottle.standardDeviation}`,
          ]}
        />
      </div>

      <SectionTitle theme={theme}>ボトル別難易度（平均得点の低い順）</SectionTitle>
      <DifficultyBars data={data} theme={theme} />

      <div style={{ marginTop: 32 }}>
        <SectionTitle theme={theme}>各ラウンドまでの合計得点推移</SectionTitle>
        <CumulativeChart data={data} theme={theme} />
      </div>
    </ReportShell>
  );
}
