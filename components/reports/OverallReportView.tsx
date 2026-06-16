'use client';

import {
  IconBottle,
  IconCalendar,
  IconChart,
  IconClipboard,
  IconCrown,
  IconDown,
  IconMedal,
  IconMountain,
  IconScales,
  IconStar,
  IconTrophy,
  IconUsers,
} from '@/components/reports/ReportIcons';
import {
  HighlightCard,
  ReportPanel,
  ReportShell,
  ReportTable,
  ReportTd,
  ReportTh,
  ReportThead,
  ReportTr,
  SectionTitle,
  StatCard,
} from '@/components/reports/ReportShell';
import type { OverallReportData } from '@/lib/report-data/types';
import { CHART_COLORS, RANK_MEDALS, REPORT_FONTS, REPORT_THEMES } from '@/lib/report-export/theme';

function CumulativeChart({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const rounds = data.cumulativeScores;
  if (rounds.length === 0) return null;
  const w = 700;
  const h = 300;
  const pad = { l: 52, r: 8, t: 20, b: 36 };
  const maxY = Math.max(...rounds.flatMap((r) => r.scores.map((s) => s.cumulativeScore)), 1);
  const participants = rounds[0].scores;

  const x = (roundNo: number) =>
    pad.l + ((roundNo - 1) / Math.max(1, rounds.length - 1)) * (w - pad.l - pad.r);
  const y = (score: number) => pad.t + (1 - score / maxY) * (h - pad.t - pad.b);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', maxWidth: w }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = pad.t + (1 - t) * (h - pad.t - pad.b);
        const val = Math.round(maxY * t);
        return (
          <g key={t}>
            <line x1={pad.l} y1={yy} x2={w - pad.r} y2={yy} stroke={theme.rule} strokeWidth={1} />
            <text x={pad.l - 6} y={yy + 4} textAnchor="end" fontSize={10} fill={theme.inkMuted}>
              {val}
            </text>
          </g>
        );
      })}
      {rounds.map((r) => (
        <text key={r.roundNo} x={x(r.roundNo)} y={h - 6} textAnchor="middle" fontSize={11} fill={theme.inkMuted}>
          R{r.roundNo}
        </text>
      ))}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const pts = rounds.map((r) => {
          const s = r.scores.find((sc) => sc.participantId === p.participantId);
          return { x: x(r.roundNo), y: y(s?.cumulativeScore ?? 0), score: s?.cumulativeScore ?? 0 };
        });
        return (
          <g key={p.participantId}>
            <polyline
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              points={pts.map((pt) => `${pt.x},${pt.y}`).join(' ')}
            />
            {pts.map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.x} cy={pt.y} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
                <text x={pt.x} y={pt.y - 8} textAnchor="middle" fontSize={9} fill={color} fontWeight={700}>
                  {pt.score}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function ChartLegend({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const participants = data.cumulativeScores[0]?.scores ?? [];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
      {participants.map((p, pi) => (
        <div key={p.participantId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span
            style={{
              width: 14,
              height: 3,
              borderRadius: 2,
              background: CHART_COLORS[pi % CHART_COLORS.length],
            }}
          />
          <span style={{ color: theme.inkMuted }}>{p.participantName}</span>
        </div>
      ))}
    </div>
  );
}

export function OverallReportView({ data }: { data: OverallReportData }) {
  const theme = REPORT_THEMES.overall;
  const h = data.highlights;
  const maxAvg = Math.max(...data.bottleDifficulty.map((b) => b.averageScore), 1);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionTitle theme={theme} icon={<IconClipboard color={theme.accent} />}>
        基本情報
      </SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
        <StatCard theme={theme} label="開催日" value={data.basic.date} icon={<IconCalendar color={theme.accent} />} />
        <StatCard theme={theme} label="参加者" value={`${data.basic.participantCount}名`} icon={<IconUsers color={theme.accent} />} />
        <StatCard theme={theme} label="出題数" value={`${data.basic.sampleCount}本`} icon={<IconBottle color={theme.accent} />} />
        <StatCard theme={theme} label="総得点" value={`${data.basic.totalScore}pt`} icon={<IconStar color={theme.accent} />} />
        <StatCard theme={theme} label="平均得点" value={`${data.basic.averageScore}pt`} icon={<IconScales color={theme.accent} />} />
      </div>

      <SectionTitle theme={theme} icon={<IconStar color={theme.accent} />}>
        大会ハイライト
      </SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <HighlightCard
          theme={theme}
          title="優勝者"
          icon={<IconCrown color={theme.accent} size={20} />}
          lines={[`${h.winner.name}`, `${h.winner.totalScore}pt`]}
        />
        <HighlightCard
          theme={theme}
          title="最高得点"
          icon={<IconMedal color={theme.accent} size={20} />}
          lines={[
            `${h.highestScore.participantName}`,
            `${h.highestScore.sampleName} ${h.highestScore.score}pt`,
            h.highestScore.othersCount > 0 ? `ほか${h.highestScore.othersCount}件` : '',
          ].filter(Boolean)}
        />
        <HighlightCard
          theme={theme}
          title="最低得点"
          icon={<IconDown color={theme.accent} size={20} />}
          lines={[
            `${h.lowestScore.participantName}`,
            `${h.lowestScore.sampleName} ${h.lowestScore.score}pt`,
            h.lowestScore.othersCount > 0 ? `ほか${h.lowestScore.othersCount}件` : '',
          ].filter(Boolean)}
        />
        <HighlightCard
          theme={theme}
          title="最難関ボトル"
          icon={<IconMountain color={theme.accent} size={20} />}
          lines={[
            h.hardestBottle.sampleName,
            `合計 ${h.hardestBottle.totalScore}pt`,
            `平均 ${h.hardestBottle.averageScore}pt`,
          ]}
        />
        <HighlightCard
          theme={theme}
          title="健闘ボトル"
          icon={<IconTrophy color={theme.accent} size={20} />}
          lines={[
            h.bestPerformedBottle.sampleName,
            `合計 ${h.bestPerformedBottle.totalScore}pt`,
            `平均 ${h.bestPerformedBottle.averageScore}pt`,
          ]}
        />
        <HighlightCard
          theme={theme}
          title="差が付いたボトル"
          icon={<IconScales color={theme.accent} size={20} />}
          lines={[h.mostDivisiveBottle.sampleName, `標準偏差 ${h.mostDivisiveBottle.standardDeviation}`]}
        />
      </div>

      <SectionTitle theme={theme} icon={<IconChart color={theme.accent} />}>
        ボトル別難易度（平均得点の低い順）
      </SectionTitle>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <ReportPanel theme={theme} style={{ flex: '1 1 380px' }}>
          <ReportTable theme={theme} fontSize={13}>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ width: 48 }}>
                順位
              </ReportTh>
              <ReportTh>サンプル</ReportTh>
              <ReportTh>出題者</ReportTh>
              <ReportTh align="right">合計</ReportTh>
              <ReportTh align="right">平均</ReportTh>
            </ReportThead>
            <tbody>
              {data.bottleDifficulty.map((b, i) => (
                <ReportTr key={b.sampleId} theme={theme} index={i}>
                  <ReportTd align="center" style={{ fontSize: b.rank <= 3 ? 18 : 14, fontWeight: 800 }}>
                    {b.rank <= 3 ? RANK_MEDALS[b.rank - 1] : b.rank}
                  </ReportTd>
                  <ReportTd style={{ fontWeight: 600 }}>{b.sampleName}</ReportTd>
                  <ReportTd>{b.presenterName}</ReportTd>
                  <ReportTd align="right">{b.totalScore}</ReportTd>
                  <ReportTd align="right" style={{ fontWeight: 700, color: theme.headerBg }}>
                    {b.averageScore}
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
        <ReportPanel theme={theme} style={{ flex: '1 1 320px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: theme.inkMuted, fontWeight: 600 }}>平均得点（pt）</p>
          {data.bottleDifficulty.map((b) => (
            <div key={b.sampleId} style={{ display: 'flex', alignItems: 'center', marginBottom: 10, fontSize: 12 }}>
              <span style={{ width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.sampleName}
              </span>
              <div style={{ flex: 1, height: 20, background: theme.paperAlt, borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(b.averageScore / maxAvg) * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${theme.headerBg}, ${theme.tableHeadBg})`,
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ width: 40, textAlign: 'right', marginLeft: 8, fontWeight: 700, fontFamily: REPORT_FONTS.serif }}>
                {b.averageScore}
              </span>
            </div>
          ))}
        </ReportPanel>
      </div>

      <div style={{ marginTop: 32 }}>
        <SectionTitle theme={theme} icon={<IconChart color={theme.accent} />}>
          各ラウンドまでの合計得点推移
        </SectionTitle>
        <ReportPanel theme={theme}>
          <CumulativeChart data={data} theme={theme} />
          <ChartLegend data={data} theme={theme} />
        </ReportPanel>
      </div>
    </ReportShell>
  );
}
