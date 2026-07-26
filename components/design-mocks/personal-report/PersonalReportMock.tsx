'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { CategoryScore, PersonalReportMockData, ScoreItem } from '@/components/design-mocks/personal-report/dummy-data';
import { getMockData } from '@/components/design-mocks/personal-report/dummy-data';
import {
  analysisAreaHeight,
  analysisSideCellHeight,
  bottleCardLayout,
  categoryChartLayout,
  insightCardLayout,
  roundTableColWidths,
  tableLayout,
} from '@/components/design-mocks/personal-report/layout-scale';
import { CANVAS, COLORS, FONT, SHADOW } from '@/components/design-mocks/personal-report/tokens';
import {
  CaptureVAlign,
  captureLineBox,
  resultCardContentH,
  analysisSideCardContentH,
  headerCellContentH,
} from '@/components/reports/personal/capture-align';
import { PersonalJudgementMark } from '@/components/reports/personal/PersonalJudgementMark';
import {
  PersonalScoreLines,
  personalScoreLinesContentH,
} from '@/components/reports/personal/PersonalScoreLines';
import { PERSONAL_JUDGEMENT_BG } from '@/components/reports/personal/personal-tokens';

const CONTENT_W = CANVAS.width - CANVAS.padding * 2;
const TH_HEIGHT = 48;

function bestAndWorstCategory(categories: readonly CategoryScore[]) {
  const sorted = [...categories].sort((a, b) => b.rate - a.rate);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

function ReportCover({ data }: { data: PersonalReportMockData }) {
  return (
    <section
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: SHADOW.sheet,
        border: `1px solid ${COLORS.cardBorder}`,
        marginBottom: CANVAS.sectionGap,
      }}
    >
      <div
        style={{
          height: 84,
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${COLORS.headerBg} 0%, ${COLORS.headerBgDeep} 100%)`,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.16em', color: COLORS.accent, fontFamily: FONT.serif }}>
          BLIND DRAM
        </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.headerText, fontFamily: FONT.serif, letterSpacing: '0.06em' }}>
          個人レポート
        </span>
        <span style={{ fontSize: 16, color: COLORS.accentSoft, fontFamily: FONT.serif }}>{data.sessionDate}</span>
      </div>

      <div
        style={{
          background: `linear-gradient(180deg, ${COLORS.cardBg} 0%, ${COLORS.zebra} 100%)`,
          padding: '28px 24px 26px',
          textAlign: 'center',
          borderTop: `1px solid ${COLORS.rule}`,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.inkSoft, fontFamily: FONT.serif }}>
          Participant
        </p>
        <h1 style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, lineHeight: 1.15 }}>
          {data.participantName}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, color: COLORS.inkMuted, lineHeight: 1.4 }}>{data.sessionTitle}</p>
        <div style={{ margin: '18px auto 0', width: 120, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)` }} />
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.headerBg,
          fontFamily: FONT.serif,
          lineHeight: 1.2,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ width: 4, height: 22, borderRadius: 2, background: COLORS.accent, flexShrink: 0 }} />
        {children}
      </h2>
      <div style={{ marginTop: 8, width: 56, height: 2, background: COLORS.accent, opacity: 0.85 }} />
    </div>
  );
}

function ResultCard({ label, value, featured }: { label: string; value: string; featured?: boolean }) {
  const cardH = 112;
  const innerH = cardH - (featured ? 3 : 1) - 1;
  const contentH = resultCardContentH();
  return (
    <div
      style={{
        height: cardH,
        borderRadius: 10,
        boxSizing: 'border-box',
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: `${SHADOW.card}, ${SHADOW.inset}`,
        borderTop: featured ? `3px solid ${COLORS.accent}` : `1px solid ${COLORS.cardBorder}`,
        overflow: 'hidden',
      }}
    >
      <CaptureVAlign height={innerH} contentH={contentH} align="center" padding="0 12px" opticalNudge={4}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.inkMuted, letterSpacing: '0.02em', lineHeight: 1.2, textAlign: 'center' }}>{label}</p>
          <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 800, color: COLORS.headerBg, fontFamily: FONT.serif, lineHeight: 1, textAlign: 'center' }}>
            {value}
          </p>
        </div>
      </CaptureVAlign>
    </div>
  );
}

