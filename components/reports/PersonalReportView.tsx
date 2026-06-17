'use client';

import { PersonalColumnHeader } from '@/components/reports/personal/PersonalColumnHeader';
import {
  PersonalAnalysisSection,
  PersonalReportCover,
  PersonalResultCard,
  PersonalSectionTitle,
} from '@/components/reports/personal/PersonalReportParts';
import { PersonalScoreCell } from '@/components/reports/personal/PersonalScoreCell';
import { PersonalReportShell, PERSONAL_CONTENT_W, personalTableHeadStyle } from '@/components/reports/personal/PersonalReportShell';
import { PERSONAL_CANVAS, PERSONAL_SHADOW, PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';
import type { PersonalReportData, ReportItemKey } from '@/lib/report-data/types';
import { personalRoundTableColWidths, personalTableLayout } from '@/lib/report-export/personal-layout-scale';
import { REPORT_FONTS } from '@/lib/report-export/theme';
import { PERSONAL_ANSWER_COLUMN_ORDER } from '@/lib/report-export/typography';

function orderedAnswerKeys(activeKeys: ReportItemKey[]): ReportItemKey[] {
  return PERSONAL_ANSWER_COLUMN_ORDER.filter((k) => activeKeys.includes(k));
}

function tableCellInner(rowH: number, padding: string, align: 'left' | 'center') {
  return {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: align === 'center' ? ('center' as const) : ('flex-start' as const),
    minHeight: rowH,
    height: '100%',
    padding,
    boxSizing: 'border-box' as const,
    lineHeight: 1.25,
  };
}

export function PersonalReportView({ data }: { data: PersonalReportData }) {
  const p = data.participant;
  const diffSign = p.diffFromOverallAverage >= 0 ? '+' : '';
  const answerKeys = orderedAnswerKeys(data.activeItemKeys);
  const roundCount = data.rounds.length;
  const tbl = personalTableLayout(roundCount, answerKeys.length);
  const colWidths = personalRoundTableColWidths(answerKeys.length);
  const thStyle = personalTableHeadStyle(tbl);

  return (
    <PersonalReportShell>
      <PersonalReportCover data={data} />

      <section style={{ marginBottom: PERSONAL_CANVAS.sectionGap }}>
        <PersonalSectionTitle>結果</PersonalSectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <PersonalResultCard label="順位" value={`${p.rank}位`} featured />
          <PersonalResultCard label="総得点" value={`${p.totalScore}pt`} featured />
          <PersonalResultCard label="平均得点" value={`${p.averageScore}pt`} />
          <PersonalResultCard label="全体平均との差" value={`${diffSign}${p.diffFromOverallAverage}pt`} />
        </div>
      </section>

      <PersonalAnalysisSection data={data} />

      <section>
        <PersonalSectionTitle>全てのラウンドの回答と得点</PersonalSectionTitle>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${PERSONAL_V1.cardBorder}`, boxShadow: PERSONAL_SHADOW.sheet, background: PERSONAL_V1.cardBg }}>
          <table style={{ width: PERSONAL_CONTENT_W, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center' }}>No.</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>サンプル</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>出題者</th>
                {answerKeys.map((key) => {
                  const pts = data.itemMaxScores[key];
                  const label = data.analysis.categoryScores.find((c) => c.key === key)?.label ?? key;
                  return (
                    <th key={key} style={{ ...thStyle, textAlign: 'left' }}>
                      <PersonalColumnHeader label={label} points={pts} headFs={tbl.headFs} headPtsFs={tbl.headPtsFs} />
                    </th>
                  );
                })}
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <PersonalColumnHeader
                    label="合計得点"
                    points={data.maxTotalScorePerRound}
                    align="center"
                    headFs={tbl.headFs}
                    headPtsFs={tbl.headPtsFs}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rounds.map((round, i) => (
                <tr key={round.sampleId} style={{ background: i % 2 === 1 ? PERSONAL_V1.zebra : PERSONAL_V1.cardBg }}>
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: 0,
                      verticalAlign: 'middle',
                      borderBottom: `1px solid ${PERSONAL_V1.rule}`,
                    }}
                  >
                    <div style={{ ...tableCellInner(tbl.rowH, tbl.padding, 'center'), fontSize: tbl.noFs, fontWeight: 800, fontFamily: REPORT_FONTS.serif, color: PERSONAL_V1.headerBg }}>
                      {round.roundNo}
                    </div>
                  </td>
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: 0,
                      verticalAlign: 'middle',
                      borderBottom: `1px solid ${PERSONAL_V1.rule}`,
                    }}
                  >
                    <div style={{ ...tableCellInner(tbl.rowH, tbl.padding, 'left'), fontSize: tbl.sampleFs, fontWeight: 700, color: PERSONAL_V1.ink, wordBreak: 'break-word' }}>
                      {round.sampleName}
                    </div>
                  </td>
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: 0,
                      verticalAlign: 'middle',
                      borderBottom: `1px solid ${PERSONAL_V1.rule}`,
                    }}
                  >
                    <div style={{ ...tableCellInner(tbl.rowH, tbl.padding, 'left'), fontSize: Math.max(12, tbl.sampleFs - 1), color: PERSONAL_V1.inkMuted }}>
                      {round.presenterName}
                    </div>
                  </td>
                  {answerKeys.map((key) => (
                    <PersonalScoreCell
                      key={key}
                      item={round.items[key]}
                      layout={{
                        rowH: tbl.rowH,
                        answerFs: tbl.answerFs,
                        metaFs: tbl.metaFs,
                        padRight: tbl.scorePadRight,
                        badgeSize: tbl.badgeSize,
                        cellPadding: tbl.padding,
                      }}
                    />
                  ))}
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: 0,
                      verticalAlign: 'middle',
                      background: `linear-gradient(180deg, ${PERSONAL_V1.paperAlt}, ${PERSONAL_V1.zebra})`,
                      borderBottom: `1px solid ${PERSONAL_V1.rule}`,
                      borderLeft: `1px solid ${PERSONAL_V1.ruleStrong}`,
                    }}
                  >
                    <div
                      style={{
                        ...tableCellInner(tbl.rowH, tbl.padding, 'center'),
                        fontSize: tbl.totalFs,
                        fontWeight: 800,
                        fontFamily: REPORT_FONTS.serif,
                        color: PERSONAL_V1.headerBg,
                        lineHeight: 1,
                      }}
                    >
                      {round.totalScore}
                      <span style={{ fontSize: Math.max(12, tbl.totalFs - 12), fontWeight: 700 }}>pt</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PersonalReportShell>
  );
}
