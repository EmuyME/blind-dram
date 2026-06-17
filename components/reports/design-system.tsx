'use client';

/**
 * レポート専用デザインシステム
 * ReportShell · ReportHeader · ReportSection · MetricCard · ReportTable · ChartCard
 */

import { highlightLineStyle, REPORT_LINE, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';
import { REPORT_FONTS, REPORT_WIDTH_PX, type ReportTheme } from '@/lib/report-export/theme';
import type { CSSProperties, ReactNode } from 'react';

const CARD_RADIUS = 10;
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.06)';

function cardStyle(theme: ReportTheme): CSSProperties {
  return {
    background: theme.cardBg,
    borderRadius: CARD_RADIUS,
    border: `1px solid ${theme.cardBorder}`,
    boxShadow: CARD_SHADOW,
    overflow: 'hidden',
  };
}

// ─── ReportShell ─────────────────────────────────────────────

export function ReportShell({
  theme,
  sessionTitle,
  sessionDate,
  children,
  participantName,
}: {
  theme: ReportTheme;
  sessionTitle: string;
  sessionDate?: string;
  children: React.ReactNode;
  participantName?: string;
}) {
  return (
    <div
      data-report-capture-page
      data-report-width
      style={{
        width: REPORT_WIDTH_PX,
        boxSizing: 'border-box',
        background: theme.paperTexture,
        color: theme.ink,
        fontFamily: REPORT_FONTS.sans,
        fontSize: REPORT_TYPE.tableBody,
        lineHeight: REPORT_LINE.normal,
      }}
    >
      <ReportHeader theme={theme} sessionTitle={sessionTitle} sessionDate={sessionDate} />
      {participantName && <ParticipantStrip theme={theme} name={participantName} />}
      <div style={{ padding: `${REPORT_SPACE.pageY}px ${REPORT_SPACE.pageX}px` }}>{children}</div>
      <footer
        style={{
          padding: '14px 40px 18px',
          textAlign: 'center',
          borderTop: `1px solid ${theme.rule}`,
        }}
      >
        <span style={{ fontSize: REPORT_TYPE.caption, color: theme.inkMuted, letterSpacing: '0.14em', fontFamily: REPORT_FONTS.serif }}>
          BLIND DRAM
        </span>
      </footer>
    </div>
  );
}

// ─── ReportHeader ────────────────────────────────────────────

export function ReportHeader({
  theme,
  sessionTitle,
  sessionDate,
}: {
  theme: ReportTheme;
  sessionTitle: string;
  sessionDate?: string;
}) {
  return (
    <header style={{ background: theme.headerBand, color: theme.headerText, padding: '14px 40px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: REPORT_TYPE.brand,
              letterSpacing: '0.18em',
              color: theme.accent,
              fontFamily: REPORT_FONTS.serif,
              fontWeight: 700,
            }}
          >
            BLIND DRAM
          </p>
        </div>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0, padding: '0 8px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: REPORT_TYPE.subtitle,
              fontWeight: 600,
              fontFamily: REPORT_FONTS.serif,
              lineHeight: 1.25,
              color: theme.headerText,
            }}
          >
            {theme.subtitle}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: REPORT_TYPE.session,
              color: theme.accentMuted,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sessionTitle}
          </p>
        </div>
        {sessionDate && (
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: REPORT_TYPE.date, color: theme.accentMuted, whiteSpace: 'nowrap' }}>{sessionDate}</p>
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, height: 1, background: `linear-gradient(90deg, transparent 5%, ${theme.accent}55 50%, transparent 95%)` }} />
    </header>
  );
}

function ParticipantStrip({ theme, name }: { theme: ReportTheme; name: string }) {
  return (
    <div style={{ padding: '12px 40px', textAlign: 'center', background: theme.paperAlt, borderBottom: `1px solid ${theme.rule}` }}>
      <p style={{ margin: 0, fontSize: REPORT_TYPE.participant, fontWeight: 700, fontFamily: REPORT_FONTS.serif, color: theme.ink }}>
        {name}
      </p>
    </div>
  );
}

// ─── ReportSection ───────────────────────────────────────────

export function ReportSection({
  theme,
  title,
  children,
  style,
}: {
  theme: ReportTheme;
  title: string;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section style={{ marginBottom: REPORT_SPACE.section, ...style }}>
      <h2
        style={{
          margin: `0 0 ${REPORT_SPACE.block}px`,
          fontSize: REPORT_TYPE.section,
          fontWeight: 700,
          color: theme.headerBg,
          fontFamily: REPORT_FONTS.serif,
          paddingBottom: 8,
          borderBottom: `2px solid ${theme.accent}`,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── MetricCard ──────────────────────────────────────────────

export function MetricCardGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: REPORT_SPACE.card }}>
      {children}
    </div>
  );
}

