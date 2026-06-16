'use client';

import {
  HighlightCard,
  ReportPanel,
  ReportShell,
  ReportTable,
  ReportTd,
  ReportTh,
  ReportThead,
  ReportTr,
  SectionBlock,
  SectionTitle,
  StatCard,
  StatCardGrid,
} from '@/components/reports/ReportShell';
import type { OverallReportData } from '@/lib/report-data/types';
import { CHART_COLORS, RANK_MEDALS, REPORT_THEMES } from '@/lib/report-export/theme';
import { miniBarStyle } from '@/lib/report-export/design';
import { CHART_LABEL_PAD, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';

function CumulativeChart({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const rounds = data.cumulativeScores;
  if (rounds.length === 0) return null;

  const participants = rounds[0].scores;
  const nRounds = rounds.length;
  const legendCols = Math.min(3, Math.max(2, Math.ceil(participants.length / 3)));
  const legendRows = Math.ceil(participants.length / legendCols);
  const chartH = 260;
  const legendRowH = 28;
  const legendH = legendRows * legendRowH + 10;
  const plotPad = { l: CHART_LABEL_PAD + 12, r: 24, t: 20, b: 40 };
  const w = 1128;
  const h = chartH + legendH;
  const plotW = w - plotPad.l - plotPad.r;
  const plotH = chartH - plotPad.t - plotPad.b;
  const maxY = Math.max(...rounds.flatMap((r) => r.scores.map((s) => s.cumulativeScore)), 1);
  const legendColW = (w - plotPad.l - plotPad.r) / legendCols;

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
      {rounds.map((r) => (
        <text key={r.roundNo} x={x(r.roundNo)} y={chartH - 4} textAnchor="middle" fontSize={REPORT_TYPE.chartAxis} fill={theme.inkMuted} fontWeight={700}>
          R{r.roundNo}
        </text>
      ))}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const pts = rounds.map((r) => {
          const s = r.scores.find((sc) => sc.participantId === p.participantId);
          return { x: x(r.roundNo), y: y(s?.cumulativeScore ?? 0) };
        });
        return (
          <g key={p.participantId}>
            <polyline fill="none" stroke={color} strokeWidth={2.5} points={pts.map((pt) => `${pt.x},${pt.y}`).join(' ')} />
            {pts.map((pt, idx) => (
              <circle key={idx} cx={pt.x} cy={pt.y} r={4.5} fill={color} stroke="#fff" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const col = pi % legendCols;
        const row = Math.floor(pi / legendCols);
        const lx = plotPad.l + col * legendColW;
        const ly = chartH + 12 + row * legendRowH;
        const last = rounds[rounds.length - 1]?.scores.find((s) => s.participantId === p.participantId);
        return (
          <g key={`leg-${p.participantId}`}>
            <line x1={lx} y1={ly + 8} x2={lx + 20} y2={ly + 8} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
            <text x={lx + 26} y={ly + 12} fontSize={REPORT_TYPE.legend} fill={theme.ink} fontWeight={600}>
              {p.participantName}
            </text>
            {last && (
              <text x={lx + legendColW - 6} y={ly + 12} textAnchor="end" fontSize={REPORT_TYPE.legend} fill={color} fontWeight={800}>
                {last.cumulativeScore}pt
              </text>
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

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionBlock>
        <SectionTitle theme={theme}>概要</SectionTitle>
        <StatCardGrid columns={5}>
          <StatCard theme={theme} label="開催日" value={data.basic.date} />
          <StatCard theme={theme} label="参加者" value={`${data.basic.participantCount}名`} />
          <StatCard theme={theme} label="出題数" value={`${data.basic.sampleCount}本`} />
          <StatCard theme={theme} label="総得点" value={`${data.basic.totalScore}pt`} />
          <StatCard theme={theme} label="平均得点" value={`${data.basic.averageScore}pt`} />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>大会ハイライト</SectionTitle>
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
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>ボトル別難易度（平均得点の低い順）</SectionTitle>
        <ReportPanel theme={theme}>
          <ReportTable fontSize={REPORT_TYPE.tableBody} fixed>
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '42%' }} />
            </colgroup>
            <ReportThead theme={theme}>
              <ReportTh align="center">順位</ReportTh>
              <ReportTh>サンプル</ReportTh>
              <ReportTh>出題者</ReportTh>
              <ReportTh align="right">合計</ReportTh>
              <ReportTh align="right">平均</ReportTh>
              <ReportTh>難易度</ReportTh>
            </ReportThead>
            <tbody>
              {data.bottleDifficulty.map((b, i) => {
                const bar = miniBarStyle(theme, b.averageScore / maxAvg);
                return (
                  <ReportTr key={b.sampleId} theme={theme} index={i} accent={b.rank <= 3}>
                    <ReportTd theme={theme} align="center" style={{ fontSize: b.rank <= 3 ? 18 : REPORT_TYPE.tableNum, fontWeight: 800 }}>
                      {b.rank <= 3 ? RANK_MEDALS[b.rank - 1] : b.rank}
                    </ReportTd>
                    <ReportTd theme={theme} style={{ fontWeight: 700 }}>{b.sampleName}</ReportTd>
                    <ReportTd theme={theme} style={{ color: theme.inkMuted }}>{b.presenterName}</ReportTd>
                    <ReportTd theme={theme} align="right" numeric>
                      {b.totalScore}pt
                    </ReportTd>
                    <ReportTd theme={theme} align="right" numeric emphasis>
                      {b.averageScore}pt
                    </ReportTd>
                    <ReportTd theme={theme}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ ...bar.track, flex: 1 }}>
                          <div style={bar.fill} />
                        </div>
                      </div>
                    </ReportTd>
                  </ReportTr>
                );
              })}
            </tbody>
          </ReportTable>
        </ReportPanel>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme}>各ラウンドまでの合計得点推移</SectionTitle>
        <ReportPanel theme={theme} title="累計得点の推移" centerContent>
          <CumulativeChart data={data} theme={theme} />
        </ReportPanel>
      </SectionBlock>
    </ReportShell>
  );
}
