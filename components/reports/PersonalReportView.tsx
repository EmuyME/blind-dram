'use client';

import { ScoringItemCell } from '@/components/reports/ScoringItemCell';
import {
  HighlightCard,
  ParticipantBanner,
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
import type { PersonalReportData } from '@/lib/report-data/types';
import { REPORT_ITEM_KEYS } from '@/lib/report-data/types';
import { REPORT_FONTS, REPORT_THEMES } from '@/lib/report-export/theme';
import { CHART_LABEL_PAD, columnHeader, radialDy, radialTextAnchor, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';

function RadarChart({ data, theme }: { data: PersonalReportData; theme: typeof REPORT_THEMES.personal }) {
  const cats = data.analysis.categoryScores.filter((c) => c.maxScore > 0);
  if (cats.length === 0) return null;

  const core = 280;
  const viewSize = core + CHART_LABEL_PAD * 2;
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const r = 100;
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
    <svg
      width="100%"
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      style={{ display: 'block', maxWidth: 460, overflow: 'visible' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t} points={gridPts(t)} fill="none" stroke={theme.rule} strokeWidth={1.5} />
      ))}
      {cats.map((_, i) => {
        const ax = cx + r * Math.cos(angle(i));
        const ay = cy + r * Math.sin(angle(i));
        return <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke={theme.rule} strokeWidth={1} />;
      })}
      <polygon points={dataPts} fill={`${theme.accent}40`} stroke={theme.headerBg} strokeWidth={2.5} />
      {cats.map((c, i) => {
        const a = angle(i);
        const lx = cx + (r + 48) * Math.cos(a);
        const ly = cy + (r + 48) * Math.sin(a);
        return (
          <text key={c.key} x={lx} y={ly + radialDy(a, 0)} textAnchor={radialTextAnchor(a)} fontSize={REPORT_TYPE.chartAxis} fill={theme.inkMuted} fontWeight={600}>
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

  return (
    <ReportShell
      theme={theme}
      sessionTitle={data.sessionTitle}
      participantBanner={<ParticipantBanner theme={theme} name={p.name} />}
    >
      <SectionBlock>
        <SectionTitle theme={theme}>結果</SectionTitle>
        <StatCardGrid columns={4}>
          <StatCard theme={theme} label="順位" value={`${p.rank}位`} />
          <StatCard theme={theme} label="総得点" value={`${p.totalScore}pt`} />
          <StatCard theme={theme} label="平均得点" value={`${p.averageScore}pt`} />
          <StatCard theme={theme} label="全体平均との差" value={`${diffSign}${p.diffFromOverallAverage}pt`} />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>分析</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: REPORT_SPACE.grid, marginBottom: REPORT_SPACE.grid }}>
          <ReportPanel theme={theme} title="部門別得点" centerContent>
            <RadarChart data={data} theme={theme} />
          </ReportPanel>
          <ReportPanel theme={theme} title="部門別得点サマリー">
            <ReportTable fontSize={REPORT_TYPE.tableBody}>
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
                      <ReportTd theme={theme} align="right" style={{ fontFamily: REPORT_FONTS.serif, fontWeight: 700 }}>
                        {c.earnedScore}
                      </ReportTd>
                      <ReportTd theme={theme} align="right">{c.maxScore}</ReportTd>
                      <ReportTd theme={theme} align="right" style={{ fontWeight: 800, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
                        {c.rate}%
                      </ReportTd>
                    </ReportTr>
                  ))}
              </tbody>
            </ReportTable>
          </ReportPanel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: REPORT_SPACE.grid }}>
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
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme}>全てのラウンドの回答と得点</SectionTitle>
        <ReportPanel theme={theme}>
          <ReportTable fontSize={REPORT_TYPE.tableBody} fixed>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <ReportThead theme={theme}>
              <ReportTh align="center">No.</ReportTh>
              <ReportTh>サンプル</ReportTh>
              <ReportTh>出題者</ReportTh>
              {REPORT_ITEM_KEYS.map((key) => {
                const pts = data.itemMaxScores[key];
                const label = data.analysis.categoryScores.find((c) => c.key === key)?.label ?? key;
                return (
                  <ReportTh key={key} align="center">
                    {pts > 0 ? columnHeader(label, pts) : '—'}
                  </ReportTh>
                );
              })}
              <ReportTh align="center">{columnHeader('合計', data.maxTotalScorePerRound)}</ReportTh>
            </ReportThead>
            <tbody>
              {data.rounds.map((round, i) => (
                <ReportTr key={round.sampleId} theme={theme} index={i}>
                  <ReportTd theme={theme} align="center" style={{ fontWeight: 700 }}>{round.roundNo}</ReportTd>
                  <ReportTd theme={theme} style={{ fontWeight: 700 }}>{round.sampleName}</ReportTd>
                  <ReportTd theme={theme} style={{ color: theme.inkMuted }}>{round.presenterName}</ReportTd>
                  {REPORT_ITEM_KEYS.map((key) => (
                    <ScoringItemCell key={key} item={round.items[key]} />
                  ))}
                  <ReportTd
                    theme={theme}
                    align="center"
                    style={{
                      fontSize: REPORT_TYPE.roundTotal,
                      fontWeight: 800,
                      color: theme.headerBg,
                      fontFamily: REPORT_FONTS.serif,
                      background: theme.paperAlt,
                    }}
                  >
                    {round.totalScore}pt
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
        <p style={{ marginTop: 10, fontSize: REPORT_TYPE.caption, color: theme.inkMuted, textAlign: 'center' }}>
          ○ 正解 · △ 一部一致 · × 不正解 · — 未判定
        </p>
      </SectionBlock>
    </ReportShell>
  );
}
