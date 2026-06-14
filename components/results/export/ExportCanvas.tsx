'use client';

import { EXPORT_HEIGHT_PX, EXPORT_WIDTH_PX, exportColors } from '@/lib/results-export-design';

export function ExportCanvas({
  exportKind,
  pageLabel,
  children,
}: {
  exportKind: 'share' | 'archive';
  pageLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-export-capture-page
      data-export-fixed-size
      data-export-kind={exportKind}
      style={{
        width: EXPORT_WIDTH_PX,
        height: EXPORT_HEIGHT_PX,
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${exportColors.paperTop} 0%, ${exportColors.paperBottom} 100%)`,
        color: exportColors.ink,
        fontFamily: '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '48px 56px 24px',
          borderBottom: `2px solid ${exportColors.rule}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 22,
            letterSpacing: '0.2em',
            color: exportColors.accentDark,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 600,
          }}
        >
          BLIND DRAM
        </p>
        {pageLabel && (
          <p style={{ margin: '8px 0 0', fontSize: 20, color: exportColors.inkMuted, fontWeight: 600 }}>
            {pageLabel}
          </p>
        )}
      </div>

      <div style={{ flex: 1, padding: '32px 56px', display: 'flex', flexDirection: 'column' }}>{children}</div>

      <div
        style={{
          padding: '20px 56px 40px',
          borderTop: `1px solid ${exportColors.rule}`,
          fontSize: 18,
          color: exportColors.inkLight,
          textAlign: 'center',
        }}
      >
        © Blind Dram
      </div>
    </div>
  );
}
