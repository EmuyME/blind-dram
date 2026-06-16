'use client';

import { IconGlass, IconSeal } from '@/components/reports/ReportIcons';
import { REPORT_FONTS, REPORT_WIDTH_PX, type ReportTheme } from '@/lib/report-export/theme';
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
      }}
    >
      <div
        style={{
          background: theme.headerGradient,
          color: theme.headerText,
          padding: '32px 40px 28px',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ opacity: 0.95 }}>
            <IconGlass size={52} color={theme.accent} />
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
            <p
              style={{
                margin: 0,
                fontSize: 36,
                letterSpacing: '0.12em',
                color: theme.accent,
                fontFamily: REPORT_FONTS.serif,
                fontWeight: 700,
                textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              }}
            >
              BLIND DRAM
            </p>
            <h1
              style={{
                margin: '6px 0 0',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '0.06em',
                fontFamily: REPORT_FONTS.serif,
              }}
            >
              {theme.subtitle}
            </h1>
            <div
              style={{
                display: 'inline-block',
                marginTop: 14,
                padding: '8px 28px',
                border: `1px solid ${theme.accent}`,
                borderRadius: 4,
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  color: theme.accentLight,
                  fontFamily: REPORT_FONTS.serif,
                  letterSpacing: '0.04em',
                }}
              >
                {sessionTitle}
              </p>
            </div>
          </div>
          <IconSeal size={60} color={theme.accent} />
        </div>
      </div>

      {participantBanner}

      <div style={{ padding: '28px 36px 36px' }}>{children}</div>

      <div
        style={{
          padding: '20px 36px 28px',
          textAlign: 'center',
          borderTop: `1px solid ${theme.rule}`,
          background: theme.paperAlt,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
          <IconGlass size={22} color={theme.accent} />
          <span style={{ fontSize: 13, fontFamily: REPORT_FONTS.serif, color: theme.inkMuted, letterSpacing: '0.15em' }}>
            BLIND DRAM
          </span>
        </div>
      </div>
    </div>
  );
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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${theme.accent}22`,
              border: `1px solid ${theme.accent}55`,
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
            fontSize: 20,
            fontWeight: 700,
            color: theme.headerBg,
            fontFamily: REPORT_FONTS.serif,
            letterSpacing: '0.04em',
          }}
        >
          {children}
        </h2>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${theme.sectionBar} 0%, ${theme.rule} 100%)` }} />
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
        flex: '1 1 140px',
        minWidth: 120,
        padding: '18px 14px 16px',
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>}
      <p style={{ margin: 0, fontSize: 12, color: theme.inkMuted, letterSpacing: '0.02em' }}>{label}</p>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 24,
          fontWeight: 800,
          color: theme.headerBg,
          fontFamily: REPORT_FONTS.serif,
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
        flex: '1 1 28%',
        minWidth: 150,
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          background: headerTone === 'gold' ? `${theme.accent}22` : theme.paperAlt,
          borderBottom: `2px solid ${headerBg}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {icon}
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.headerBg }}>{title}</p>
      </div>
      <div style={{ padding: '12px 14px' }}>
        {lines.map((line, i) => (
          <p
            key={`${line}-${i}`}
            style={{
              margin: i === 0 ? 0 : '6px 0 0',
              fontSize: i === 0 ? 16 : 14,
              fontWeight: i === 0 ? 700 : 400,
              lineHeight: 1.35,
              color: i === 0 ? theme.ink : theme.inkMuted,
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
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ReportTable({
  theme,
  children,
  fontSize = 14,
}: {
  theme: ReportTheme;
  children: React.ReactNode;
  fontSize?: number;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize, borderRadius: 8, overflow: 'hidden' }}>
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
        fontWeight: 600,
        fontSize: '0.92em',
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
    <td style={{ padding: '8px', textAlign: align, verticalAlign: 'middle', ...style }}>{children}</td>
  );
}

export function ParticipantBanner({ theme, name }: { theme: ReportTheme; name: string }) {
  return (
    <div
      style={{
        padding: '20px 36px',
        textAlign: 'center',
        background: theme.paperAlt,
        borderBottom: `1px solid ${theme.rule}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <span style={{ color: theme.accent, fontSize: 20, fontFamily: REPORT_FONTS.serif }}>✦</span>
        <p
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: theme.ink,
            fontFamily: REPORT_FONTS.serif,
            letterSpacing: '0.06em',
          }}
        >
          参加者：{name}
        </p>
        <span style={{ color: theme.accent, fontSize: 20, fontFamily: REPORT_FONTS.serif }}>✦</span>
      </div>
    </div>
  );
}
