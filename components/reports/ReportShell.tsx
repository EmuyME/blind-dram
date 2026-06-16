'use client';

import { REPORT_WIDTH_PX, type ReportTheme } from '@/lib/report-export/theme';

export function ReportShell({
  theme,
  sessionTitle,
  children,
}: {
  theme: ReportTheme;
  sessionTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-report-capture-page
      data-report-width
      style={{
        width: REPORT_WIDTH_PX,
        boxSizing: 'border-box',
        background: theme.paper,
        color: theme.ink,
        fontFamily: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif',
      }}
    >
      <div
        style={{
          background: theme.headerBg,
          color: theme.headerText,
          padding: '36px 48px 28px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            letterSpacing: '0.25em',
            color: theme.accent,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          BLIND DRAM
        </p>
        <h1 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{theme.subtitle}</h1>
        <p style={{ margin: '12px 0 0', fontSize: 22, color: theme.accentLight }}>{sessionTitle}</p>
      </div>
      <div style={{ padding: '32px 40px 40px' }}>{children}</div>
      <div
        style={{
          padding: '16px 40px 28px',
          textAlign: 'center',
          fontSize: 13,
          color: theme.inkMuted,
          borderTop: `1px solid ${theme.rule}`,
        }}
      >
        © Blind Dram
      </div>
    </div>
  );
}

export function SectionTitle({ theme, children }: { theme: ReportTheme; children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: '0 0 16px',
        fontSize: 20,
        fontWeight: 700,
        color: theme.headerBg,
        borderLeft: `4px solid ${theme.accent}`,
        paddingLeft: 12,
      }}
    >
      {children}
    </h2>
  );
}

export function StatCard({
  theme,
  label,
  value,
}: {
  theme: ReportTheme;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        padding: '16px 12px',
        background: theme.paperAlt,
        border: `1px solid ${theme.rule}`,
        borderRadius: 10,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: theme.inkMuted }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 800, color: theme.headerBg }}>{value}</p>
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
    <div
      style={{
        flex: '1 1 30%',
        minWidth: 160,
        padding: '14px 16px',
        background: '#fff',
        border: `1px solid ${theme.rule}`,
        borderRadius: 10,
        borderTop: `3px solid ${theme.accent}`,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.accent }}>{title}</p>
      {lines.map((line) => (
        <p key={line} style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.35 }}>
          {line}
        </p>
      ))}
    </div>
  );
}
