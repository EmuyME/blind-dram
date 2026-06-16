'use client';

import { IconGlass, IconSeal } from '@/components/reports/ReportIcons';
import { REPORT_FONTS, REPORT_WIDTH_PX, type ReportTheme } from '@/lib/report-export/theme';
import { REPORT_LINE, REPORT_SPACE, REPORT_TYPE } from '@/lib/report-export/typography';
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
          padding: '28px 40px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            background:
              'radial-gradient(ellipse at 85% 50%, rgba(255,255,255,0.4) 0%, transparent 55%), radial-gradient(ellipse at 15% 80%, rgba(0,0,0,0.3) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', gap: 16 }}>
          <div style={{ width: 48, flexShrink: 0, opacity: 0.95 }}>
            <IconGlass size={44} color={theme.accent} />
          </div>
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: REPORT_TYPE.brand,
                letterSpacing: '0.14em',
                color: theme.accent,
                fontFamily: REPORT_FONTS.serif,
                fontWeight: 700,
                lineHeight: REPORT_LINE.tight,
              }}
            >
              BLIND DRAM
            </p>
            <h1
              style={{
                margin: '4px 0 0',
                fontSize: REPORT_TYPE.subtitle,
                fontWeight: 600,
                letterSpacing: '0.05em',
                fontFamily: REPORT_FONTS.serif,
                lineHeight: REPORT_LINE.tight,
              }}
            >
              {theme.subtitle}
            </h1>
            <div
              style={{
                display: 'inline-block',
                marginTop: 12,
                padding: '6px 24px',
                border: `1px solid ${theme.accent}`,
                borderRadius: 4,
                background: 'rgba(0,0,0,0.12)',
                maxWidth: '100%',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: REPORT_TYPE.session,
                  color: theme.accentLight,
                  fontFamily: REPORT_FONTS.serif,
                  letterSpacing: '0.03em',
                  lineHeight: REPORT_LINE.normal,
                  wordBreak: 'break-word',
                }}
              >
                {sessionTitle}
              </p>
            </div>
          </div>
          <div style={{ width: 52, flexShrink: 0 }}>
            <IconSeal size={52} color={theme.accent} />
          </div>
        </div>
      </div>

      {participantBanner}

      <div style={{ padding: `${REPORT_SPACE.pageY}px ${REPORT_SPACE.pageX}px ${REPORT_SPACE.pageY + 4}px` }}>
        {children}
      </div>

      <div
        style={{
          padding: '16px 40px 22px',
          textAlign: 'center',
          borderTop: `1px solid ${theme.rule}`,
          background: theme.paperAlt,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.65 }}>
          <IconGlass size={18} color={theme.accent} />
          <span
            style={{
              fontSize: REPORT_TYPE.caption,
              fontFamily: REPORT_FONTS.serif,
              color: theme.inkMuted,
              letterSpacing: '0.12em',
            }}
          >
            BLIND DRAM
          </span>
        </div>
      </div>
    </div>
  );
}

export function SectionBlock({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <section style={{ marginBottom: REPORT_SPACE.section, ...style }}>{children}</section>;
}

export function SectionTitle({
  theme,
  children,
  icon,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: REPORT_SPACE.block }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {icon && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `${theme.accent}20`,
              border: `1px solid ${theme.accent}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <h2
          style={{
            margin: 0,
            fontSize: REPORT_TYPE.section,
            fontWeight: 700,
            color: theme.headerBg,
            fontFamily: REPORT_FONTS.serif,
            letterSpacing: '0.03em',
            lineHeight: REPORT_LINE.tight,
          }}
        >
          {children}
        </h2>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${theme.sectionBar} 0%, ${theme.rule} 72%)` }} />
    </div>
  );
}

