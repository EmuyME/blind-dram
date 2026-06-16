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
import { CHART_COLORS, RANK_MEDALS, REPORT_FONTS, REPORT_THEMES } from '@/lib/report-export/theme';
import { REPORT_TYPE } from '@/lib/report-export/typography';

function CumulativeChart({ data, theme }: { data: OverallReportData; theme: typeof REPORT_THEMES.overall }) {
  const rounds = data.cumulativeScores;
  if (rounds.length === 0) return null;

  const participants = rounds[0].scores;
  const nRounds = rounds.length;
  const legendRows = Math.ceil(participants.length / 3);
  const chartH = 300;
  const legendH = legendRows * 28 + 16;
  const h = chartH + legendH;
  const w = 1120;
  const pad = { l: 64, r: 24, t: 24, b: 40 };
  const plotW = w - pad.l - pad.r;
  const plotH = chartH - pad.t - pad.b;
  const maxY = Math.max(...rounds.flatMap((r) => r.scores.map((s) => s.cumulativeScore)), 1);

  const x = (roundNo: number) => pad.l + ((roundNo - 1) / Math.max(1, nRounds - 1)) * plotW;
  const y = (score: number) => pad.t + (1 - score / maxY) * plotH;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = pad.t + (1 - t) * plotH;
        const val = Math.round(maxY * t);
        return (
          <g key={t}>
            <line x1={pad.l} y1={yy} x2={w - pad.r} y2={yy} stroke={theme.rule} strokeWidth={1} />
            <text x={pad.l - 10} y={yy + 5} textAnchor="end" fontSize={REPORT_TYPE.chartTick} fill={theme.inkMuted}>
              {val}
            </text>
          </g>
        );
      })}
      {rounds.map((r) => (
        <text key={r.roundNo} x={x(r.roundNo)} y={chartH - 8} textAnchor="middle" fontSize={REPORT_TYPE.chartAxis} fill={theme.inkMuted} fontWeight={700}>
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
            <polyline fill="none" stroke={color} strokeWidth={3} points={pts.map((pt) => `${pt.x},${pt.y}`).join(' ')} />
            {pts.map((pt, idx) => (
              <circle key={idx} cx={pt.x} cy={pt.y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        );
      })}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const col = pi % 3;
        const row = Math.floor(pi / 3);
        const lx = pad.l + col * 360;
        const ly = chartH + 20 + row * 28;
        const last = rounds[rounds.length - 1]?.scores.find((s) => s.participantId === p.participantId);
        return (
          <g key={`leg-${p.participantId}`}>
            <line x1={lx} y1={ly + 8} x2={lx + 24} y2={ly + 8} stroke={color} strokeWidth={4} strokeLinecap="round" />
            <text x={lx + 32} y={ly + 12} fontSize={REPORT_TYPE.legend} fill={theme.ink} fontWeight={600}>
              {p.participantName}
            </text>
            {last && (
              <text x={lx + 200} y={ly + 12} fontSize={REPORT_TYPE.legend} fill={color} fontWeight={800}>
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
        <SectionTitle theme={theme}>基本情報</SectionTitle>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'start' }}>
          <HighlightCard theme={theme} title="優勝者" lines={[`${h.winner.name}`, `${h.winner.totalScore}pt`]} />
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
          <HighlightCard theme={theme} title="最難関ボトル" lines={[h.hardestBottle.sampleName, `合計 ${h.hardestBottle.totalScore}pt`, `平均 ${h.hardestBottle.averageScore}pt`]} />
          <HighlightCard theme={theme} title="健闘ボトル" lines={[h.bestPerformedBottle.sampleName, `合計 ${h.bestPerformedBottle.totalScore}pt`, `平均 ${h.bestPerformedBottle.averageScore}pt`]} />
          <HighlightCard theme={theme} title="差が付いたボトル" lines={[h.mostDivisiveBottle.sampleName, `標準偏差 ${h.mostDivisiveBottle.standardDeviation}`]} />
        </div>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>ボトル別難易度（平均得点の低い順）</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
          <ReportPanel theme={theme}>
            <ReportTable fontSize={REPORT_TYPE.tableBody}>
              <ReportThead theme={theme}>
                <ReportTh align="center" style={{ width: 48 }}>順位</ReportTh>
                <ReportTh>サンプル</ReportTh>
                <ReportTh>出題者</ReportTh>
                <ReportTh align="right" style={{ width: 64 }}>合計</ReportTh>
                <ReportTh align="right" style={{ width: 64 }}>平均</ReportTh>
              </ReportThead>
              <tbody>
                {data.bottleDifficulty.map((b, i) => (
                  <ReportTr key={b.sampleId} theme={theme} index={i}>
                    <ReportTd theme={theme} align="center" style={{ fontSize: b.rank <= 3 ? 20 : REPORT_TYPE.tableNum, fontWeight: 800 }}>
                      {b.rank <= 3 ? RANK_MEDALS[b.rank - 1] : b.rank}
                    </ReportTd>
                    <ReportTd theme={theme} style={{ fontWeight: 700 }}>{b.sampleName}</ReportTd>
                    <ReportTd theme={theme} style={{ color: theme.inkMuted }}>{b.presenterName}</ReportTd>
                    <ReportTd theme={theme} align="right">{b.totalScore}</ReportTd>
                    <ReportTd theme={theme} align="right" style={{ fontWeight: 800, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
                      {b.averageScore}
                    </ReportTd>
                  </ReportTr>
                ))}
              </tbody>
            </ReportTable>
          </ReportPanel>
          <ReportPanel theme={theme} title="平均得点（pt）">
            {data.bottleDifficulty.map((b, i) => (
              <div key={b.sampleId} style={{ display: 'flex', alignItems: 'center', marginBottom: i < data.bottleDifficulty.length - 1 ? 12 : 0, height: 32 }}>
                <span style={{ width: 88, flexShrink: 0, fontSize: REPORT_TYPE.tableBody, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.sampleName}
                </span>
                <div style={{ flex: 1, height: 22, background: theme.paperAlt, borderRadius: 4, margin: '0 12px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(b.averageScore / maxAvg) * 100}%`,
                      height: '100%',
                      background: theme.headerBg,
                      borderRadius: 4,
                      minWidth: b.averageScore > 0 ? 6 : 0,
                    }}
                  />
                </div>
                <span style={{ width: 44, textAlign: 'right', fontWeight: 800, fontSize: REPORT_TYPE.tableNum, fontFamily: REPORT_FONTS.serif, color: theme.headerBg }}>
                  {b.averageScore}
                </span>
              </div>
            ))}
          </ReportPanel>
        </div>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme}>各ラウンドまでの合計得点推移</SectionTitle>
        <ReportPanel theme={theme} style={{ padding: '8px 4px 4px' }}>
          <CumulativeChart data={data} theme={theme} />
        </ReportPanel>
      </SectionBlock>
    </ReportShell>
  );
}
