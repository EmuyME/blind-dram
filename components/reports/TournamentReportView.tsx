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
import { RANK_MEDALS, REPORT_THEMES } from '@/lib/report-export/theme';
import {
  participantNameMaxLen,
  shortName,
  tableCellPadding,
  tableFontSize,
} from '@/lib/report-export/layout-scale';
import { REPORT_TYPE } from '@/lib/report-export/typography';

function rankDisplay(rank: number): string {
  if (rank >= 1 && rank <= 3) return RANK_MEDALS[rank - 1];
  return String(rank);
}

export function TournamentReportView({ data }: { data: TournamentReportData }) {
  const theme = REPORT_THEMES.tournament;
  const participantCount = data.rankings.length;
  const bottleRowCount = data.bottleScores.length;
  const matrixColCount = participantCount + 4;
  const bottleColCount = 8;
  const matrixFs = tableFontSize(matrixColCount, bottleRowCount);
  const bottleFs = tableFontSize(bottleColCount, bottleRowCount);
  const nameLen = participantNameMaxLen(participantCount);
  const matrixPad = tableCellPadding(matrixColCount, bottleRowCount);
  const bottlePad = tableCellPadding(bottleColCount, bottleRowCount);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionBlock>
        <SectionTitle theme={theme}>概要</SectionTitle>
        <StatCardGrid columns={3}>
          <StatCard theme={theme} label="開催日" value={data.basic.date} />
          <StatCard theme={theme} label="参加者" value={`${data.basic.participantCount}名`} />
          <StatCard theme={theme} label="出題数" value={`${data.basic.sampleCount}本`} />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme}>最終順位</SectionTitle>
        <ReportPanel theme={theme}>
          <ReportTable fontSize={REPORT_TYPE.tableBody}>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ width: 60 }}>順位</ReportTh>
              <ReportTh>参加者</ReportTh>
              <ReportTh align="right" style={{ width: 88 }}>総得点</ReportTh>
            </ReportThead>
            <tbody>
              {data.rankings.map((r, i) => (
                <ReportTr key={r.participantId} theme={theme} index={i} accent={r.rank <= 3}>
                  <ReportTd theme={theme} align="center" style={{ fontSize: r.rank <= 3 ? 20 : REPORT_TYPE.tableNum, fontWeight: 800 }}>
                    {rankDisplay(r.rank)}
                  </ReportTd>
                  <ReportTd theme={theme} style={{ fontWeight: r.rank <= 3 ? 700 : 500 }}>{r.name}</ReportTd>
                  <ReportTd theme={theme} align="right" numeric emphasis>
                    {r.totalScore}pt
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
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
        <ReportPanel theme={theme}>
          <ReportTable fontSize={bottleFs} fixed>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
            <ReportThead theme={theme}>
              {['No.', 'サンプル', '出題者', '地域', '蒸溜所', '年数', '度数', '樽'].map((h) => (
                <ReportTh key={h} align={h === 'No.' || h === '年数' || h === '度数' ? 'center' : 'left'} style={{ padding: bottlePad }}>
                  {h}
                </ReportTh>
              ))}
            </ReportThead>
            <tbody>
              {data.bottles.map((b, i) => (
                <ReportTr key={b.sampleId} theme={theme} index={i}>
                  <ReportTd theme={theme} align="center" numeric style={{ padding: bottlePad }}>{b.roundNo}</ReportTd>
                  <ReportTd theme={theme} style={{ fontWeight: 700, padding: bottlePad }}>{b.sampleName}</ReportTd>
                  <ReportTd theme={theme} style={{ color: theme.inkMuted, padding: bottlePad }}>{b.presenterName}</ReportTd>
                  <ReportTd theme={theme} style={{ padding: bottlePad }}>{b.truth.region}</ReportTd>
                  <ReportTd theme={theme} style={{ padding: bottlePad }}>{b.truth.distillery}</ReportTd>
                  <ReportTd theme={theme} align="center" style={{ padding: bottlePad }}>{b.truth.age}</ReportTd>
                  <ReportTd theme={theme} align="center" style={{ padding: bottlePad }}>{b.truth.abv}</ReportTd>
                  <ReportTd theme={theme} style={{ padding: bottlePad }}>{b.truth.cask}</ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme}>各ボトルの点数一覧</SectionTitle>
        <ReportPanel theme={theme}>
          <ReportTable fontSize={matrixFs} fixed>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              {data.rankings.map((p) => (
                <col key={p.participantId} />
              ))}
              <col style={{ width: 52 }} />
            </colgroup>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ padding: matrixPad }}>No.</ReportTh>
              <ReportTh style={{ padding: matrixPad }}>サンプル</ReportTh>
              <ReportTh style={{ padding: matrixPad }}>出題者</ReportTh>
              {data.rankings.map((p) => (
                <ReportTh key={p.participantId} align="center" style={{ padding: matrixPad }}>
                  <span title={p.name}>{shortName(p.name, nameLen)}</span>
                </ReportTh>
              ))}
              <ReportTh align="right" style={{ padding: matrixPad }}>合計</ReportTh>
            </ReportThead>
            <tbody>
              {data.bottleScores.map((row, i) => (
                <ReportTr key={row.sampleId} theme={theme} index={i}>
                  <ReportTd theme={theme} align="center" numeric style={{ padding: matrixPad }}>{row.roundNo}</ReportTd>
                  <ReportTd theme={theme} style={{ fontWeight: 700, padding: matrixPad }}>{row.sampleName}</ReportTd>
                  <ReportTd theme={theme} style={{ color: theme.inkMuted, padding: matrixPad }}>{shortName(row.presenterName, nameLen)}</ReportTd>
                  {row.participantScores.map((ps) => (
                    <ReportTd key={ps.participantId} theme={theme} align="center" numeric style={{ padding: matrixPad }}>
                      {ps.score}
                    </ReportTd>
                  ))}
                  <ReportTd theme={theme} align="right" numeric emphasis style={{ padding: matrixPad }}>
                    {row.totalScore}pt
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
      </SectionBlock>
    </ReportShell>
  );
}
