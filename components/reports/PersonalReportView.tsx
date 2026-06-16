'use client';

import { IconCrown, IconStar, IconTrendUp, IconWreath } from '@/components/reports/ReportIcons';
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
  SectionTitle,
  StatCard,
} from '@/components/reports/ReportShell';
import type { PersonalReportData } from '@/lib/report-data/types';
import { REPORT_ITEM_KEYS } from '@/lib/report-data/types';
import { REPORT_FONTS, REPORT_THEMES } from '@/lib/report-export/theme';

function RadarChart({ data, theme }: { data: PersonalReportData; theme: typeof REPORT_THEMES.personal }) {
  const cats = data.analysis.categoryScores.filter((c) => c.maxScore > 0);
  if (cats.length === 0) return null;
  const cx = 150;
  const cy = 150;
  const r = 95;
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
    <svg width={300} height={300} style={{ display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t} points={gridPts(t)} fill="none" stroke={theme.rule} strokeWidth={1} />
      ))}
      {cats.map((_, i) => {
        const ax = cx + r * Math.cos(angle(i));
        const ay = cy + r * Math.sin(angle(i));
        return <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke={theme.rule} strokeWidth={1} />;
      })}
      <polygon points={dataPts} fill={`${theme.accent}40`} stroke={theme.headerBg} strokeWidth={2.5} />
      {cats.map((c, i) => {
        const lx = cx + (r + 32) * Math.cos(angle(i));
        const ly = cy + (r + 32) * Math.sin(angle(i));
        return (
          <text key={c.key} x={lx} y={ly} textAnchor="middle" fontSize={11} fill={theme.inkMuted}>
            {c.label}
            <tspan x={lx} dy={13} fontWeight={700} fill={theme.headerBg} fontSize={13}>
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
      <SectionTitle theme={theme} icon={<IconCrown color={theme.accent} />}>
        結果
      </SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <StatCard theme={theme} label="順位" value={`${p.rank}位`} icon={<IconCrown color={theme.accent} />} />
        <StatCard theme={theme} label="総得点" value={`${p.totalScore}pt`} icon={<IconWreath color={theme.accent} />} />
        <StatCard theme={theme} label="平均得点" value={`${p.averageScore}pt`} icon={<IconStar color={theme.accent} />} />
        <StatCard
          theme={theme}
          label="全体平均との差"
          value={`${diffSign}${p.diffFromOverallAverage}pt`}
          icon={<IconTrendUp color={theme.accent} />}
        />
      </div>

      <SectionTitle theme={theme} icon={<IconStar color={theme.accent} />}>
        分析
      </SectionTitle>
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        <ReportPanel theme={theme} style={{ flex: '0 0 auto' }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
            部門別得点
          </p>
          <RadarChart data={data} theme={theme} />
        </ReportPanel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 200 }}>
          <HighlightCard
            theme={theme}
            title="最高得点ボトル"
            icon={<IconCrown color={theme.accent} size={20} />}
            lines={[
              data.analysis.highestBottle.sampleName,
              `${data.analysis.highestBottle.score}pt`,
              data.analysis.highestBottle.othersCount > 0
                ? `ほか${data.analysis.highestBottle.othersCount}件`
                : '',
            ].filter(Boolean)}
          />
          <HighlightCard
            theme={theme}
            title="最低得点ボトル"
            icon={<IconTrendUp color={theme.inkMuted} size={20} />}
            headerTone="muted"
            lines={[
              data.analysis.lowestBottle.sampleName,
              `${data.analysis.lowestBottle.score}pt`,
              data.analysis.lowestBottle.othersCount > 0
                ? `ほか${data.analysis.lowestBottle.othersCount}件`
                : '',
            ].filter(Boolean)}
          />
        </div>

        <ReportPanel theme={theme} style={{ flex: '1 1 260px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
            部門別得点サマリー
          </p>
          <ReportTable theme={theme} fontSize={13}>
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
                    <ReportTd>{c.label}</ReportTd>
                    <ReportTd align="right">{c.earnedScore}</ReportTd>
                    <ReportTd align="right">{c.maxScore}</ReportTd>
                    <ReportTd align="right" style={{ fontWeight: 700, color: theme.headerBg }}>
                      {c.rate}%
                    </ReportTd>
                  </ReportTr>
                ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
      </div>

      <SectionTitle theme={theme}>全てのラウンドの回答と得点</SectionTitle>
      <div style={{ overflowX: 'auto' }}>
        <ReportTable theme={theme} fontSize={13}>
          <ReportThead theme={theme}>
            <ReportTh align="center">No.</ReportTh>
            <ReportTh>サンプル</ReportTh>
            <ReportTh>出題者</ReportTh>
            {REPORT_ITEM_KEYS.map((key) => (
              <ReportTh key={key} style={{ minWidth: 108 }}>
                {data.itemMaxScores[key] > 0
                  ? `${data.analysis.categoryScores.find((c) => c.key === key)?.label ?? key}（${data.itemMaxScores[key]}pt）`
                  : '—'}
              </ReportTh>
            ))}
            <ReportTh align="center">合計得点（{data.maxTotalScorePerRound}pt）</ReportTh>
          </ReportThead>
          <tbody>
            {data.rounds.map((round, i) => (
              <ReportTr key={round.sampleId} theme={theme} index={i}>
                <ReportTd align="center">{round.roundNo}</ReportTd>
                <ReportTd style={{ fontWeight: 700 }}>{round.sampleName}</ReportTd>
                <ReportTd>{round.presenterName}</ReportTd>
                {REPORT_ITEM_KEYS.map((key) => (
                  <ScoringItemCell key={key} item={round.items[key]} />
                ))}
                <ReportTd
                  align="center"
                  style={{
                    fontSize: 22,
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
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: theme.inkMuted, lineHeight: 1.6 }}>
        ○ 正解（満点） · △ 一部一致 · × 不正解 · — 未判定 · セル内は「回答 / 正答（点数）」
      </p>
    </ReportShell>
  );
}