function CategoryBarChart({ categories }: { categories: readonly CategoryScore[] }) {
  const layout = categoryChartLayout(categories.length);

  return (
    <div style={{ width: '100%', height: layout.chartH, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: layout.gap, boxSizing: 'border-box' }}>
      {categories.map((c) => {
        const trackH = layout.barH;
        return (
          <div
            key={c.label}
            style={{
              display: 'grid',
              gridTemplateColumns: `${layout.labelCol}px 1fr ${layout.rateCol}px`,
              gap: layout.gap > 9 ? 10 : 14,
              height: trackH,
            }}
          >
            <span style={captureLineBox(trackH, { fontSize: layout.labelFont, fontWeight: 700, color: COLORS.ink, textAlign: 'left', wordBreak: 'keep-all' })}>
              {c.label}
            </span>
            <div style={{ position: 'relative', height: trackH, borderRadius: 7, overflow: 'hidden', background: COLORS.barTrack }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: `${c.rate}%`,
                  background: `linear-gradient(90deg, ${COLORS.headerBg}bb, ${COLORS.headerBg})`,
                  borderRadius: 7,
                  minWidth: c.rate > 0 ? 6 : 0,
                }}
              />
              <span style={captureLineBox(trackH, {
                position: 'relative',
                zIndex: 1,
                paddingLeft: 8,
                fontSize: layout.scoreFont,
                fontWeight: 700,
                color: c.rate >= 40 ? '#fff' : COLORS.inkMuted,
                fontFamily: FONT.serif,
                whiteSpace: 'nowrap',
              })}>
                {c.earned}/{c.max}pt
              </span>
            </div>
            <span style={captureLineBox(trackH, { fontSize: layout.valueFont, fontWeight: 800, color: COLORS.headerBg, fontFamily: FONT.serif, textAlign: 'right' })}>
              {c.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InsightCard({
  kind,
  category,
  categoryCount,
  cardH,
}: {
  kind: 'best' | 'worst';
  category: CategoryScore;
  categoryCount: number;
  cardH: number;
}) {
  const isBest = kind === 'best';
  const ins = insightCardLayout(categoryCount);
  const contentH = analysisSideCardContentH(ins.titleFs, ins.labelFs, ins.rateFs);
  return (
    <div
      style={{
        height: cardH,
        borderRadius: 10,
        background: isBest ? COLORS.insightGood : COLORS.insightWarn,
        border: `1px solid ${isBest ? '#b8d9c4' : '#e8d4a0'}`,
        boxShadow: SHADOW.card,
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <CaptureVAlign height={cardH} contentH={contentH} padding={ins.padding} align="center" opticalNudge={1}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: ins.titleFs, fontWeight: 700, color: COLORS.inkSoft, letterSpacing: '0.06em' }}>
            {isBest ? '最得意部門' : '要改善部門'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: ins.labelFs, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, lineHeight: 1.25, wordBreak: 'break-word' }}>
            {category.label}
          </p>
          <p style={{ margin: '6px 0 0', lineHeight: 1.2 }}>
            <span style={{ fontFamily: FONT.serif, fontWeight: 800, color: COLORS.headerBg, fontSize: ins.rateFs }}>{category.rate}%</span>
            <span style={{ marginLeft: 6, fontSize: 12, color: COLORS.inkMuted }}>
              {category.earned}/{category.max}pt
            </span>
          </p>
        </div>
      </CaptureVAlign>
    </div>
  );
}

function BottleCard({
  title,
  name,
  score,
  layout,
  cardH,
}: {
  title: string;
  name: string;
  score: number;
  layout: ReturnType<typeof bottleCardLayout>;
  cardH: number;
}) {
  const contentH = analysisSideCardContentH(layout.titleFs, layout.nameFs, layout.scoreFs);
  return (
    <div
      style={{
        height: cardH,
        borderRadius: 10,
        overflow: 'hidden',
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: SHADOW.card,
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <CaptureVAlign height={cardH} contentH={contentH} padding={layout.padding} align="center" opticalNudge={1}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: layout.titleFs, fontWeight: 700, color: COLORS.inkSoft, letterSpacing: '0.06em' }}>
            {title}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: layout.nameFs, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, lineHeight: 1.25, wordBreak: 'break-word' }}>
            {name}
          </p>
          <p style={{ margin: '6px 0 0', lineHeight: 1.2 }}>
            <span style={{ fontSize: layout.scoreFs, fontWeight: 800, color: COLORS.headerBg, fontFamily: FONT.serif }}>
              {score}
              <span style={{ fontSize: layout.scoreUnitFs, fontWeight: 700, marginLeft: 2 }}>pt</span>
            </span>
          </p>
        </div>
      </CaptureVAlign>
    </div>
  );
}

function scoreCellHPad(padding: string, padRight: number): string {
  const parts = padding.trim().split(/\s+/);
  const rawLeft = parts.length >= 4 ? parts[3] : parts.length === 2 ? parts[1] : parts[0];
  const parsed = parseInt(String(rawLeft), 10);
  const left = Math.max(Number.isFinite(parsed) ? parsed : 10, 12) + 3;
  return `0 ${padRight}px 0 ${left}px`;
}

function ScoreCell({
  item,
  rowH,
  answerFs,
  metaFs,
  padRight,
  badgeSize,
  cellPadding,
}: {
  item: ScoreItem;
  rowH: number;
  answerFs: number;
  metaFs: number;
  padRight: number;
  badgeSize: number;
  cellPadding: string;
}) {
  const contentH = personalScoreLinesContentH(answerFs, metaFs);
  const bg = PERSONAL_JUDGEMENT_BG[item.judgement];
  const rightPad = Math.max(padRight > 24 ? 10 : 8, 8);

  return (
    <td
      style={{
        position: 'relative',
        padding: 0,
        verticalAlign: 'top',
        textAlign: 'left',
        background: bg,
        borderBottom: `1px solid ${COLORS.rule}`,
        height: rowH,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        overflow: 'hidden',
      }}
    >
      <PersonalJudgementMark judgement={item.judgement} rowH={rowH} />
      <CaptureVAlign
        height={rowH}
        contentH={contentH}
        padding={scoreCellHPad(cellPadding, rightPad)}
        align="left"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <PersonalScoreLines
          answer={item.answer}
          truth={item.truth}
          earnedScore={item.points}
          judgement={item.judgement}
          answerFs={answerFs}
          metaFs={metaFs}
        />
      </CaptureVAlign>
    </td>
  );
}

function ColumnHeader({
  label,
  points,
  align = 'left',
  headFs,
  headPtsFs,
}: {
  label: string;
  points: number;
  align?: 'left' | 'center';
  headFs: number;
  headPtsFs: number;
}) {
  return (
    <span style={{ textAlign: align, lineHeight: 1.2, display: 'block' }}>
      <span style={{ display: 'block', fontSize: headFs, fontWeight: 700 }}>{label}</span>
      <span style={{ display: 'block', fontSize: headPtsFs, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>({points}pt)</span>
    </span>
  );
}

export type PersonalReportMockProps = {
  data?: PersonalReportMockData;
};

/** 1400px 固定キャンバス — 個人レポート静的モック v1 */
export function PersonalReportMock({ data = getMockData('standard') }: PersonalReportMockProps) {
  const diffSign = data.results.diffFromAverage >= 0 ? '+' : '';
  const { best, worst } = bestAndWorstCategory(data.categories);
  const categoryCount = data.categories.length;
  const roundCount = data.rounds.length;
  const scoringCount = data.scoringColumns.length;

  const analysisH = analysisAreaHeight(categoryCount);
  const bottleLayout = bottleCardLayout(analysisH);
  const sideCellH = analysisSideCellHeight(analysisH);
  const tbl = tableLayout(roundCount, scoringCount);
  const colWidths = roundTableColWidths(scoringCount);
  const categoryCompact = categoryCount > 6;
  const headContentH = headerCellContentH(tbl.headFs, tbl.headPtsFs);

  const thStyle: CSSProperties = {
    height: TH_HEIGHT,
    padding: 0,
    fontSize: tbl.headFs,
    fontWeight: 700,
    color: '#fff',
    background: COLORS.headerBg,
    borderBottom: `1px solid ${COLORS.headerBgDeep}`,
    verticalAlign: 'top',
  };

  return (
    <article
      data-personal-report-mock
      data-report-mock-version="v1"
      data-report-capture-page
      data-report-width={CANVAS.width}
      data-category-count={categoryCount}
      data-round-count={roundCount}
      data-scoring-columns={scoringCount}
      style={{
        width: CANVAS.width,
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${CANVAS.bg} 0%, #f0e8da 100%)`,
        color: COLORS.ink,
        fontFamily: FONT.sans,
        padding: CANVAS.padding,
      }}
    >
      <ReportCover data={data} />

      <section style={{ marginBottom: CANVAS.sectionGap }}>
        <SectionTitle>結果</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <ResultCard label="順位" value={`${data.results.rank}位`} featured />
          <ResultCard label="総得点" value={`${data.results.totalScore}pt`} featured />
          <ResultCard label="平均得点" value={`${data.results.averageScore}pt`} />
          <ResultCard label="全体平均との差" value={`${diffSign}${data.results.diffFromAverage}pt`} />
        </div>
      </section>

      <section style={{ marginBottom: CANVAS.sectionGap }}>
        <SectionTitle>分析</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 14, height: analysisH }}>
          <div
            style={{
              borderRadius: 10,
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.cardBorder}`,
              boxShadow: SHADOW.card,
              padding: categoryCompact ? '14px 18px' : '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              minHeight: 0,
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: COLORS.headerBg, fontFamily: FONT.serif, flexShrink: 0 }}>
              部門別得点
            </p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0, overflow: 'hidden' }}>
              <CategoryBarChart categories={data.categories} />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 10,
              height: '100%',
              minHeight: 0,
            }}
          >
            <InsightCard kind="best" category={best} categoryCount={categoryCount} cardH={sideCellH} />
            <InsightCard kind="worst" category={worst} categoryCount={categoryCount} cardH={sideCellH} />
            <BottleCard title="最高得点ボトル" name={data.highestBottle.name} score={data.highestBottle.score} layout={bottleLayout} cardH={sideCellH} />
            <BottleCard title="最低得点ボトル" name={data.lowestBottle.name} score={data.lowestBottle.score} layout={bottleLayout} cardH={sideCellH} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>全てのラウンドの回答と得点</SectionTitle>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.cardBorder}`, boxShadow: SHADOW.sheet, background: COLORS.cardBg }}>
          <table style={{ width: CONTENT_W, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <CaptureVAlign height={TH_HEIGHT} contentH={headContentH} padding={tbl.padding} align="center">
                    No.
                  </CaptureVAlign>
                </th>
                <th style={{ ...thStyle, textAlign: 'left' }}>
                  <CaptureVAlign height={TH_HEIGHT} contentH={headContentH} padding={tbl.padding} align="left">
                    サンプル
                  </CaptureVAlign>
                </th>
                <th style={{ ...thStyle, textAlign: 'left' }}>
                  <CaptureVAlign height={TH_HEIGHT} contentH={headContentH} padding={tbl.padding} align="left">
                    出題者
                  </CaptureVAlign>
                </th>
                {data.scoringColumns.map((col) => (
                  <th key={col.key} style={{ ...thStyle, textAlign: 'left' }}>
                    <CaptureVAlign height={TH_HEIGHT} contentH={headContentH} padding={tbl.padding} align="left">
                      <ColumnHeader label={col.label} points={col.points} headFs={tbl.headFs} headPtsFs={tbl.headPtsFs} />
                    </CaptureVAlign>
                  </th>
                ))}
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <CaptureVAlign height={TH_HEIGHT} contentH={headContentH} padding={tbl.padding} align="center">
                    <ColumnHeader label="合計得点" points={data.maxTotalPerRound} align="center" headFs={tbl.headFs} headPtsFs={tbl.headPtsFs} />
                  </CaptureVAlign>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rounds.map((r, i) => (
                <tr key={r.no} style={{ background: i % 2 === 1 ? COLORS.zebra : COLORS.cardBg }}>
                  <td style={{ height: tbl.rowH, padding: 0, verticalAlign: 'top', textAlign: 'center', borderBottom: `1px solid ${COLORS.rule}` }}>
                    <span style={captureLineBox(tbl.rowH, { fontSize: tbl.noFs, fontWeight: 800, fontFamily: FONT.serif, color: COLORS.headerBg, textAlign: 'center' })}>
                      {r.no}
                    </span>
                  </td>
                  <td style={{ height: tbl.rowH, padding: 0, verticalAlign: 'top', borderBottom: `1px solid ${COLORS.rule}` }}>
                    <span style={captureLineBox(tbl.rowH, {
                      fontSize: tbl.sampleFs, fontWeight: 700, color: COLORS.ink,
                      paddingLeft: tbl.padding.split(/\s+/)[1] ?? tbl.padding.split(/\s+/)[0],
                      lineHeight: 1.25, display: 'flex', alignItems: 'center',
                    })}>
                      {r.sample}
                    </span>
                  </td>
                  <td style={{ height: tbl.rowH, padding: 0, verticalAlign: 'top', borderBottom: `1px solid ${COLORS.rule}` }}>
                    <span style={captureLineBox(tbl.rowH, {
                      fontSize: Math.max(12, tbl.sampleFs - 1), color: COLORS.inkMuted,
                      paddingLeft: tbl.padding.split(/\s+/)[1] ?? tbl.padding.split(/\s+/)[0],
                      lineHeight: 1.25, display: 'flex', alignItems: 'center',
                    })}>
                      {r.presenter}
                    </span>
                  </td>
                  {data.scoringColumns.map((col) => {
                    const item = r.items[col.key] ?? { answer: '—', truth: '—', judgement: 'unjudged' as const, points: 0 };
                    return (
                      <ScoreCell
                        key={col.key}
                        item={item}
                        rowH={tbl.rowH}
                        answerFs={tbl.answerFs}
                        metaFs={tbl.metaFs}
                        padRight={tbl.scorePadRight}
                        badgeSize={tbl.badgeSize}
                        cellPadding={tbl.padding}
                      />
                    );
                  })}
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: 0,
                      verticalAlign: 'top',
                      textAlign: 'center',
                      background: `linear-gradient(180deg, ${COLORS.paperAlt}, ${COLORS.zebra})`,
                      borderBottom: `1px solid ${COLORS.rule}`,
                      borderLeft: `1px solid ${COLORS.ruleStrong}`,
                    }}
                  >
                    <span style={captureLineBox(tbl.rowH, { fontSize: tbl.totalFs, fontWeight: 800, fontFamily: FONT.serif, color: COLORS.headerBg, textAlign: 'center' })}>
                      {r.total}
                      <span style={{ fontSize: Math.max(12, tbl.totalFs - 12), fontWeight: 700 }}>pt</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer style={{ marginTop: 28, textAlign: 'center', paddingTop: 18, borderTop: `1px solid ${COLORS.rule}` }}>
        <span style={{ fontSize: 11, color: COLORS.inkSoft, letterSpacing: '0.18em', fontFamily: FONT.serif }}>BLIND DRAM</span>
      </footer>
    </article>
  );
}
