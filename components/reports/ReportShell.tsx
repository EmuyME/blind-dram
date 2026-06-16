'use client';

import { IconGlass, IconSeal } from '@/components/reports/ReportIcons';
import { REPORT_FONTS, REPORT_WIDTH_PX, type ReportTheme } from '@/lib/report-export/theme';
import { REPORT_LINE, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';
import type { CSSProperties, ReactNode } from 'react';

export function ReportShell({
  theme,
  sessionTitle,
  children,
  participantBanner,
}: {
  theme: ReportTheme;
  sessionTitle: string;
  children: React.ReactNode;
  participantBanner?: React.ReactNode;
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
      <div
        style={{
          background: theme.headerGradient,
          color: theme.headerText,
          padding: '24px 36px 22px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            position: 'relative',
          }}
        >
          <IconGlass size={48} color={theme.accent} />
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: REPORT_TYPE.brand,
                letterSpacing: '0.12em',
                color: theme.accent,
                fontFamily: REPORT_FONTS.serif,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              BLIND DRAM
            </p>
            <h1
              style={{
                margin: '6px 0 0',
                fontSize: REPORT_TYPE.subtitle,
                fontWeight: 600,
                fontFamily: REPORT_FONTS.serif,
                lineHeight: 1.2,
              }}
            >
              {theme.subtitle}
            </h1>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: REPORT_TYPE.session,
                color: theme.accentLight,
                fontFamily: REPORT_FONTS.serif,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {sessionTitle}
            </p>
          </div>
          <IconSeal size={54} color={theme.accent} />
        </div>
      </div>

      {participantBanner}

      <div style={{ padding: `${REPORT_SPACE.pageY}px ${REPORT_SPACE.pageX}px` }}>{children}</div>

      <div
        style={{
          padding: '14px 36px 18px',
          textAlign: 'center',
          borderTop: `1px solid ${theme.rule}`,
          background: theme.paperAlt,
        }}
      >
        <span style={{ fontSize: REPORT_TYPE.caption, fontFamily: REPORT_FONTS.serif, color: theme.inkMuted, letterSpacing: '0.1em' }}>
          BLIND DRAM
        </span>
      </div>
    </div>
  );
}

export function SectionBlock({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <section style={{ marginBottom: REPORT_SPACE.section, ...style }}>{children}</section>;
}

export function SectionTitle({ theme, children }: { theme: ReportTheme; children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: `0 0 ${REPORT_SPACE.block}px`,
        paddingBottom: 8,
        fontSize: REPORT_TYPE.section,
        fontWeight: 700,
        color: theme.headerBg,
        fontFamily: REPORT_FONTS.serif,
        borderBottom: `3px solid ${theme.sectionBar}`,
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

export function StatCardGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: REPORT_SPACE.card }}>
      {children}
    </div>
  );
}

export function StatCard({ theme, label, value }: { theme: ReportTheme; label: string; value: string }) {
  return (
    <div
      style={{
        padding: '16px 12px',
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: REPORT_TYPE.statLabel, color: theme.inkMuted, whiteSpace: 'nowrap' }}>{label}</p>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: REPORT_TYPE.statValue,
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

function highlightLineStyle(theme: ReportTheme, line: string, index: number): CSSProperties {
  const isScore = /pt$/.test(line.trim()) || /^\d+pt$/.test(line.trim());
  const isMeta = line.startsWith('ほか') || line.startsWith('合計') || line.startsWith('平均') || line.startsWith('標準偏差');

  if (isScore) {
    return {
      margin: index === 0 ? 0 : '6px 0 0',
      fontSize: REPORT_TYPE.highlightValue,
      fontWeight: 800,
      lineHeight: 1.1,
      color: theme.headerBg,
      fontFamily: REPORT_FONTS.serif,
    };
  }
  if (isMeta) {
    return {
      margin: '4px 0 0',
      fontSize: REPORT_TYPE.highlightSecondary,
      fontWeight: 500,
      lineHeight: REPORT_LINE.normal,
      color: theme.inkMuted,
    };
  }
  return {
    margin: index === 0 ? 0 : '4px 0 0',
    fontSize: REPORT_TYPE.highlightPrimary,
    fontWeight: 700,
    lineHeight: REPORT_LINE.tight,
    color: theme.ink,
  };
}

export function HighlightCard({
  theme,
  title,
  lines,
}: {
  theme: ReportTheme;
  title: string;
  lines: string[];
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          background: theme.tableHeadBg,
          color: '#fff',
          fontSize: REPORT_TYPE.highlightTitle,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '14px 12px 16px', textAlign: 'center' }}>
        {lines.map((line, i) => (
          <p key={`${line}-${i}`} style={highlightLineStyle(theme, line, i)}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ReportPanel({
  theme,
  children,
  style,
  title,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 8,
        padding: 14,
        ...style,
      }}
    >
      {title && (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: REPORT_TYPE.panelTitle,
            fontWeight: 700,
            color: theme.headerBg,
            fontFamily: REPORT_FONTS.serif,
          }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function ReportTable({
  children,
  fontSize = REPORT_TYPE.tableBody,
  fixed,
}: {
  children: React.ReactNode;
  fontSize?: number;
  fixed?: boolean;
}) {
  return (
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
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        padding: '12px 10px',
        textAlign: align,
        fontWeight: 700,
        fontSize: REPORT_TYPE.tableHead,
        lineHeight: REPORT_LINE.tight,
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
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
}: {
  theme: ReportTheme;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <tr style={{ background: index % 2 === 1 ? theme.tableRowAlt : theme.cardBg }}>{children}</tr>
  );
}

export function ReportTd({
  theme,
  children,
  align = 'left',
  style,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: '11px 10px',
        textAlign: align,
        verticalAlign: 'middle',
        lineHeight: REPORT_LINE.normal,
        borderBottom: `1px solid ${theme.rule}`,
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function ParticipantBanner({ theme, name }: { theme: ReportTheme; name: string }) {
  return (
    <div
      style={{
        padding: '18px 36px',
        textAlign: 'center',
        background: theme.paperAlt,
        borderBottom: `2px solid ${theme.rule}`,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: REPORT_TYPE.participant,
          fontWeight: 700,
          color: theme.ink,
          fontFamily: REPORT_FONTS.serif,
          lineHeight: 1.2,
        }}
      >
        参加者：{name}
      </p>
    </div>
  );
}
