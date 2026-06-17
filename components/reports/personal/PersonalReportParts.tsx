'use client';

import type { ReactNode } from 'react';
import {
  CaptureVAlign,
  captureLineBox,
  resultCardContentH,
  insightCardContentH,
  bottleCardBodyContentH,
} from '@/components/reports/personal/capture-align';
import type { PersonalReportData, ReportItemKey } from '@/lib/report-data/types';
import {
  personalAnalysisAreaHeight,
  personalBottleCardLayout,
  personalCategoryChartLayout,
  personalInsightCardLayout,
} from '@/lib/report-export/personal-layout-scale';
import { REPORT_FONTS } from '@/lib/report-export/theme';
import { PERSONAL_CANVAS, PERSONAL_SHADOW, PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';

type CategoryRow = PersonalReportData['analysis']['categoryScores'][number];

function bestAndWorstCategory(categories: CategoryRow[]) {
  const active = categories.filter((c) => c.maxScore > 0);
  const sorted = [...active].sort((a, b) => b.rate - a.rate);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

export function PersonalReportCover({ data }: { data: PersonalReportData }) {
  return (
    <section
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: PERSONAL_SHADOW.sheet,
        border: `1px solid ${PERSONAL_V1.cardBorder}`,
        marginBottom: PERSONAL_CANVAS.sectionGap,
      }}
    >
      <div
        style={{
          height: 84,
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${PERSONAL_V1.headerBg} 0%, ${PERSONAL_V1.headerBgDeep} 100%)`,
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: PERSONAL_V1.accent,
            fontFamily: REPORT_FONTS.serif,
          }}
        >
          BLIND DRAM
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: PERSONAL_V1.headerText,
            fontFamily: REPORT_FONTS.serif,
            letterSpacing: '0.06em',
          }}
        >
          個人レポート
        </span>
        <span style={{ fontSize: 16, color: PERSONAL_V1.accentSoft, fontFamily: REPORT_FONTS.serif }}>
          {data.sessionDate}
        </span>
      </div>

      <div
        style={{
          background: `linear-gradient(180deg, ${PERSONAL_V1.cardBg} 0%, ${PERSONAL_V1.zebra} 100%)`,
          padding: '28px 24px 26px',
          textAlign: 'center',
          borderTop: `1px solid ${PERSONAL_V1.rule}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: PERSONAL_V1.inkSoft,
            fontFamily: REPORT_FONTS.serif,
          }}
        >
          Participant
        </p>
        <h1
          style={{
            margin: '8px 0 0',
            fontSize: 36,
            fontWeight: 700,
            color: PERSONAL_V1.ink,
            fontFamily: REPORT_FONTS.serif,
            lineHeight: 1.15,
          }}
        >
          {data.participant.name}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, color: PERSONAL_V1.inkMuted, lineHeight: 1.4 }}>
          {data.sessionTitle}
        </p>
        <div
          style={{
            margin: '18px auto 0',
            width: 120,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${PERSONAL_V1.accent}, transparent)`,
          }}
        />
      </div>
    </section>
  );
}

export function PersonalSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: PERSONAL_V1.headerBg,
          fontFamily: REPORT_FONTS.serif,
          lineHeight: 1.2,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{ width: 4, height: 22, borderRadius: 2, background: PERSONAL_V1.accent, flexShrink: 0 }}
        />
        {children}
      </h2>
      <div style={{ marginTop: 8, width: 56, height: 2, background: PERSONAL_V1.accent, opacity: 0.85 }} />
    </div>
  );
}

export function PersonalResultCard({
  label,
  value,
  featured,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  const cardH = 112;
  // top-border: featured=3px, non-featured=1px. bottom+sides: 1px each.
  const innerH = cardH - (featured ? 3 : 1) - 1;
  const contentH = resultCardContentH(); // 14*1.2 + 8 + 36 = 60.8 → 61
  return (
    <div
      style={{
        height: cardH,
        borderRadius: 10,
        boxSizing: 'border-box',
        background: PERSONAL_V1.cardBg,
        border: `1px solid ${PERSONAL_V1.cardBorder}`,
        boxShadow: `${PERSONAL_SHADOW.card}, ${PERSONAL_SHADOW.inset}`,
        borderTop: featured ? `3px solid ${PERSONAL_V1.accent}` : `1px solid ${PERSONAL_V1.cardBorder}`,
        overflow: 'hidden',
      }}
    >
      <CaptureVAlign height={innerH} contentH={contentH} align="center" padding="0 12px">
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: PERSONAL_V1.inkMuted,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
              textAlign: 'center',
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 36,
              fontWeight: 800,
              color: PERSONAL_V1.headerBg,
              fontFamily: REPORT_FONTS.serif,
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {value}
          </p>
        </div>
      </CaptureVAlign>
    </div>
  );
}

export function PersonalCategoryBarChart({ categories }: { categories: CategoryRow[] }) {
  const cats = categories.filter((c) => c.maxScore > 0);
  if (cats.length === 0) return null;

  const layout = personalCategoryChartLayout(cats.length);

  return (
    <div
      style={{
        width: '100%',
        height: layout.chartH,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: layout.gap,
        boxSizing: 'border-box',
      }}
    >
      {cats.map((c) => {
        const trackH = layout.barH;
        return (
          <div
            key={c.key}
            style={{
              display: 'grid',
              gridTemplateColumns: `${layout.labelCol}px 1fr ${layout.rateCol}px`,
              gap: layout.gap > 9 ? 10 : 14,
              height: trackH,
            }}
          >
            {/* ラベル: captureLineBox で1行中央揃え */}
            <span
              style={captureLineBox(trackH, {
                fontSize: layout.labelFont,
                fontWeight: 700,
                color: PERSONAL_V1.ink,
                textAlign: 'left',
                wordBreak: 'keep-all',
              })}
            >
              {c.label}
            </span>

            {/* バー */}
            <div
              style={{
                position: 'relative',
                height: trackH,
                borderRadius: 7,
                overflow: 'hidden',
                background: PERSONAL_V1.barTrack,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${c.rate}%`,
                  background: `linear-gradient(90deg, ${PERSONAL_V1.headerBg}bb, ${PERSONAL_V1.headerBg})`,
                  borderRadius: 7,
                  minWidth: c.rate > 0 ? 6 : 0,
                }}
              />
              {/* バー内スコア: captureLineBox で1行中央揃え */}
              <span
                style={captureLineBox(trackH, {
                  position: 'relative',
                  zIndex: 1,
                  paddingLeft: 8,
                  fontSize: layout.scoreFont,
                  fontWeight: 700,
                  color: c.rate >= 40 ? '#fff' : PERSONAL_V1.inkMuted,
                  fontFamily: REPORT_FONTS.serif,
                  whiteSpace: 'nowrap',
                })}
              >
                {c.earnedScore}/{c.maxScore}pt
              </span>
            </div>

            {/* パーセント: captureLineBox で1行中央揃え */}
            <span
              style={captureLineBox(trackH, {
                fontSize: layout.valueFont,
                fontWeight: 800,
                color: PERSONAL_V1.headerBg,
                fontFamily: REPORT_FONTS.serif,
                textAlign: 'right',
              })}
            >
              {c.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PersonalInsightCard({
  kind,
  category,
  categoryCount,
}: {
  kind: 'best' | 'worst';
  category: CategoryRow;
  categoryCount: number;
}) {
  const isBest = kind === 'best';
  const ins = personalInsightCardLayout(categoryCount);
  const cardH = categoryCount > 6 ? 96 : 108;
  const contentH = insightCardContentH(ins.titleFs, ins.labelFs);

  return (
    <div
      style={{
        flex: 1,
        borderRadius: 10,
        height: cardH,
        background: isBest ? PERSONAL_V1.insightGood : PERSONAL_V1.insightWarn,
        border: `1px solid ${isBest ? '#b8d9c4' : '#e8d4a0'}`,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <CaptureVAlign height={cardH} contentH={contentH} padding={ins.padding} align="left">
        <div>
          <p
            style={{
              margin: 0,
              fontSize: ins.titleFs,
              fontWeight: 700,
              color: PERSONAL_V1.inkSoft,
              letterSpacing: '0.04em',
            }}
          >
            {isBest ? '最得意部門' : '要改善部門'}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: ins.labelFs,
              fontWeight: 700,
              color: PERSONAL_V1.ink,
              fontFamily: REPORT_FONTS.serif,
              lineHeight: 1.25,
              wordBreak: 'break-word',
            }}
          >
            {category.label}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: PERSONAL_V1.inkMuted }}>
            <span
              style={{
                fontFamily: REPORT_FONTS.serif,
                fontWeight: 800,
                color: PERSONAL_V1.headerBg,
                fontSize: ins.rateFs,
              }}
            >
              {category.rate}%
            </span>
            <span style={{ marginLeft: 6, fontSize: 12 }}>
              （{category.earnedScore}/{category.maxScore}pt）
            </span>
          </p>
        </div>
      </CaptureVAlign>
    </div>
  );
}

