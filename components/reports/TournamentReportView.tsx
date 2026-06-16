'use client';

import {
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
import type { TournamentReportData } from '@/lib/report-data/types';
import { RANK_MEDALS, REPORT_FONTS, REPORT_THEMES, shortName, tableFontSize } from '@/lib/report-export/theme';
import { REPORT_TYPE } from '@/lib/report-export/typography';

function rankDisplay(rank: number): string {
  if (rank >= 1 && rank <= 3) return RANK_MEDALS[rank - 1];
  return String(rank);
}

export function TournamentReportView({ data }: { data: TournamentReportData }) {
  const theme = REPORT_THEMES.tournament;
  const fs = tableFontSize(data.rankings.length + 3);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionBlock>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
          <ReportPanel theme={theme} title="基本情報">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: '開催日', value: data.basic.date },
                { label: '参加者', value: `${data.basic.participantCount}名` },
                { label: '出題数', value: `${data.basic.sampleCount}本` },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ color: theme.inkMuted, fontSize: REPORT_TYPE.statLabel, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontWeight: 800, fontSize: REPORT_TYPE.tableNum, fontFamily: REPORT_FONTS.serif, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </ReportPanel>

          <ReportPanel theme={theme} title="最終順位">
            <ReportTable fontSize={REPORT_TYPE.tableBody}>
              <ReportThead theme={theme}>
                <ReportTh align="center" style={{ width: 56 }}>順位</ReportTh>
                <ReportTh>参加者</ReportTh>
                <ReportTh align="right" style={{ width: 88 }}>総得点</ReportTh>
              </ReportThead>
              <tbody>
                {data.rankings.map((r, i) => (
                  <ReportTr key={r.participantId} theme={theme} index={i}>
                    <ReportTd theme={theme} align="center" style={{ fontSize: r.rank <= 3 ? 22 : REPORT_TYPE.tableNum, fontWeight: 800 }}>
                      {rankDisplay(r.rank)}
                    </ReportTd>
                    <ReportTd theme={theme} style={{ fontWeight: r.rank <= 3 ? 700 : 500, fontSize: REPORT_TYPE.tableBody }}>{r.name}</ReportTd>
                    <ReportTd theme={theme} align="right" style={{ fontWeight: 800, fontFamily: REPORT_FONTS.serif, fontSize: REPORT_TYPE.tableNum }}>
                      {r.totalScore}
                    </ReportTd>
                  </ReportTr>
                ))}
              </tbody>
            </ReportTable>
          </ReportPanel>
        </div>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>得点サマリー</SectionTitle>
        <StatCardGrid columns={5}>
          <StatCard theme={theme} label="総得点" value={`${data.scoreSummary.totalScore}pt`} />
          <StatCard theme={theme} label="平均得点" value={`${data.scoreSummary.averageScore}pt`} />
          <StatCard theme={theme} label="最高得点" value={`${data.scoreSummary.maxScore}pt`} />
          <StatCard theme={theme} label="最低得点" value={`${data.scoreSummary.minScore}pt`} />
          <StatCard theme={theme} label="中央値" value={`${data.scoreSummary.medianScore}pt`} />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>出題ボトル一覧（正解）</SectionTitle>
        <ReportTable fontSize={fs}>
          <ReportThead theme={theme}>
            {['No.', 'サンプル', '出題者', '地域', '蒸溜所', '年数', '度数', '樽'].map((h) => (
              <ReportTh key={h} align={h === 'No.' || h === '年数' || h === '度数' ? 'center' : 'left'}>
                {h}
              </ReportTh>
            ))}
          </ReportThead>
          <tbody>
            {data.bottles.map((b, i) => (
              <ReportTr key={b.sampleId} theme={theme} index={i}>
                <ReportTd theme={theme} align="center">{b.roundNo}</ReportTd>
                <ReportTd theme={theme} style={{ fontWeight: 700 }}>{b.sampleName}</ReportTd>
                <ReportTd theme={theme} style={{ color: theme.inkMuted }}>{b.presenterName}</ReportTd>
                <ReportTd theme={theme}>{b.truth.region}</ReportTd>
                <ReportTd theme={theme}>{b.truth.distillery}</ReportTd>
                <ReportTd theme={theme} align="center">{b.truth.age}</ReportTd>
                <ReportTd theme={theme} align="center">{b.truth.abv}</ReportTd>
                <ReportTd theme={theme}>{b.truth.cask}</ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme}>各ボトルの点数一覧</SectionTitle>
        <ReportTable fontSize={fs} fixed>
          <ReportThead theme={theme}>
            <ReportTh align="center" style={{ width: 40 }}>No.</ReportTh>
            <ReportTh style={{ width: '12%' }}>サンプル</ReportTh>
            <ReportTh style={{ width: '10%' }}>出題者</ReportTh>
            {data.rankings.map((p) => (
              <ReportTh key={p.participantId} align="center">
                {shortName(p.name, 6)}
              </ReportTh>
            ))}
            <ReportTh align="right" style={{ width: 52 }}>合計</ReportTh>
          </ReportThead>
          <tbody>
            {data.bottleScores.map((row, i) => (
              <ReportTr key={row.sampleId} theme={theme} index={i}>
                <ReportTd theme={theme} align="center">{row.roundNo}</ReportTd>
                <ReportTd theme={theme} style={{ fontWeight: 700 }}>{row.sampleName}</ReportTd>
                <ReportTd theme={theme} style={{ color: theme.inkMuted }}>{shortName(row.presenterName, 6)}</ReportTd>
                {row.participantScores.map((ps) => (
                  <ReportTd key={ps.participantId} theme={theme} align="center" style={{ fontWeight: 800, fontFamily: REPORT_FONTS.serif, fontSize: REPORT_TYPE.tableNum }}>
                    {ps.score}
                  </ReportTd>
                ))}
                <ReportTd theme={theme} align="right" style={{ fontWeight: 800, color: theme.headerBg, fontFamily: REPORT_FONTS.serif, fontSize: REPORT_TYPE.tableNum }}>
                  {row.totalScore}
                </ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </SectionBlock>
    </ReportShell>
  );
}
