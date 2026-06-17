'use client';

import {
  ChartCard,
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
  const matrixFs = tableFontSize(matrixColCount, bottleRowCount);
  const bottleFs = tableFontSize(8, bottleRowCount);
  const nameLen = participantNameMaxLen(participantCount);
  const matrixPad = tableCellPadding(matrixColCount, bottleRowCount);
  const bottlePad = tableCellPadding(8, bottleRowCount);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle} sessionDate={data.basic.date}>
      <ReportSection theme={theme} title="最終順位">
        <ReportTable theme={theme} fontSize={REPORT_TYPE.tableBody}>
          <ReportThead theme={theme}>
            <ReportTh align="center" style={{ width: 72 }}>順位</ReportTh>
            <ReportTh>参加者</ReportTh>
            <ReportTh align="right" style={{ width: 100 }}>総得点</ReportTh>
          </ReportThead>
          <tbody>
            {data.rankings.map((r, i) => (
              <ReportTr key={r.participantId} theme={theme} index={i} accent={r.rank <= 3}>
                <ReportTd
                  theme={theme}
                  align="center"
                  style={{
                    fontSize: r.rank <= 3 ? REPORT_TYPE.rankLarge : REPORT_TYPE.tableNum,
                    fontWeight: 800,
                    padding: '14px 12px',
                  }}
                >
                  {rankDisplay(r.rank)}
                </ReportTd>
                <ReportTd theme={theme} style={{ fontWeight: r.rank <= 3 ? 700 : 500, fontSize: r.rank <= 3 ? 16 : REPORT_TYPE.tableBody, padding: '14px 12px' }}>
                  {r.name}
                </ReportTd>
                <ReportTd theme={theme} align="right" numeric emphasis style={{ padding: '14px 12px' }}>
                  {r.totalScore}pt
                </ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>

      <ReportSection theme={theme} title="得点サマリー">
        <MetricCardGrid columns={5}>
          <MetricCard theme={theme} label="総得点" value={`${data.scoreSummary.totalScore}pt`} />
          <MetricCard theme={theme} label="平均得点" value={`${data.scoreSummary.averageScore}pt`} />
          <MetricCard theme={theme} label="最高得点" value={`${data.scoreSummary.maxScore}pt`} />
          <MetricCard theme={theme} label="最低得点" value={`${data.scoreSummary.minScore}pt`} />
          <MetricCard theme={theme} label="中央値" value={`${data.scoreSummary.medianScore}pt`} />
        </MetricCardGrid>
      </ReportSection>

      <ReportSection theme={theme} title="出題ボトル一覧（正解）">
        <ReportTable theme={theme} fontSize={bottleFs} fixed>
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '29%' }} />
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
                <ReportTd theme={theme} style={{ fontWeight: 600, padding: bottlePad }}>{b.sampleName}</ReportTd>
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
      </ReportSection>

      <ReportSection theme={theme} title="各ボトルの点数一覧" style={{ marginBottom: 0 }}>
        <ReportTable theme={theme} fontSize={matrixFs} fixed>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            {data.rankings.map((p) => (
              <col key={p.participantId} />
            ))}
            <col style={{ width: 56 }} />
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
                <ReportTd theme={theme} style={{ fontWeight: 600, padding: matrixPad }}>{row.sampleName}</ReportTd>
                <ReportTd theme={theme} style={{ color: theme.inkMuted, padding: matrixPad }}>{shortName(row.presenterName, nameLen)}</ReportTd>
                {row.participantScores.map((ps) => (
                  <ReportTd key={ps.participantId} theme={theme} align="center" numeric style={{ padding: matrixPad }}>
                    {ps.score}
                  </ReportTd>
                ))}
                <ReportTd theme={theme} align="right" numeric emphasis style={{ padding: matrixPad }}>
                  {row.totalScore}
                </ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </ReportSection>
    </ReportShell>
  );
}
