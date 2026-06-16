'use client';

import { IconGlass, IconSeal } from '@/components/reports/ReportIcons';
import { cardSurface, panelHeaderBar, sectionAccentBar } from '@/lib/report-export/design';
import { REPORT_FONTS, REPORT_WIDTH_PX, type ReportTheme } from '@/lib/report-export/theme';
import { highlightLineStyle, REPORT_LINE, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';
import type { ReactNode } from 'react';

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
          padding: '22px 36px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <IconGlass size={44} color={theme.accent} />
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: REPORT_TYPE.brand,
                letterSpacing: '0.14em',
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
                margin: '5px 0 0',
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
                margin: '8px 0 0',
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
          <IconSeal size={50} color={theme.accent} />
        </div>
        <div style={{ marginTop: 14, height: 2, background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }} />
      </div>

      {participantBanner}

      <div style={{ padding: `${REPORT_SPACE.pageY}px ${REPORT_SPACE.pageX}px` }}>{children}</div>

      <div
        style={{
          padding: '12px 36px 16px',
          textAlign: 'center',
          borderTop: `1px solid ${theme.rule}`,
          background: theme.paperAlt,
        }}
      >
        <span style={{ fontSize: REPORT_TYPE.caption, fontFamily: REPORT_FONTS.serif, color: theme.inkMuted, letterSpacing: '0.12em' }}>
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
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: REPORT_TYPE.section,
        fontWeight: 700,
        color: theme.headerBg,
        fontFamily: REPORT_FONTS.serif,
        lineHeight: 1.2,
      }}
    >
      <span style={sectionAccentBar(theme)} aria-hidden />
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
        ...cardSurface(theme),
        padding: '12px 8px',
        textAlign: 'center',
        borderTop: `3px solid ${theme.sectionBar}`,
      }}
    >
      <p style={{ margin: 0, fontSize: REPORT_TYPE.statLabel, color: theme.inkMuted, whiteSpace: 'nowrap' }}>{label}</p>
      <p
        style={{
          margin: '5px 0 0',
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
    <div style={{ ...cardSurface(theme), overflow: 'hidden' }}>
      <div style={panelHeaderBar(theme)}>{title}</div>
      <div style={{ padding: '10px 10px 12px', textAlign: 'center' }}>
        {lines.map((line, i) => (
          <p key={`${line}-${i}`} style={highlightLineStyle(theme, line, i, REPORT_FONTS)}>
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
  centerContent,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
  centerContent?: boolean;
}) {
  return (
    <div style={{ ...cardSurface(theme), padding: 0, overflow: 'hidden', ...style }}>
      {title && <div style={panelHeaderBar(theme)}>{title}</div>}
      <div
        style={{
          padding: 10,
          ...(centerContent ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : {}),
        }}
      >
        {children}
      </div>
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
        padding: '10px 8px',
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
  accent,
}: {
  theme: ReportTheme;
  index: number;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const bg = accent ? `${theme.sectionBar}18` : index % 2 === 1 ? theme.tableRowAlt : theme.cardBg;
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
  style?: React.CSSProperties;
  numeric?: boolean;
  emphasis?: boolean;
}) {
  return (
    <td
      style={{
        padding: '9px 8px',
        textAlign: align,
        verticalAlign: 'middle',
        lineHeight: REPORT_LINE.normal,
        borderBottom: `1px solid ${theme.rule}`,
        ...(numeric
          ? {
              fontFamily: REPORT_FONTS.serif,
              fontWeight: emphasis ? 800 : 700,
              fontSize: emphasis ? REPORT_TYPE.tableNum : REPORT_TYPE.tableBody,
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

export function ParticipantBanner({ theme, name }: { theme: ReportTheme; name: string }) {
  return (
    <div
      style={{
        padding: '14px 36px',
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
