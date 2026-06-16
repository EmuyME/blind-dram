'use client';

import {
  IconBottle,
  IconCalendar,
  IconClipboard,
  IconCrown,
  IconScales,
  IconSigma,
  IconUsers,
} from '@/components/reports/ReportIcons';
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
  const participantCols = data.rankings.length;
  const fs = tableFontSize(participantCols + 3);

  return (
    <ReportShell theme={theme} sessionTitle={data.sessionTitle}>
      <SectionBlock>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(380px, 1.6fr)', gap: 16 }}>
          <ReportPanel theme={theme}>
            <SectionTitle theme={theme} icon={<IconClipboard color={theme.accent} size={18} />}>
              基本情報
            </SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: <IconCalendar color={theme.accent} size={20} />, label: '開催日', value: data.basic.date },
                { icon: <IconUsers color={theme.accent} size={20} />, label: '参加者', value: `${data.basic.participantCount}名` },
                { icon: <IconBottle color={theme.accent} size={20} />, label: '出題数', value: `${data.basic.sampleCount}本` },
              ].map((row) => (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '24px 68px 1fr', alignItems: 'center', gap: 10 }}>
                  {row.icon}
                  <span style={{ color: theme.inkMuted, fontSize: REPORT_TYPE.statLabel }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontSize: REPORT_TYPE.tableNum, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </ReportPanel>

          <ReportPanel theme={theme}>
            <SectionTitle theme={theme} icon={<IconCrown color={theme.accent} size={18} />}>
              最終順位
            </SectionTitle>
            <ReportTable theme={theme}>
              <ReportThead theme={theme}>
                <ReportTh align="center" style={{ width: 52 }}>順位</ReportTh>
                <ReportTh>参加者</ReportTh>
                <ReportTh align="right" style={{ width: 80 }}>総得点</ReportTh>
              </ReportThead>
              <tbody>
                {data.rankings.map((r, i) => (
                  <ReportTr key={r.participantId} theme={theme} index={i}>
                    <ReportTd align="center" style={{ fontSize: r.rank <= 3 ? 18 : REPORT_TYPE.tableNum, fontWeight: 800 }}>
                      {rankDisplay(r.rank)}
                    </ReportTd>
                    <ReportTd style={{ fontWeight: r.rank <= 3 ? 700 : 500 }}>{r.name}</ReportTd>
                    <ReportTd align="right" style={{ fontWeight: 700, fontFamily: REPORT_FONTS.serif, fontSize: REPORT_TYPE.tableNum }}>
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
        <SectionTitle theme={theme} icon={<IconSigma color={theme.accent} size={18} />}>
          得点サマリー
        </SectionTitle>
        <StatCardGrid columns={5}>
          <StatCard theme={theme} label="総得点" value={`${data.scoreSummary.totalScore}pt`} icon={<IconSigma color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="平均得点" value={`${data.scoreSummary.averageScore}pt`} icon={<IconScales color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="最高得点" value={`${data.scoreSummary.maxScore}pt`} icon={<IconCrown color={theme.accent} size={22} />} />
          <StatCard theme={theme} label="最低得点" value={`${data.scoreSummary.minScore}pt`} />
          <StatCard theme={theme} label="中央値" value={`${data.scoreSummary.medianScore}pt`} icon={<IconScales color={theme.accent} size={22} />} />
        </StatCardGrid>
      </SectionBlock>

      <SectionBlock>
        <SectionTitle theme={theme} icon={<IconBottle color={theme.accent} size={18} />}>
          出題ボトル一覧（正解）
        </SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <ReportTable theme={theme} fontSize={fs}>
            <ReportThead theme={theme}>
              {['No.', 'サンプル', '出題者', '地域', '蒸溜所', '年数', '度数', '樽'].map((h) => (
                <ReportTh key={h} align={h === 'No.' ? 'center' : 'left'}>
                  {h}
                </ReportTh>
              ))}
            </ReportThead>
            <tbody>
              {data.bottles.map((b, i) => (
                <ReportTr key={b.sampleId} theme={theme} index={i}>
                  <ReportTd align="center">{b.roundNo}</ReportTd>
                  <ReportTd style={{ fontWeight: 600 }}>{b.sampleName}</ReportTd>
                  <ReportTd style={{ color: theme.inkMuted }}>{b.presenterName}</ReportTd>
                  <ReportTd>{b.truth.region}</ReportTd>
                  <ReportTd>{b.truth.distillery}</ReportTd>
                  <ReportTd align="center">{b.truth.age}</ReportTd>
                  <ReportTd align="center">{b.truth.abv}</ReportTd>
                  <ReportTd>{b.truth.cask}</ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </div>
      </SectionBlock>

      <SectionBlock style={{ marginBottom: 0 }}>
        <SectionTitle theme={theme} icon={<IconClipboard color={theme.accent} size={18} />}>
          各ボトルの点数一覧
        </SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <ReportTable theme={theme} fontSize={fs}>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ width: 36 }}>No.</ReportTh>
              <ReportTh style={{ minWidth: 80 }}>サンプル</ReportTh>
              <ReportTh style={{ minWidth: 64 }}>出題者</ReportTh>
              {data.rankings.map((p) => (
                <ReportTh key={p.participantId} align="center">
                  <span title={p.name}>{shortName(p.name, 5)}</span>
                </ReportTh>
              ))}
              <ReportTh align="right" style={{ width: 48 }}>合計</ReportTh>
            </ReportThead>
            <tbody>
              {data.bottleScores.map((row, i) => (
                <ReportTr key={row.sampleId} theme={theme} index={i}>
                  <ReportTd align="center">{row.roundNo}</ReportTd>
                  <ReportTd style={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.sampleName}</ReportTd>
                  <ReportTd style={{ color: theme.inkMuted }}>{shortName(row.presenterName, 5)}</ReportTd>
                  {row.participantScores.map((ps) => (
                    <ReportTd key={ps.participantId} align="center" style={{ fontWeight: 700, fontFamily: REPORT_FONTS.serif }}>
                      {ps.score}
                    </ReportTd>
                  ))}
                  <ReportTd align="right" style={{ fontWeight: 800, color: theme.headerBg, fontFamily: REPORT_FONTS.serif }}>
                    {row.totalScore}
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </div>
      </SectionBlock>
    </ReportShell>
  );
}
