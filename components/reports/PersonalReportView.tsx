'use client';

import { ScoringItemCell } from '@/components/reports/ScoringItemCell';
import { HighlightCard, ReportShell, SectionTitle, StatCard } from '@/components/reports/ReportShell';
import type { PersonalReportData } from '@/lib/report-data/types';
import { REPORT_ITEM_KEYS } from '@/lib/report-data/types';
import { REPORT_THEMES } from '@/lib/report-export/theme';

function RadarChart({ data, theme }: { data: PersonalReportData; theme: typeof REPORT_THEMES.personal }) {
  const cats = data.analysis.categoryScores.filter((c) => c.maxScore > 0);
  if (cats.length === 0) return null;
  const cx = 140;
  const cy = 140;
  const r = 100;
  const n = cats.length;
  const angle = (i: number) => (-Math.PI / 2) + (2 * Math.PI * i) / n;

  const gridPts = (ratio: number) =>
    cats.map((_, i) => `${cx + r * ratio * Math.cos(angle(i))},${cy + r * ratio * Math.sin(angle(i))}`).join(' ');

  const dataPts = cats
    .map((c, i) => {
      const ratio = c.rate / 100;
      return `${cx + r * ratio * Math.cos(angle(i))},${cy + r * ratio * Math.sin(angle(i))}`;
    })
    .join(' ');

  return (
    <svg width={280} height={280}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t} points={gridPts(t)} fill="none" stroke={theme.rule} strokeWidth={1} />
      ))}
      {cats.map((c, i) => {
        const lx = cx + (r + 28) * Math.cos(angle(i));
        const ly = cy + (r + 28) * Math.sin(angle(i));
        return (
          <text key={c.key} x={lx} y={ly} textAnchor="middle" fontSize={11} fill={theme.inkMuted}>
            {c.label}
            <tspan x={lx} dy={12} fontWeight={700} fill={theme.ink}>
              {c.rate}%
            </tspan>
          </text>
        );
      })}
      <polygon points={dataPts} fill={`${theme.accent}44`} stroke={theme.headerBg} strokeWidth={2} />
    </svg>
  );
}

export function PersonalReportView({ data }: { data: PersonalReportData }) {
  const theme = REPORT_THEMES.personal;
  const p = data.participant;
  const diffSign = p.diffFromOverallAverage >= 0 ? '+' : '';

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <p style={{ textAlign: 'center', fontSize: 26, fontWeight: 700, margin: '0 0 24px', color: theme.headerBg }}>
        参加者：{p.name}
      </p>

      <SectionTitle theme={theme}>結果</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <StatCard theme={theme} label="順位" value={`${p.rank}位`} />
        <StatCard theme={theme} label="総得点" value={`${p.totalScore}pt`} />
        <StatCard theme={theme} label="平均得点" value={`${p.averageScore}pt`} />
        <StatCard theme={theme} label="全体平均との差" value={`${diffSign}${p.diffFromOverallAverage}pt`} />
      </div>

      <SectionTitle theme={theme}>分析</SectionTitle>
      <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: theme.inkMuted }}>部門別得点</p>
          <RadarChart data={data} theme={theme} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 200 }}>
          <HighlightCard
            theme={theme}
            title="最高得点ボトル"
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
            lines={[
              data.analysis.lowestBottle.sampleName,
              `${data.analysis.lowestBottle.score}pt`,
              data.analysis.lowestBottle.othersCount > 0
                ? `ほか${data.analysis.lowestBottle.othersCount}件`
                : '',
            ].filter(Boolean)}
          />
        </div>
      </div>

      <SectionTitle theme={theme}>全てのラウンドの回答と得点</SectionTitle>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: theme.tableHeadBg, color: '#fff' }}>
              <th style={{ padding: 8 }}>No.</th>
              <th style={{ padding: 8 }}>サンプル</th>
              <th style={{ padding: 8 }}>出題者</th>
              {REPORT_ITEM_KEYS.map((key) => (
                <th key={key} style={{ padding: 8, minWidth: 100 }}>
                  {data.itemMaxScores[key] > 0
                    ? `${data.analysis.categoryScores.find((c) => c.key === key)?.label ?? key}（${data.itemMaxScores[key]}pt）`
                    : '—'}
                </th>
              ))}
              <th style={{ padding: 8 }}>合計得点（{data.maxTotalScorePerRound}pt）</th>
            </tr>
          </thead>
          <tbody>
            {data.rounds.map((round) => (
              <tr key={round.sampleId} style={{ borderBottom: `1px solid ${theme.rule}` }}>
                <td style={{ padding: 8, textAlign: 'center', verticalAlign: 'top' }}>{round.roundNo}</td>
                <td style={{ padding: 8, verticalAlign: 'top', fontWeight: 600 }}>{round.sampleName}</td>
                <td style={{ padding: 8, verticalAlign: 'top' }}>{round.presenterName}</td>
                {REPORT_ITEM_KEYS.map((key) => (
                  <ScoringItemCell key={key} item={round.items[key]} />
                ))}
                <td
                  style={{
                    padding: 8,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: 20,
                    fontWeight: 800,
                    color: theme.headerBg,
                  }}
                >
                  {round.totalScore}pt
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: theme.inkMuted }}>
        ○ 正解 · △ 一部一致 · × 不正解 · — 未判定 · セル内は「回答 / 正答（点数）」
      </p>
    </ReportShell>
  );
}
