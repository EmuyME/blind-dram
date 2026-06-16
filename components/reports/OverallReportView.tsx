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

  const w = 1080;
  const h = 360;
  const pad = { l: 58, r: 200, t: 28, b: 44 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const maxY = Math.max(...rounds.flatMap((r) => r.scores.map((s) => s.cumulativeScore)), 1);
  const participants = rounds[0].scores;
  const nRounds = rounds.length;

  const x = (roundNo: number) => pad.l + ((roundNo - 1) / Math.max(1, nRounds - 1)) * plotW;
  const y = (score: number) => pad.t + (1 - score / maxY) * plotH;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <text x={pad.l} y={16} fontSize={REPORT_TYPE.chartAxis} fill={theme.inkMuted} fontWeight={600}>
        累積得点
      </text>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = pad.t + (1 - t) * plotH;
        const val = Math.round(maxY * t);
        return (
          <g key={t}>
            <line x1={pad.l} y1={yy} x2={w - pad.r} y2={yy} stroke={theme.rule} strokeWidth={1} />
            <text x={pad.l - 8} y={yy + 4} textAnchor="end" fontSize={REPORT_TYPE.chartTick} fill={theme.inkMuted}>
              {val}
            </text>
          </g>
        );
      })}
      {rounds.map((r) => (
        <text
          key={r.roundNo}
          x={x(r.roundNo)}
          y={h - 14}
          textAnchor="middle"
          fontSize={REPORT_TYPE.chartAxis}
          fill={theme.inkMuted}
          fontWeight={600}
        >
          R{r.roundNo}
        </text>
      ))}
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
              <circle key={idx} cx={pt.x} cy={pt.y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5} />
            ))}
            {last && (
              <text
                x={last.x + (nRounds > 1 ? 6 : 0)}
                y={last.y - 6}
                fontSize={REPORT_TYPE.chartTick}
                fill={color}
                fontWeight={700}
                textAnchor="start"
              >
                {last.score}
              </text>
            )}
          </g>
        );
      })}
      {participants.map((p, pi) => {
        const color = CHART_COLORS[pi % CHART_COLORS.length];
        const ly = pad.t + pi * 22;
        const last = rounds[rounds.length - 1]?.scores.find((s) => s.participantId === p.participantId);
        return (
          <g key={`leg-${p.participantId}`}>
            <line x1={w - pad.r + 16} y1={ly + 6} x2={w - pad.r + 36} y2={ly + 6} stroke={color} strokeWidth={3} />
            <circle cx={w - pad.r + 26} cy={ly + 6} r={3} fill={color} />
            <text x={w - pad.r + 44} y={ly + 10} fontSize={REPORT_TYPE.legend} fill={theme.ink}>
              {p.participantName}
            </text>
            {last && (
              <text x={w - 12} y={ly + 10} textAnchor="end" fontSize={REPORT_TYPE.legend} fill={color} fontWeight={700}>
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
  const barLabelW = Math.min(
    100,
    Math.max(56, ...data.bottleDifficulty.map((b) => b.sampleName.length * 9)),
  );

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionBlock>
        <SectionTitle theme={theme} icon={<IconClipboard color={theme.accent} size={18} />}>
          基本情報
        </SectionTitle>
        <StatCardGrid columns={5}>
          <StatCard theme={theme} label="開催日" value={data.basic.date} icon={<IconCalendar color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="参加者" value={`${data.basic.participantCount}名`} icon={<IconUsers color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="出題数" value={`${data.basic.sampleCount}本`} icon={<IconBottle color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="総得点" value={`${data.basic.totalScore}pt`} icon={<IconStar color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="平均得点" value={`${data.basic.averageScore}pt`} icon={<IconScales color={theme.accent} size={22} />} />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme} icon={<IconStar color={theme.accent} size={18} />}>
          大会ハイライト
        </SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <HighlightCard theme={theme} title="優勝者" icon={<IconCrown color={theme.accent} size={18} />} lines={[`${h.winner.name}`, `${h.winner.totalScore}pt`]} />
          <HighlightCard
            theme={theme}
            title="最高得点"
            icon={<IconMedal color={theme.accent} size={18} />}
            lines={[`${h.highestScore.participantName}`, `${h.highestScore.sampleName} ${h.highestScore.score}pt`, h.highestScore.othersCount > 0 ? `ほか${h.highestScore.othersCount}件` : ''].filter(Boolean)}
          />
          <HighlightCard
            theme={theme}
            title="最低得点"
            icon={<IconDown color={theme.accent} size={18} />}
            lines={[`${h.lowestScore.participantName}`, `${h.lowestScore.sampleName} ${h.lowestScore.score}pt`, h.lowestScore.othersCount > 0 ? `ほか${h.lowestScore.othersCount}件` : ''].filter(Boolean)}
          />
          <HighlightCard
            theme={theme}
            title="最難関ボトル"
            icon={<IconMountain color={theme.accent} size={18} />}
            lines={[h.hardestBottle.sampleName, `合計 ${h.hardestBottle.totalScore}pt`, `平均 ${h.hardestBottle.averageScore}pt`]}
          />
          <HighlightCard
            theme={theme}
            title="健闘ボトル"
            icon={<IconTrophy color={theme.accent} size={18} />}
            lines={[h.bestPerformedBottle.sampleName, `合計 ${h.bestPerformedBottle.totalScore}pt`, `平均 ${h.bestPerformedBottle.averageScore}pt`]}
          />
          <HighlightCard
            theme={theme}
            title="差が付いたボトル"
            icon={<IconScales color={theme.accent} size={18} />}
            lines={[h.mostDivisiveBottle.sampleName, `標準偏差 ${h.mostDivisiveBottle.standardDeviation}`]}
          />
        </div>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme} icon={<IconChart color={theme.accent} size={18} />}>
          ボトル別難易度（平均得点の低い順）
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <ReportPanel theme={theme}>
            <ReportTable theme={theme} fontSize={REPORT_TYPE.tableBody}>
              <ReportThead theme={theme}>
                <ReportTh align="center" style={{ width: 44 }}>順位</ReportTh>
                <ReportTh>サンプル</ReportTh>
                <ReportTh>出題者</ReportTh>
                <ReportTh align="right" style={{ width: 56 }}>合計</ReportTh>
                <ReportTh align="right" style={{ width: 56 }}>平均</ReportTh>
              </ReportThead>
              <tbody>
                {data.bottleDifficulty.map((b, i) => (
                  <ReportTr key={b.sampleId} theme={theme} index={i}>
                    <ReportTd align="center" style={{ fontSize: b.rank <= 3 ? 16 : REPORT_TYPE.tableNum, fontWeight: 800 }}>
                      {b.rank <= 3 ? RANK_MEDALS[b.rank - 1] : b.rank}
                    </ReportTd>
                    <ReportTd style={{ fontWeight: 600 }}>{b.sampleName}</ReportTd>
                    <ReportTd style={{ color: theme.inkMuted }}>{b.presenterName}</ReportTd>
                    <ReportTd align="right">{b.totalScore}</ReportTd>
                    <ReportTd align="right" style={{ fontWeight: 700, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
                      {b.averageScore}
                    </ReportTd>
                  </ReportTr>
                ))}
              </tbody>
            </ReportTable>
          </ReportPanel>
          <ReportPanel theme={theme} title="平均得点（pt）">
            {data.bottleDifficulty.map((b, i) => (
              <div
                key={b.sampleId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: i < data.bottleDifficulty.length - 1 ? 10 : 0,
                  minHeight: 28,
                }}
              >
                <span
                  style={{
                    width: barLabelW,
                    flexShrink: 0,
                    fontSize: REPORT_TYPE.tableDense,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: theme.inkMuted,
                  }}
                >
                  {b.sampleName}
                </span>
                <div style={{ flex: 1, height: 18, background: theme.paperAlt, borderRadius: 3, overflow: 'hidden', margin: '0 10px' }}>
                  <div
                    style={{
                      width: `${(b.averageScore / maxAvg) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${theme.headerBg}, ${theme.tableHeadBg})`,
                      borderRadius: 3,
                      minWidth: b.averageScore > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 36,
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: REPORT_TYPE.tableNum,
                    fontFamily: REPORT_FONTS.serif,
                    color: theme.headerBg,
                  }}
                >
                  {b.averageScore}
                </span>
              </div>
            ))}
          </ReportPanel>
        </div>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme} icon={<IconChart color={theme.accent} size={18} />}>
          各ラウンドまでの合計得点推移
        </SectionTitle>
        <ReportPanel theme={theme} style={{ padding: '12px 8px 8px' }}>
          <CumulativeChart data={data} theme={theme} />
        </ReportPanel>
      </SectionBlock>
    </ReportShell>
  );
}
