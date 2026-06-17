'use client';

import { CaptureVAlign } from '@/components/reports/personal/capture-align';
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

const TH_HEIGHT = 48;

export function personalTableHeadStyle(tbl: { headFs: number }): CSSProperties {
  return {
    height: TH_HEIGHT,
    padding: 0,
    fontSize: tbl.headFs,
    fontWeight: 700,
    color: '#fff',
    background: PERSONAL_V1.headerBg,
    borderBottom: `1px solid ${PERSONAL_V1.headerBgDeep}`,
    verticalAlign: 'middle',
  };
}

export function PersonalTableHeadCell({
  align,
  padding,
  children,
}: {
  align: 'left' | 'center';
  padding: string;
  children: ReactNode;
}) {
  return (
    <CaptureVAlign height={TH_HEIGHT} padding={padding} align={align}>
      {children}
    </CaptureVAlign>
  );
}

export { TH_HEIGHT };
