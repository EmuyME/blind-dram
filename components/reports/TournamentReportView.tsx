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
  SectionTitle,
  StatCard,
} from '@/components/reports/ReportShell';
import type { TournamentReportData } from '@/lib/report-data/types';
import { RANK_MEDALS, REPORT_THEMES, shortName, tableFontSize } from '@/lib/report-export/theme';

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
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <ReportPanel theme={theme} style={{ flex: '1 1 280px' }}>
          <SectionTitle theme={theme} icon={<IconClipboard color={theme.accent} />}>
            基本情報
          </SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: <IconCalendar color={theme.accent} />, label: '開催日', value: data.basic.date },
              { icon: <IconUsers color={theme.accent} />, label: '参加者', value: `${data.basic.participantCount}名` },
              { icon: <IconBottle color={theme.accent} />, label: '出題数', value: `${data.basic.sampleCount}本` },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {row.icon}
                <span style={{ color: theme.inkMuted, width: 72, fontSize: 14 }}>{row.label}</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel theme={theme} style={{ flex: '2 1 400px' }}>
          <SectionTitle theme={theme} icon={<IconCrown color={theme.accent} />}>
            最終順位
          </SectionTitle>
          <ReportTable theme={theme}>
            <ReportThead theme={theme}>
              <ReportTh align="center" style={{ width: 56 }}>
                順位
              </ReportTh>
              <ReportTh>参加者</ReportTh>
              <ReportTh align="right" style={{ width: 88 }}>
                総得点
              </ReportTh>
            </ReportThead>
            <tbody>
              {data.rankings.map((r, i) => (
                <ReportTr key={r.participantId} theme={theme} index={i}>
                  <ReportTd align="center" style={{ fontSize: r.rank <= 3 ? 20 : 15, fontWeight: 800 }}>
                    {rankDisplay(r.rank)}
                  </ReportTd>
                  <ReportTd style={{ fontWeight: r.rank <= 3 ? 700 : 400 }}>{r.name}</ReportTd>
                  <ReportTd align="right" style={{ fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                    {r.totalScore}
                  </ReportTd>
                </ReportTr>
              ))}
            </tbody>
          </ReportTable>
        </ReportPanel>
      </div>

      <SectionTitle theme={theme} icon={<IconSigma color={theme.accent} />}>
        得点サマリー
      </SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <StatCard theme={theme} label="総得点" value={`${data.scoreSummary.totalScore}pt`} icon={<IconSigma color={theme.accent} />} />
        <StatCard theme={theme} label="平均得点" value={`${data.scoreSummary.averageScore}pt`} icon={<IconScales color={theme.accent} />} />
        <StatCard theme={theme} label="最高得点" value={`${data.scoreSummary.maxScore}pt`} icon={<IconCrown color={theme.accent} />} />
        <StatCard theme={theme} label="最低得点" value={`${data.scoreSummary.minScore}pt`} />
        <StatCard theme={theme} label="中央値" value={`${data.scoreSummary.medianScore}pt`} icon={<IconScales color={theme.accent} />} />
      </div>

      <SectionTitle theme={theme} icon={<IconBottle color={theme.accent} />}>
        出題ボトル一覧（正解）
      </SectionTitle>
      <div style={{ overflowX: 'auto', marginBottom: 28 }}>
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
                <ReportTd>{b.presenterName}</ReportTd>
                <ReportTd>{b.truth.region}</ReportTd>
                <ReportTd>{b.truth.distillery}</ReportTd>
                <ReportTd>{b.truth.age}</ReportTd>
                <ReportTd>{b.truth.abv}</ReportTd>
                <ReportTd>{b.truth.cask}</ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </div>

      <SectionTitle theme={theme} icon={<IconClipboard color={theme.accent} />}>
        各ボトルの点数一覧
      </SectionTitle>
      <div style={{ overflowX: 'auto' }}>
        <ReportTable theme={theme} fontSize={fs}>
          <ReportThead theme={theme}>
            <ReportTh align="center" style={{ width: 36 }}>
              No.
            </ReportTh>
            <ReportTh style={{ width: '14%' }}>サンプル</ReportTh>
            <ReportTh style={{ width: '10%' }}>出題者</ReportTh>
            {data.rankings.map((p) => (
              <ReportTh key={p.participantId} align="center" style={{ cursor: 'default' }}>
                <span title={p.name}>{shortName(p.name, 6)}</span>
              </ReportTh>
            ))}
            <ReportTh align="right" style={{ width: 52 }}>
              合計
            </ReportTh>
          </ReportThead>
          <tbody>
            {data.bottleScores.map((row, i) => (
              <ReportTr key={row.sampleId} theme={theme} index={i}>
                <ReportTd align="center">{row.roundNo}</ReportTd>
                <ReportTd style={{ wordBreak: 'break-all', fontWeight: 600 }}>{row.sampleName}</ReportTd>
                <ReportTd>{shortName(row.presenterName, 5)}</ReportTd>
                {row.participantScores.map((ps) => (
                  <ReportTd key={ps.participantId} align="center" style={{ fontWeight: 700 }}>
                    {ps.score}
                  </ReportTd>
                ))}
                <ReportTd align="right" style={{ fontWeight: 800, color: theme.headerBg }}>
                  {row.totalScore}
                </ReportTd>
              </ReportTr>
            ))}
          </tbody>
        </ReportTable>
      </div>
    </ReportShell>
  );
}
