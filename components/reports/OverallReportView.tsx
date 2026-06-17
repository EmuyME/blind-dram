'use client';

import {
  ChartCard,
  HighlightCard,
  MetricCard,
  MetricCardGrid,
  ReportSection,
  ReportShell,
  ReportTable,
  ReportTd,
  ReportTh,
  ReportThead,
  ReportTr,
} from '@/components/reports/design-system';
import type { OverallReportData } from '@/lib/report-data/types';
import { miniBarStyle } from '@/lib/report-export/design';
import { chartLabelStep, tableCellPadding, tableFontSize } from '@/lib/report-export/layout-scale';
import { CHART_LABEL_PAD, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';
import { CHART_COLORS, RANK_MEDALS, REPORT_THEMES } from '@/lib/report-export/theme';

function CumulativeChart({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const rounds = data.cumulativeScores;
  if (rounds.length === 0) return null;

  const participants = rounds[0].scores;
  const nRounds = rounds.length;
  const chartH = 300;
  const plotPad = { l: CHART_LABEL_PAD + 8, r: 88, t: 24, b: 44 };
  const w = 1128;
  const h = chartH + 8;
  const plotW = w - plotPad.l - plotPad.r;
  const plotH = chartH - plotPad.t - plotPad.b;
  const maxY = Math.max(...rounds.flatMap((r) => r.scores.map((s) => s.cumulativeScore)), 1);
  const xLabelStep = chartLabelStep(nRounds);

  const x = (roundNo: number) => plotPad.l + ((roundNo - 1) / Math.max(1, nRounds - 1)) * plotW;
  const y = (score: number) => plotPad.t + (1 - score / maxY) * plotH;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = plotPad.t + (1 - t) * plotH;
        const val = Math.round(maxY * t);
        return (
          <g key={t}>
            <line x1={plotPad.l} y1={yy} x2={w - plotPad.r} y2={yy} stroke={theme.rule} strokeWidth={1} />
            <text x={plotPad.l - 6} y={yy + 4} textAnchor="end" fontSize={REPORT_TYPE.chartTick} fill={theme.inkMuted} fontWeight={600}>
              {val}
            </text>
          </g>
        );
      })}
      {rounds.map((r) =>
        r.roundNo === 1 || r.roundNo === nRounds || (r.roundNo - 1) % xLabelStep === 0 ? (
          <text key={r.roundNo} x={x(r.roundNo)} y={chartH - 6} textAnchor="middle" fontSize={REPORT_TYPE.chartAxis} fill={theme.inkMuted} fontWeight={600}>
            R{r.roundNo}
          </text>
        ) : null,
      )}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const pts = rounds.map((r) => {
          const s = r.scores.find((sc) => sc.participantId === p.participantId);
          return { x: x(r.roundNo), y: y(s?.cumulativeScore ?? 0), score: s?.cumulativeScore ?? 0 };
        });
        const last = pts[pts.length - 1];
        return (
          <g key={p.participantId}>
            <polyline fill="none" stroke={color} strokeWidth={2.5} points={pts.map((pt) => `${pt.x},${pt.y}`).join(' ')} />
            {pts.map((pt, idx) => (
              <circle key={idx} cx={pt.x} cy={pt.y} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
            ))}
            {last && (
              <>
                <text x={last.x + 8} y={last.y + 4} fontSize={REPORT_TYPE.legend} fill={theme.inkMuted} fontWeight={600}>
                  {p.participantName}
                </text>
                <text x={w - plotPad.r + 4} y={last.y + 4} textAnchor="start" fontSize={REPORT_TYPE.legend} fill={color} fontWeight={800}>
                  {last.score}pt
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function OverallReportView({ data }: { data: OverallReportData }) {
  const theme = REPORT_THEMES.overall;
  const h = data.highlights;
  const maxAvg = Math.max(...data.bottleDifficulty.map((b) => b.averageScore), 1);
  const bottleCount = data.bottleDifficulty.length;
  const bottleFs = tableFontSize(6, bottleCount);
  const bottlePad = tableCellPadding(6, bottleCount);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle} sessionDate={data.basic.date}>
      <ReportSection theme={theme} title="概要">
        <MetricCardGrid columns={5}>
          <MetricCard theme={theme} label="参加者" value={`${data.basic.participantCount}名`} />
          <MetricCard theme={theme} label="出題数" value={`${data.basic.sampleCount}本`} />
          <MetricCard theme={theme} label="総得点" value={`${data.basic.totalScore}pt`} />
          <MetricCard theme={theme} label="平均得点" value={`${data.basic.averageScore}pt`} />
          <MetricCard theme={theme} label="開催日" value={data.basic.date} />
        </MetricCardGrid>
      </ReportSection>

      <ReportSection theme={theme} title="大会ハイライト">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: REPORT_SPACE.grid }}>
          <HighlightCard theme={theme} title="優勝者" lines={[h.winner.name, `${h.winner.totalScore}pt`]} />
          <HighlightCard
            theme={theme}
            title="最高得点"
            lines={[
              h.highestScore.participantName,
              h.highestScore.sampleName,
              `${h.highestScore.score}pt`,
              h.highestScore.othersCount > 0 ? `ほか${h.highestScore.othersCount}件` : '',
            ].filter(Boolean)}
          />
          <HighlightCard
            theme={theme}
            title="最低得点"
            lines={[
              h.lowestScore.participantName,
              h.lowestScore.sampleName,
              `${h.lowestScore.score}pt`,
              h.lowestScore.othersCount > 0 ? `ほか${h.lowestScore.othersCount}件` : '',
            ].filter(Boolean)}
          />
          <HighlightCard
            theme={theme}
            title="最難関ボトル"
            lines={[h.hardestBottle.sampleName, `${h.hardestBottle.totalScore}pt`, `平均 ${h.hardestBottle.averageScore}pt`]}
          />
          <HighlightCard
            theme={theme}
            title="健闘ボトル"
            lines={[h.bestPerformedBottle.sampleName, `${h.bestPerformedBottle.totalScore}pt`, `平均 ${h.bestPerformedBottle.averageScore}pt`]}
          />
          <HighlightCard
            theme={theme}
            title="差が付いたボトル"
            lines={[h.mostDivisiveBottle.sampleName, `標準偏差 ${h.mostDivisiveBottle.standardDeviation}`]}
          />
        </div>
      </ReportSection>

      <ReportSection theme={theme} title="ボトル別難易度（平均得点の低い順）">
        <ChartCard theme={theme}>
          <ReportTable theme={theme} fontSize={bottleFs} fixed bare>
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '40%' }} />
            </colgroup>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ padding: bottlePad }}>順位</ReportTh>
              <ReportTh style={{ padding: bottlePad }}>サンプル</ReportTh>
              <ReportTh style={{ padding: bottlePad }}>出題者</ReportTh>
              <ReportTh align="right" style={{ padding: bottlePad }}>合計</ReportTh>
              <ReportTh align="right" style={{ padding: bottlePad }}>平均</ReportTh>
              <ReportTh style={{ padding: bottlePad }}>難易度</ReportTh>
            </ReportThead>
            <tbody>
              {data.bottleDifficulty.map((b, i) => {
                const bar = miniBarStyle(theme, b.averageScore / maxAvg, 22);
                return (
                  <ReportTr key={b.sampleId} theme={theme} index={i} accent={b.rank <= 3}>
                    <ReportTd theme={theme} align="center" style={{ fontSize: b.rank <= 3 ? 18 : REPORT_TYPE.tableNum, fontWeight: 800, padding: bottlePad }}>
                      {b.rank <= 3 ? RANK_MEDALS[b.rank - 1] : b.rank}
                    </ReportTd>
                    <ReportTd theme={theme} style={{ fontWeight: 600, padding: bottlePad }}>{b.sampleName}</ReportTd>
                    <ReportTd theme={theme} style={{ color: theme.inkMuted, padding: bottlePad }}>{b.presenterName}</ReportTd>
                    <ReportTd theme={theme} align="right" numeric style={{ padding: bottlePad }}>{b.totalScore}pt</ReportTd>
                    <ReportTd theme={theme} align="right" numeric emphasis style={{ padding: bottlePad }}>{b.averageScore}pt</ReportTd>
                    <ReportTd theme={theme} style={{ padding: bottlePad }}>
                      <div style={{ ...bar.track, width: '100%' }}>
                        <div style={bar.fill} />
                      </div>
                    </ReportTd>
                  </ReportTr>
                );
              })}
            </tbody>
          </ReportTable>
        </ChartCard>
      </ReportSection>

      <ReportSection theme={theme} title="各ラウンドまでの合計得点推移" style={{ marginBottom: 0 }}>
        <ChartCard theme={theme} title="累計得点の推移">
          <CumulativeChart data={data} theme={theme} />
        </ChartCard>
      </ReportSection>
    </ReportShell>
  );
}
