'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { CategoryScore, PersonalReportMockData, ScoreItem } from '@/components/design-mocks/personal-report/dummy-data';
import { getMockData } from '@/components/design-mocks/personal-report/dummy-data';
import {
  analysisAreaHeight,
  bottleCardLayout,
  categoryChartLayout,
  insightCardLayout,
  roundTableColWidths,
  tableLayout,
} from '@/components/design-mocks/personal-report/layout-scale';
import { CANVAS, COLORS, FONT, JUDGEMENT, SHADOW } from '@/components/design-mocks/personal-report/tokens';

const CONTENT_W = CANVAS.width - CANVAS.padding * 2;

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
  return (
    <div
      style={{
        height: 112,
        borderRadius: 10,
        padding: 16,
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: `${SHADOW.card}, ${SHADOW.inset}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderTop: featured ? `3px solid ${COLORS.accent}` : `3px solid transparent`,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.inkMuted, letterSpacing: '0.02em', lineHeight: 1.2 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: COLORS.headerBg, fontFamily: FONT.serif, lineHeight: 1 }}>
        {value}
      </p>
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
            alignItems: 'center',
            gap: layout.gap > 9 ? 10 : 14,
            height: trackH,
          }}
        >
          <span
            style={{
              fontSize: layout.labelFont,
              fontWeight: 700,
              color: COLORS.ink,
              textAlign: 'left',
              lineHeight: 1,
              wordBreak: 'keep-all',
              display: 'flex',
              alignItems: 'center',
              height: trackH,
            }}
          >
            {c.label}
          </span>
          <div
            style={{
              position: 'relative',
              height: trackH,
              borderRadius: 7,
              overflow: 'hidden',
              background: COLORS.barTrack,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${c.rate}%`,
                background: `linear-gradient(90deg, ${COLORS.headerBg}bb, ${COLORS.headerBg})`,
                borderRadius: 7,
                minWidth: c.rate > 0 ? 6 : 0,
              }}
            />
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                paddingLeft: 8,
                paddingRight: 6,
                boxSizing: 'border-box',
                fontSize: layout.scoreFont,
                fontWeight: 700,
                lineHeight: 1,
                color: c.rate >= 40 ? '#fff' : COLORS.inkMuted,
                fontFamily: FONT.serif,
                whiteSpace: 'nowrap',
              }}
            >
              {c.earned}/{c.max}pt
            </span>
          </div>
          <span
            style={{
              fontSize: layout.valueFont,
              fontWeight: 800,
              color: COLORS.headerBg,
              fontFamily: FONT.serif,
              textAlign: 'right',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: trackH,
            }}
          >
            {c.rate}%
          </span>
        </div>
        );
      })}
    </div>
  );
}

