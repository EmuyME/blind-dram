'use client';

import type { CSSProperties, ReactNode } from 'react';
import { PERSONAL_CANVAS, PERSONAL_REPORT_WIDTH, PERSONAL_V1 } from '@/components/reports/personal/personal-tokens';
import { REPORT_FONTS } from '@/lib/report-export/theme';

export function PersonalReportShell({ children }: { children: ReactNode }) {
  return (
    <article
      data-report-capture-page
      data-report-width={PERSONAL_REPORT_WIDTH}
      style={{
        width: PERSONAL_REPORT_WIDTH,
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${PERSONAL_CANVAS.bg} 0%, #f0e8da 100%)`,
        color: PERSONAL_V1.ink,
        fontFamily: REPORT_FONTS.sans,
        padding: PERSONAL_CANVAS.padding,
      }}
    >
      {children}
      <footer style={{ marginTop: 28, textAlign: 'center', paddingTop: 18, borderTop: `1px solid ${PERSONAL_V1.rule}` }}>
        <span style={{ fontSize: 11, color: PERSONAL_V1.inkSoft, letterSpacing: '0.18em', fontFamily: REPORT_FONTS.serif }}>BLIND DRAM</span>
      </footer>
    </article>
  );
}

export const PERSONAL_CONTENT_W = PERSONAL_REPORT_WIDTH - PERSONAL_CANVAS.padding * 2;

export function personalTableHeadStyle(tbl: { padding: string; headFs: number }): CSSProperties {
  return {
    height: 48,
    padding: tbl.padding,
    fontSize: tbl.headFs,
    fontWeight: 700,
    color: '#fff',
    background: PERSONAL_V1.headerBg,
    borderBottom: `1px solid ${PERSONAL_V1.headerBgDeep}`,
    verticalAlign: 'middle',
  };
}
