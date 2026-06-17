'use client';

import { ScoreCell } from '@/components/reports/ScoreCell';
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
import type { PersonalReportData } from '@/lib/report-data/types';
import type { ReportItemKey } from '@/lib/report-data/types';
import { REPORT_THEMES } from '@/lib/report-export/theme';
import {
  personalRoundColWidths,
  radarLayout,
  tableCellPadding,
  tableFontSize,
} from '@/lib/report-export/layout-scale';
import {
  CHART_LABEL_PAD,
  columnHeader,
  PERSONAL_ANSWER_COLUMN_ORDER,
  radialDy,
  radialTextAnchor,
  REPORT_SPACE,
  REPORT_TYPE,
} from '@/lib/report-export/typography';

function orderedAnswerKeys(activeKeys: ReportItemKey[]): ReportItemKey[] {
  return PERSONAL_ANSWER_COLUMN_ORDER.filter((k) => activeKeys.includes(k));
}

function RadarChart({ data, theme }: { data: PersonalReportData; theme: typeof REPORT_THEMES.personal }) {
  const cats = data.analysis.categoryScores.filter((c) => c.maxScore > 0);
  if (cats.length === 0) return null;

  const layout = radarLayout(cats.length);
  const viewSize = layout.core + CHART_LABEL_PAD * 2;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const r = layout.core * 0.35;
  const n = cats.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;

  const gridPts = (ratio: number) =>
    cats.map((_, i) => `${cx + r * ratio * Math.cos(angle(i))},${cy + r * ratio * Math.sin(angle(i))}`).join(' ');

  const dataPts = cats
    .map((c, i) => {
      const ratio = c.rate / 100;
      return `${cx + r * ratio * Math.cos(angle(i))},${cy + r * ratio * Math.sin(angle(i))}`;
    })
    .join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${viewSize} ${viewSize}`} style={{ display: 'block', maxWidth: 400, overflow: 'visible' }} preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t} points={gridPts(t)} fill="none" stroke={theme.rule} strokeWidth={1} />
      ))}
      {cats.map((_, i) => {
        const ax = cx + r * Math.cos(angle(i));
        const ay = cy + r * Math.sin(angle(i));
        return <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke={theme.rule} strokeWidth={1} />;
      })}
      <polygon points={dataPts} fill={`${theme.accent}30`} stroke={theme.headerBg} strokeWidth={2} />
      {cats.map((c, i) => {
        const a = angle(i);
        const lx = cx + (r + layout.labelOffset) * Math.cos(a);
        const ly = cy + (r + layout.labelOffset) * Math.sin(a);
        return (
          <text key={c.key} x={lx} y={ly + radialDy(a, 0)} textAnchor={radialTextAnchor(a)} fontSize={layout.axisFontSize} fill={theme.inkMuted} fontWeight={600}>
            {c.label}
            <tspan x={lx} dy={radialDy(a, 1)} fontWeight={800} fill={theme.headerBg} fontSize={REPORT_TYPE.tableNum}>
              {c.rate}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

export function PersonalReportView({ data }: { data: PersonalReportData }) {
  const theme = REPORT_THEMES.personal;
  const p = data.participant;
  const diffSign = p.diffFromOverallAverage >= 0 ? '+' : '';
  const answerKeys = orderedAnswerKeys(data.activeItemKeys);
  const roundCount = data.rounds.length;
  const roundColCount = 3 + answerKeys.length + 1;
  const roundFs = tableFontSize(roundColCount, roundCount);
  const roundPad = tableCellPadding(roundColCount, roundCount);
  const colWidths = personalRoundColWidths(answerKeys.length);
  const compact = roundColCount > 8 || roundCount > 12;

  return (
    <ReportShell
      theme={theme}
      sessionTitle={data.sessionTitle}
      sessionDate={data.sessionDate}
      participantName={p.name}
    >
      <ReportSection theme={theme} title="結果">
        <MetricCardGrid columns={4}>
          <MetricCard theme={theme} label="順位" value={`${p.rank}位`} large />
          <MetricCard theme={theme} label="総得点" value={`${p.totalScore}pt`} />
          <MetricCard theme={theme} label="平均得点" value={`${p.averageScore}pt`} />
          <MetricCard theme={theme} label="全体平均との差" value={`${diffSign}${p.diffFromOverallAverage}pt`} />
        </MetricCardGrid>
      </ReportSection>

      <ReportSection theme={theme} title="分析">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: REPORT_SPACE.grid }}>
          <ChartCard theme={theme} title="部門別得点">
            <RadarChart data={data} theme={theme} />
          </ChartCard>
          <ChartCard theme={theme} title="部門別得点サマリー">
            <ReportTable theme={theme} fontSize={REPORT_TYPE.tableBody} bare>
              <ReportThead theme={theme}>
                <ReportTh>部門</ReportTh>
                <ReportTh align="right">獲得</ReportTh>
                <ReportTh align="right">満点</ReportTh>
                <ReportTh align="right">達成率</ReportTh>
              </ReportThead>
              <tbody>
                {data.analysis.categoryScores
                  .filter((c) => c.maxScore > 0)
                  .map((c, i) => (
                    <ReportTr key={c.key} theme={theme} index={i}>
                      <ReportTd theme={theme}>{c.label}</ReportTd>
                      <ReportTd theme={theme} align="right" numeric>{c.earnedScore}</ReportTd>
                      <ReportTd theme={theme} align="right" numeric>{c.maxScore}</ReportTd>
                      <ReportTd theme={theme} align="right" numeric emphasis>{c.rate}%</ReportTd>
                    </ReportTr>
                  ))}
              </tbody>
            </ReportTable>
          </ChartCard>
          <HighlightCard
            theme={theme}
            title="最高得点ボトル"
            lines={[
              data.analysis.highestBottle.sampleName,
              `${data.analysis.highestBottle.score}pt`,
              data.analysis.highestBottle.othersCount > 0 ? `ほか${data.analysis.highestBottle.othersCount}件` : '',
            ].filter(Boolean)}
          />
          <HighlightCard
            theme={theme}
            title="最低得点ボトル"
            lines={[
              data.analysis.lowestBottle.sampleName,
              `${data.analysis.lowestBottle.score}pt`,
              data.analysis.lowestBottle.othersCount > 0 ? `ほか${data.analysis.lowestBottle.othersCount}件` : '',
            ].filter(Boolean)}
          />
        </div>
      </ReportSection>

      <ReportSection theme={theme} title="全てのラウンドの回答と得点" style={{ marginBottom: 0 }}>
        <ReportTable theme={theme} fontSize={roundFs} fixed>
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <ReportThead theme={theme}>
            <ReportTh align="center" style={{ padding: roundPad }}>No.</ReportTh>
            <ReportTh style={{ padding: roundPad }}>サンプル</ReportTh>
            <ReportTh style={{ padding: roundPad }}>出題者</ReportTh>
            {answerKeys.map((key) => {
              const pts = data.itemMaxScores[key];
              const label = data.analysis.categoryScores.find((c) => c.key === key)?.label ?? key;
              return (
                <ReportTh key={key} align="center" multiline style={{ padding: roundPad }}>
                  {columnHeader(label, pts)}
                </ReportTh>
              );
            })}
            <ReportTh align="center" multiline style={{ padding: roundPad }}>
              {columnHeader('合計得点', data.maxTotalScorePerRound)}
            </ReportTh>
          </ReportThead>
          <tbody>
            {data.rounds.map((round, i) => (
              <ReportTr key={round.sampleId} theme={theme} index={i}>
                <ReportTd theme={theme} align="center" numeric style={{ padding: roundPad }}>{round.roundNo}</ReportTd>
                <ReportTd theme={theme} style={{ fontWeight: 600, padding: roundPad }}>{round.sampleName}</ReportTd>
                <ReportTd theme={theme} style={{ color: theme.inkMuted, padding: roundPad }}>{round.presenterName}</ReportTd>
                {answerKeys.map((key) => (
                  <ScoreCell key={key} item={round.items[key]} theme={theme} compact={compact} />
                ))}
                <ReportTd theme={theme} align="center" numeric emphasis style={{ padding: roundPad, background: theme.paperAlt }}>
                  {round.totalScore}pt
                </ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportShell>
  );
}