export function StatCardGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: REPORT_SPACE.card,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  theme,
  label,
  value,
  icon,
}: {
  theme: ReportTheme;
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: '14px 10px 12px',
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 10,
        textAlign: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 96,
      }}
    >
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, opacity: 0.9 }}>{icon}</div>}
      <p
        style={{
          margin: 0,
          fontSize: REPORT_TYPE.statLabel,
          color: theme.inkMuted,
          letterSpacing: '0.02em',
          lineHeight: REPORT_LINE.tight,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: REPORT_TYPE.statValue,
          fontWeight: 800,
          color: theme.headerBg,
          fontFamily: REPORT_FONTS.serif,
          lineHeight: REPORT_LINE.tight,
          wordBreak: 'break-word',
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
  icon,
  headerTone = 'gold',
}: {
  theme: ReportTheme;
  title: string;
  lines: string[];
  icon?: ReactNode;
  headerTone?: 'gold' | 'muted';
}) {
  const headerBg = headerTone === 'gold' ? theme.accent : theme.inkMuted;
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: headerTone === 'gold' ? `${theme.accent}18` : theme.paperAlt,
          borderBottom: `2px solid ${headerBg}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
        }}
      >
        {icon}
        <p
          style={{
            margin: 0,
            fontSize: REPORT_TYPE.highlightTitle,
            fontWeight: 700,
            color: theme.headerBg,
            lineHeight: REPORT_LINE.tight,
          }}
        >
          {title}
        </p>
      </div>
      <div style={{ padding: '10px 12px 12px', flex: 1 }}>
        {lines.map((line, i) => (
          <p
            key={`${line}-${i}`}
            style={{
              margin: i === 0 ? 0 : '5px 0 0',
              fontSize: i === 0 ? REPORT_TYPE.highlightPrimary : REPORT_TYPE.highlightSecondary,
              fontWeight: i === 0 ? 700 : 400,
              lineHeight: REPORT_LINE.normal,
              color: i === 0 ? theme.ink : theme.inkMuted,
              wordBreak: 'break-word',
            }}
          >
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
        borderRadius: 10,
        padding: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
            lineHeight: REPORT_LINE.tight,
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
  theme,
  children,
  fontSize = REPORT_TYPE.tableBody,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  fontSize?: number;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize, tableLayout: 'auto' }}>{children}</table>
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
        padding: '11px 10px',
        textAlign: align,
        fontWeight: 600,
        fontSize: REPORT_TYPE.tableHead,
        letterSpacing: '0.02em',
        lineHeight: REPORT_LINE.tight,
        verticalAlign: 'middle',
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
    <tr
      style={{
        borderBottom: `1px solid ${theme.rule}`,
        background: index % 2 === 1 ? theme.tableRowAlt : theme.cardBg,
      }}
    >
      {children}
    </tr>
  );
}

export function ReportTd({
  children,
  align = 'left',
  style,
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: '9px 10px',
        textAlign: align,
        verticalAlign: 'middle',
        lineHeight: REPORT_LINE.normal,
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
        padding: '16px 40px',
        textAlign: 'center',
        background: theme.paperAlt,
        borderBottom: `1px solid ${theme.rule}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <span style={{ color: theme.accent, fontSize: 16, fontFamily: REPORT_FONTS.serif, lineHeight: 1 }}>✦</span>
        <p
          style={{
            margin: 0,
            fontSize: REPORT_TYPE.participant,
            fontWeight: 700,
            color: theme.ink,
            fontFamily: REPORT_FONTS.serif,
            letterSpacing: '0.04em',
            lineHeight: REPORT_LINE.tight,
          }}
        >
          参加者：{name}
        </p>
        <span style={{ color: theme.accent, fontSize: 16, fontFamily: REPORT_FONTS.serif, lineHeight: 1 }}>✦</span>
      </div>
    </div>
  );
}

export function PanelTitle({ theme, children }: { theme: ReportTheme; children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: REPORT_TYPE.panelTitle,
        fontWeight: 700,
        color: theme.headerBg,
        fontFamily: REPORT_FONTS.serif,
        lineHeight: REPORT_LINE.tight,
      }}
    >
      {children}
    </p>
  );
}
