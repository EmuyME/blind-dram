'use client';

import { HighlightCard, ReportShell, SectionTitle, StatCard } from '@/components/reports/ReportShell';
import type { TournamentReportData } from '@/lib/report-data/types';
import { REPORT_THEMES, shortName, tableFontSize } from '@/lib/report-export/theme';

export function TournamentReportView({ data }: { data: TournamentReportData }) {
  const theme = REPORT_THEMES.tournament;
  const participantCols = data.rankings.length;
  const fs = tableFontSize(participantCols + 3);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionTitle theme={theme}>基本情報</SectionTitle>
      <table style={{ width: '100%', marginBottom: 28, borderCollapse: 'collapse', fontSize: 16 }}>
        <tbody>
          {[
            ['開催日', data.basic.date],
            ['参加者', `${data.basic.participantCount}名`],
            ['出題数', `${data.basic.sampleCount}本`],
          ].map(([k, v]) => (
            <tr key={k} style={{ borderBottom: `1px solid ${theme.rule}` }}>
              <td style={{ padding: '10px 12px', width: 140, color: theme.inkMuted }}>{k}</td>
              <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <SectionTitle theme={theme}>最終順位</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
            <thead>
              <tr style={{ background: theme.tableHeadBg, color: '#fff' }}>
                <th style={{ padding: 8 }}>順位</th>
                <th style={{ padding: 8, textAlign: 'left' }}>参加者</th>
                <th style={{ padding: 8, textAlign: 'right' }}>総得点</th>
              </tr>
            </thead>
            <tbody>
              {data.rankings.map((r) => (
                <tr key={r.participantId} style={{ borderBottom: `1px solid ${theme.rule}` }}>
                  <td style={{ padding: 8, textAlign: 'center', fontWeight: 800 }}>{r.rank}</td>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>{r.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <SectionTitle theme={theme}>得点サマリー</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <StatCard theme={theme} label="総得点" value={`${data.scoreSummary.totalScore}pt`} />
            <StatCard theme={theme} label="平均得点" value={`${data.scoreSummary.averageScore}pt`} />
            <StatCard theme={theme} label="最高得点" value={`${data.scoreSummary.maxScore}pt`} />
            <StatCard theme={theme} label="最低得点" value={`${data.scoreSummary.minScore}pt`} />
            <StatCard theme={theme} label="中央値" value={`${data.scoreSummary.medianScore}pt`} />
          </div>
        </div>
      </div>

      <SectionTitle theme={theme}>出題ボトル一覧（正解）</SectionTitle>
      <div style={{ overflowX: 'auto', marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs }}>
          <thead>
            <tr style={{ background: theme.tableHeadBg, color: '#fff' }}>
              {['No.', 'サンプル', '出題者', '地域', '蒸溜所', '年数', '度数', '樽'].map((h) => (
                <th key={h} style={{ padding: '8px 6px', textAlign: h === 'No.' ? 'center' : 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.bottles.map((b) => (
              <tr key={b.sampleId} style={{ borderBottom: `1px solid ${theme.rule}` }}>
                <td style={{ padding: '6px', textAlign: 'center' }}>{b.roundNo}</td>
                <td style={{ padding: '6px' }}>{b.sampleName}</td>
                <td style={{ padding: '6px' }}>{b.presenterName}</td>
                <td style={{ padding: '6px' }}>{b.truth.region}</td>
                <td style={{ padding: '6px' }}>{b.truth.distillery}</td>
                <td style={{ padding: '6px' }}>{b.truth.age}</td>
                <td style={{ padding: '6px' }}>{b.truth.abv}</td>
                <td style={{ padding: '6px' }}>{b.truth.cask}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle theme={theme}>各ボトルの点数一覧</SectionTitle>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs, tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: theme.tableHeadBg, color: '#fff' }}>
              <th style={{ padding: 6, width: 36 }}>No.</th>
              <th style={{ padding: 6, width: '14%' }}>サンプル</th>
              <th style={{ padding: 6, width: '10%' }}>出題者</th>
              {data.rankings.map((p) => (
                <th key={p.participantId} style={{ padding: 4, textAlign: 'center' }} title={p.name}>
                  {shortName(p.name, 6)}
                </th>
              ))}
              <th style={{ padding: 6, textAlign: 'right', width: 48 }}>合計</th>
            </tr>
          </thead>
          <tbody>
            {data.bottleScores.map((row) => (
              <tr key={row.sampleId} style={{ borderBottom: `1px solid ${theme.rule}` }}>
                <td style={{ padding: 6, textAlign: 'center' }}>{row.roundNo}</td>
                <td style={{ padding: 6, wordBreak: 'break-all' }}>{row.sampleName}</td>
                <td style={{ padding: 6 }}>{shortName(row.presenterName, 5)}</td>
                {row.participantScores.map((ps) => (
                  <td key={ps.participantId} style={{ padding: 4, textAlign: 'center', fontWeight: 600 }}>
                    {ps.score}
                  </td>
                ))}
                <td style={{ padding: 6, textAlign: 'right', fontWeight: 700 }}>{row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