export function PersonalBottleCard({
  title,
  sampleName,
  score,
  othersCount,
  layout,
}: {
  title: string;
  sampleName: string;
  score: number;
  othersCount: number;
  layout: ReturnType<typeof personalBottleCardLayout>;
}) {
  const bodyH = 120;
  const contentH = bottleCardBodyContentH(layout.nameFs, layout.scoreFs);

  return (
    <div
      style={{
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        background: PERSONAL_V1.cardBg,
        border: `1px solid ${PERSONAL_V1.cardBorder}`,
        boxShadow: PERSONAL_SHADOW.card,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: '9px 10px',
          background: PERSONAL_V1.headerBg,
          color: '#fff',
          fontSize: layout.titleFs,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          flex: 1,
          background: `linear-gradient(180deg, ${PERSONAL_V1.cardBg}, ${PERSONAL_V1.zebra})`,
        }}
      >
        <CaptureVAlign height={bodyH} contentH={contentH} padding="8px 10px" align="center">
          <div>
            <p
              style={{
                margin: 0,
                fontSize: layout.nameFs,
                fontWeight: 700,
                color: PERSONAL_V1.ink,
                textAlign: 'center',
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {sampleName}
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: layout.scoreFs,
                fontWeight: 800,
                color: PERSONAL_V1.headerBg,
                fontFamily: REPORT_FONTS.serif,
                lineHeight: 1,
                textAlign: 'center',
              }}
            >
              {score}
              <span style={{ fontSize: layout.scoreUnitFs, fontWeight: 700, marginLeft: 2 }}>pt</span>
            </p>
            {othersCount > 0 && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: PERSONAL_V1.inkMuted,
                  textAlign: 'center',
                }}
              >
                ほか{othersCount}件
              </p>
            )}
          </div>
        </CaptureVAlign>
      </div>
    </div>
  );
}