export function MetricCard({ theme, label, value, large }: { theme: ReportTheme; label: string; value: string; large?: boolean }) {
  return (
    <div style={{ ...cardStyle(theme), padding: large ? '18px 14px' : '14px 12px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: REPORT_TYPE.metricLabel, color: theme.inkMuted, letterSpacing: '0.04em' }}>{label}</p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: large ? 32 : REPORT_TYPE.metricValue,
          fontWeight: 800,
          color: theme.headerBg,
          fontFamily: REPORT_FONTS.serif,
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function HighlightCard({ theme, title, lines }: { theme: ReportTheme; title: string; lines: string[] }) {
  return (
    <div style={cardStyle(theme)}>
      <div
        style={{
          padding: '8px 12px',
          background: theme.tableHeadBg,
          color: '#fff',
          fontSize: REPORT_TYPE.highlightTitle,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.06em',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '12px 10px 14px', textAlign: 'center', wordBreak: 'break-word' }}>
        {lines.map((line, i) => (
          <p key={`${line}-${i}`} style={highlightLineStyle(theme, line, i, REPORT_FONTS)}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── ChartCard ───────────────────────────────────────────────

export function ChartCard({
  theme,
  title,
  children,
}: {
  theme: ReportTheme;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle(theme)}>
      {title && (
        <div style={{ padding: '10px 16px 0', fontSize: REPORT_TYPE.cardTitle, fontWeight: 700, color: theme.headerBg, fontFamily: REPORT_FONTS.serif, textAlign: 'center' }}>
          {title}
        </div>
      )}
      <div style={{ padding: title ? '8px 12px 14px' : '14px 12px' }}>{children}</div>
    </div>
  );
}

// ─── ReportTable ─────────────────────────────────────────────

export function ReportTable({
  theme,
  children,
  fontSize = REPORT_TYPE.tableBody,
  fixed,
  bare,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  fontSize?: number;
  fixed?: boolean;
  /** ChartCard 内など、外枠カードが不要なとき */
  bare?: boolean;
}) {
  const table = (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize,
        tableLayout: fixed ? 'fixed' : 'auto',
      }}
    >
      {children}
    </table>
  );
  if (bare) return table;
  return <div style={cardStyle(theme)}>{table}</div>;
}

export function ReportThead({ theme, children }: { theme: ReportTheme; children: React.ReactNode }) {
  return (
    <thead>
      <tr style={{ background: theme.tableHeadBg, color: '#fff' }}>{children}</tr>
    </thead>
  );
}

export function ReportTh({
  children,
  align = 'left',
  style,
  multiline,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  style?: CSSProperties;
  multiline?: boolean;
}) {
  return (
    <th
      style={{
        padding: '11px 12px',
        textAlign: align,
        fontWeight: 600,
        fontSize: REPORT_TYPE.tableHead,
        lineHeight: REPORT_LINE.tight,
        verticalAlign: 'middle',
        whiteSpace: multiline ? 'normal' : 'nowrap',
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function ReportTr({
  theme,
  index,
  children,
  accent,
}: {
  theme: ReportTheme;
  index: number;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const bg = accent ? `${theme.accent}14` : index % 2 === 1 ? theme.tableRowAlt : theme.cardBg;
  return <tr style={{ background: bg }}>{children}</tr>;
}

export function ReportTd({
  theme,
  children,
  align = 'left',
  style,
  numeric,
  emphasis,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  style?: CSSProperties;
  numeric?: boolean;
  emphasis?: boolean;
}) {
  return (
    <td
      style={{
        padding: '12px 12px',
        textAlign: align,
        verticalAlign: 'middle',
        lineHeight: REPORT_LINE.normal,
        borderBottom: `1px solid ${theme.rule}`,
        ...(numeric
          ? {
              fontFamily: REPORT_FONTS.serif,
              fontWeight: emphasis ? 800 : 700,
              fontSize: emphasis ? REPORT_TYPE.roundTotal : REPORT_TYPE.tableNum,
              color: emphasis ? theme.headerBg : theme.ink,
            }
          : {}),
        ...style,
      }}
    >
      {children}
    </td>
  );
}

// ─── 後方互換エイリアス ──────────────────────────────────────

export const SectionBlock = ReportSection;
export const SectionTitle = ({ theme, children }: { theme: ReportTheme; children: React.ReactNode }) => (
  <h2
    style={{
      margin: `0 0 ${REPORT_SPACE.block}px`,
      fontSize: REPORT_TYPE.section,
      fontWeight: 700,
      color: theme.headerBg,
      fontFamily: REPORT_FONTS.serif,
      paddingBottom: 8,
      borderBottom: `2px solid ${theme.accent}`,
    }}
  >
    {children}
  </h2>
);
export const StatCardGrid = MetricCardGrid;
export const StatCard = MetricCard;
export const ReportPanel = ChartCard;
export const ParticipantBanner = ({ theme, name }: { theme: ReportTheme; name: string }) => (
  <ParticipantStrip theme={theme} name={name} />
);