function InsightCard({ kind, category, categoryCount }: { kind: 'best' | 'worst'; category: CategoryScore; categoryCount: number }) {
  const isBest = kind === 'best';
  const ins = insightCardLayout(categoryCount);
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 10,
        padding: ins.padding,
        background: isBest ? COLORS.insightGood : COLORS.insightWarn,
        border: `1px solid ${isBest ? '#b8d9c4' : '#e8d4a0'}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: ins.titleFs, fontWeight: 700, color: COLORS.inkSoft, letterSpacing: '0.04em' }}>
        {isBest ? '最得意部門' : '要改善部門'}
      </p>
      <p style={{ margin: 0, fontSize: ins.labelFs, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, lineHeight: 1.25, wordBreak: 'break-word' }}>
        {category.label}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: COLORS.inkMuted }}>
        <span style={{ fontFamily: FONT.serif, fontWeight: 800, color: COLORS.headerBg, fontSize: ins.rateFs }}>{category.rate}%</span>
        <span style={{ marginLeft: 6, fontSize: 12 }}>
          （{category.earned}/{category.max}pt）
        </span>
      </p>
    </div>
  );
}

function BottleCard({
  title,
  name,
  score,
  layout,
}: {
  title: string;
  name: string;
  score: number;
  layout: ReturnType<typeof bottleCardLayout>;
}) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        boxShadow: SHADOW.card,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div style={{ padding: '9px 10px', background: COLORS.headerBg, color: '#fff', fontSize: layout.titleFs, fontWeight: 700, textAlign: 'center', letterSpacing: '0.04em' }}>
        {title}
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 8px',
          gap: 6,
          background: `linear-gradient(180deg, ${COLORS.cardBg}, ${COLORS.zebra})`,
        }}
      >
        <p style={{ margin: 0, fontSize: layout.nameFs, fontWeight: 700, color: COLORS.ink, textAlign: 'center', lineHeight: 1.25, wordBreak: 'break-word' }}>
          {name}
        </p>
        <p style={{ margin: 0, fontSize: layout.scoreFs, fontWeight: 800, color: COLORS.headerBg, fontFamily: FONT.serif, lineHeight: 1 }}>
          {score}
          <span style={{ fontSize: layout.scoreUnitFs, fontWeight: 700, marginLeft: 2 }}>pt</span>
        </p>
      </div>
    </div>
  );
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
  const j = JUDGEMENT[item.judgement];
  const parts = cellPadding.trim().split(/\s+/);
  const padTop = parts[0];
  const padLeft = parts.length >= 4 ? parts[3] : parts.length === 2 ? parts[1] : parts[0];
  const padBottom = parts.length >= 3 ? parts[2] : parts[0];

  return (
    <td
      style={{
        position: 'relative',
        padding: 0,
        verticalAlign: 'middle',
        textAlign: 'left',
        background: j.bg,
        borderBottom: `1px solid ${COLORS.rule}`,
        minHeight: rowH,
        height: rowH,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      <div
        style={{
          boxSizing: 'border-box',
          minHeight: rowH,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: padLeft,
          paddingRight: padRight,
        }}
      >
        <div style={{ fontSize: answerFs, fontWeight: 700, lineHeight: 1.25, color: COLORS.ink }}>{item.answer}</div>
        <div style={{ marginTop: 4, fontSize: metaFs, lineHeight: 1.25, color: COLORS.inkMuted }}>
          / {item.truth}（{item.points}pt）
        </div>
      </div>
      <span
        style={{
          position: 'absolute',
          top: '50%',
          right: 6,
          transform: 'translateY(-50%)',
          width: badgeSize,
          height: badgeSize,
          borderRadius: '50%',
          background: j.badge,
          color: '#fff',
          fontSize: badgeSize <= 20 ? 10 : 11,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
        aria-hidden
      >
        {j.symbol}
      </span>
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
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: align,
        lineHeight: 1.2,
        minHeight: 32,
      }}
    >
      <span style={{ display: 'block', fontSize: headFs, fontWeight: 700 }}>{label}</span>
      <span style={{ display: 'block', fontSize: headPtsFs, fontWeight: 600, opacity: 0.9, marginTop: 1 }}>({points}pt)</span>
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
  const tbl = tableLayout(roundCount, scoringCount);
  const colWidths = roundTableColWidths(scoringCount);
  const categoryCompact = categoryCount > 6;

  const thStyle: CSSProperties = {
    height: 48,
    padding: tbl.padding,
    fontSize: tbl.headFs,
    fontWeight: 700,
    color: '#fff',
    background: COLORS.headerBg,
    borderBottom: `1px solid ${COLORS.headerBgDeep}`,
    verticalAlign: 'middle',
  };

  return (
    <article
      data-personal-report-mock
      data-report-mock-version="v1"
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 10, flex: categoryCompact ? '0 0 96px' : '0 0 auto', minHeight: 0 }}>
              <InsightCard kind="best" category={best} categoryCount={categoryCount} />
              <InsightCard kind="worst" category={worst} categoryCount={categoryCount} />
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
              <BottleCard title="最高得点ボトル" name={data.highestBottle.name} score={data.highestBottle.score} layout={bottleLayout} />
              <BottleCard title="最低得点ボトル" name={data.lowestBottle.name} score={data.lowestBottle.score} layout={bottleLayout} />
            </div>
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
                <th style={{ ...thStyle, textAlign: 'center' }}>No.</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>サンプル</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>出題者</th>
                {data.scoringColumns.map((col) => (
                  <th key={col.key} style={{ ...thStyle, textAlign: 'left' }}>
                    <ColumnHeader label={col.label} points={col.points} headFs={tbl.headFs} headPtsFs={tbl.headPtsFs} />
                  </th>
                ))}
                <th style={{ ...thStyle, textAlign: 'center' }}>
                  <ColumnHeader label="合計得点" points={data.maxTotalPerRound} align="center" headFs={tbl.headFs} headPtsFs={tbl.headPtsFs} />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rounds.map((r, i) => (
                <tr key={r.no} style={{ background: i % 2 === 1 ? COLORS.zebra : COLORS.cardBg }}>
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: tbl.padding,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: tbl.noFs,
                      fontWeight: 800,
                      fontFamily: FONT.serif,
                      color: COLORS.headerBg,
                      borderBottom: `1px solid ${COLORS.rule}`,
                    }}
                  >
                    {r.no}
                  </td>
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: tbl.padding,
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      fontSize: tbl.sampleFs,
                      fontWeight: 700,
                      color: COLORS.ink,
                      borderBottom: `1px solid ${COLORS.rule}`,
                      wordBreak: 'break-word',
                    }}
                  >
                    {r.sample}
                  </td>
                  <td
                    style={{
                      height: tbl.rowH,
                      padding: tbl.padding,
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      fontSize: Math.max(12, tbl.sampleFs - 1),
                      color: COLORS.inkMuted,
                      borderBottom: `1px solid ${COLORS.rule}`,
                    }}
                  >
                    {r.presenter}
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
                      padding: tbl.padding,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: tbl.totalFs,
                      fontWeight: 800,
                      fontFamily: FONT.serif,
                      color: COLORS.headerBg,
                      background: `linear-gradient(180deg, ${COLORS.paperAlt}, ${COLORS.zebra})`,
                      borderBottom: `1px solid ${COLORS.rule}`,
                      borderLeft: `1px solid ${COLORS.ruleStrong}`,
                    }}
                  >
                    {r.total}
                    <span style={{ fontSize: Math.max(12, tbl.totalFs - 12), fontWeight: 700 }}>pt</span>
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