export function PersonalAnalysisSection({ data }: { data: PersonalReportData }) {
  const categories = data.analysis.categoryScores.filter((c) => c.maxScore > 0);
  const categoryCount = categories.length;
  const { best, worst } = bestAndWorstCategory(data.analysis.categoryScores);
  const analysisH = personalAnalysisAreaHeight(categoryCount);
  const bottleLayout = personalBottleCardLayout(analysisH);
  const categoryCompact = categoryCount > 6;

  if (categoryCount === 0) return null;

  return (
    <section style={{ marginBottom: PERSONAL_CANVAS.sectionGap }}>
      <PersonalSectionTitle>分析</PersonalSectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 14, height: analysisH }}>
        <div
          style={{
            borderRadius: 10,
            background: PERSONAL_V1.cardBg,
            border: `1px solid ${PERSONAL_V1.cardBorder}`,
            boxShadow: PERSONAL_SHADOW.card,
            padding: categoryCompact ? '14px 18px' : '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            minHeight: 0,
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 15,
              fontWeight: 700,
              color: PERSONAL_V1.headerBg,
              fontFamily: REPORT_FONTS.serif,
              flexShrink: 0,
            }}
          >
            部門別得点
          </p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0, overflow: 'hidden' }}>
            <PersonalCategoryBarChart categories={categories} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              flex: categoryCompact ? '0 0 96px' : '0 0 auto',
              minHeight: 0,
            }}
          >
            <PersonalInsightCard kind="best" category={best} categoryCount={categoryCount} />
            <PersonalInsightCard kind="worst" category={worst} categoryCount={categoryCount} />
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
            <PersonalBottleCard
              title="最高得点ボトル"
              sampleName={data.analysis.highestBottle.sampleName}
              score={data.analysis.highestBottle.score}
              othersCount={data.analysis.highestBottle.othersCount}
              layout={bottleLayout}
            />
            <PersonalBottleCard
              title="最低得点ボトル"
              sampleName={data.analysis.lowestBottle.sampleName}
              score={data.analysis.lowestBottle.score}
              othersCount={data.analysis.lowestBottle.othersCount}
              layout={bottleLayout}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
