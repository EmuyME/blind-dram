'use client';

import { IconCrown, IconStar, IconTrendUp, IconWreath } from '@/components/reports/ReportIcons';
import { ScoringItemCell } from '@/components/reports/ScoringItemCell';
import {
  HighlightCard,
  ParticipantBanner,
  PanelTitle,
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
import { radialDy, radialTextAnchor, REPORT_TYPE } from '@/lib/report-export/typography';

function RadarChart({ data, theme }: { data: PersonalReportData; theme: typeof REPORT_THEMES.personal }) {
  const cats = data.analysis.categoryScores.filter((c) => c.maxScore > 0);
  if (cats.length === 0) return null;

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t} points={gridPts(t)} fill="none" stroke={theme.rule} strokeWidth={1} />
      ))}
      {cats.map((_, i) => {
        const ax = cx + r * Math.cos(angle(i));
        const ay = cy + r * Math.sin(angle(i));
        return <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke={theme.rule} strokeWidth={1} />;
      })}
      <polygon points={dataPts} fill={`${theme.accent}35`} stroke={theme.headerBg} strokeWidth={2} />
      {cats.map((c, i) => {
        const a = angle(i);
        const lx = cx + (r + 38) * Math.cos(a);
        const ly = cy + (r + 38) * Math.sin(a);
        const anchor = radialTextAnchor(a);
        return (
          <text key={c.key} x={lx} y={ly + radialDy(a, 0)} textAnchor={anchor} fontSize={REPORT_TYPE.chartAxis} fill={theme.inkMuted}>
            {c.label}
            <tspan
              x={lx}
              dy={radialDy(a, 1)}
              fontWeight={700}
              fill={theme.headerBg}
              fontSize={REPORT_TYPE.tableNum}
            >
              {c.rate}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

function ScoringColumnHeader({ label, points }: { label: string; points: number }) {
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div>{label}</div>
      <div style={{ fontSize: '0.88em', fontWeight: 500, opacity: 0.9 }}>（{points}pt）</div>
    </div>
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
        <SectionTitle theme={theme} icon={<IconCrown color={theme.accent} size={18} />}>
          結果
        </SectionTitle>
        <StatCardGrid columns={4}>
          <StatCard theme={theme} label="順位" value={`${p.rank}位`} icon={<IconCrown color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="総得点" value={`${p.totalScore}pt`} icon={<IconWreath color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="平均得点" value={`${p.averageScore}pt`} icon={<IconStar color={theme.accent} size={22} />} />
          <StatCard
            theme={theme}
            label="全体平均との差"
            value={`${diffSign}${p.diffFromOverallAverage}pt`}
            icon={<IconTrendUp color={theme.accent} size={22} />}
          />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme} icon={<IconStar color={theme.accent} size={18} />}>
          分析
        </SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 300px) minmax(200px, 1fr) minmax(240px, 280px)',
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          <ReportPanel theme={theme} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PanelTitle theme={theme}>部門別得点</PanelTitle>
            <RadarChart data={data} theme={theme} />
          </ReportPanel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <HighlightCard
              theme={theme}
              title="最高得点ボトル"
              icon={<IconCrown color={theme.accent} size={18} />}
              lines={[
                data.analysis.highestBottle.sampleName,
                `${data.analysis.highestBottle.score}pt`,
                data.analysis.highestBottle.othersCount > 0 ? `ほか${data.analysis.highestBottle.othersCount}件` : '',
              ].filter(Boolean)}
            />
            <HighlightCard
              theme={theme}
              title="最低得点ボトル"
              icon={<IconTrendUp color={theme.inkMuted} size={18} />}
              headerTone="muted"
              lines={[
                data.analysis.lowestBottle.sampleName,
                `${data.analysis.lowestBottle.score}pt`,
                data.analysis.lowestBottle.othersCount > 0 ? `ほか${data.analysis.lowestBottle.othersCount}件` : '',
              ].filter(Boolean)}
            />
          </div>

          <ReportPanel theme={theme}>
            <PanelTitle theme={theme}>部門別得点サマリー</PanelTitle>
            <ReportTable theme={theme} fontSize={REPORT_TYPE.tableBody}>
              <ReportThead theme={theme}>
                <ReportTh>部門</ReportTh>
                <ReportTh align="right" style={{ width: 48 }}>獲得</ReportTh>
                <ReportTh align="right" style={{ width: 48 }}>満点</ReportTh>
                <ReportTh align="right" style={{ width: 56 }}>達成率</ReportTh>
              </ReportThead>
              <tbody>
                {data.analysis.categoryScores
                  .filter((c) => c.maxScore > 0)
                  .map((c, i) => (
                    <ReportTr key={c.key} theme={theme} index={i}>
                      <ReportTd>{c.label}</ReportTd>
                      <ReportTd align="right">{c.earnedScore}</ReportTd>
                      <ReportTd align="right">{c.maxScore}</ReportTd>
                      <ReportTd align="right" style={{ fontWeight: 700, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
                        {c.rate}%
                      </ReportTd>
                    </ReportTr>
                  ))}
              </tbody>
            </ReportTable>
          </ReportPanel>
        </div>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme}>全てのラウンドの回答と得点</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <ReportTable theme={theme} fontSize={REPORT_TYPE.tableDense}>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ width: 36 }}>No.</ReportTh>
              <ReportTh style={{ minWidth: 72 }}>サンプル</ReportTh>
              <ReportTh style={{ minWidth: 64 }}>出題者</ReportTh>
              {REPORT_ITEM_KEYS.map((key) => {
                const pts = data.itemMaxScores[key];
                const label = data.analysis.categoryScores.find((c) => c.key === key)?.label ?? key;
                return (
                  <ReportTh key={key} style={{ minWidth: 100 }}>
                    {pts > 0 ? <ScoringColumnHeader label={label} points={pts} /> : '—'}
                  </ReportTh>
                );
              })}
              <ReportTh align="center" style={{ minWidth: 72 }}>
                <ScoringColumnHeader label="合計得点" points={data.maxTotalScorePerRound} />
              </ReportTh>
            </ReportThead>
            <tbody>
              {data.rounds.map((round, i) => (
                <ReportTr key={round.sampleId} theme={theme} index={i}>
                  <ReportTd align="center" style={{ fontWeight: 600 }}>{round.roundNo}</ReportTd>
                  <ReportTd style={{ fontWeight: 700 }}>{round.sampleName}</ReportTd>
                  <ReportTd style={{ color: theme.inkMuted }}>{round.presenterName}</ReportTd>
                  {REPORT_ITEM_KEYS.map((key) => (
                    <ScoringItemCell key={key} item={round.items[key]} />
                  ))}
                  <ReportTd
                    align="center"
                    style={{
                      fontSize: REPORT_TYPE.roundTotal,
                      fontWeight: 800,
                      color: theme.headerBg,
                      fontFamily: REPORT_FONTS.serif,
                      background: theme.paperAlt,
                      verticalAlign: 'middle',
                    }}
                  >
                    {round.totalScore}pt
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </div>
        <p style={{ marginTop: 12, fontSize: REPORT_TYPE.caption, color: theme.inkMuted, lineHeight: 1.55 }}>
          ○ 正解 · △ 一部一致 · × 不正解 · — 未判定 · セル内は「回答 / 正答（点数）」
        </p>
      </SectionBlock>
    </ReportShell>
  );
}
