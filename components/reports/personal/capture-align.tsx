import type { CSSProperties, ReactNode } from 'react';

/**
 * PNG キャプチャ（html2canvas / html-to-image）向けの縦中央揃え。
 *
 * html2canvas は iOS モバイルで foreignObjectRendering:false になり、
 * flex の justify-content や table の vertical-align を正しく描画できない。
 * そのため padding-top / padding-bottom を数値で直接計算し、CSS の魔法に一切依存しない。
 *
 * contentH: コンテンツブロックの推定高さ（px）。
 *   指定すると上下パディングを均等に割り当てて中央揃え。
 *   opticalNudge: 正で下方向へ（ラベル上＋大数字の光学中心補正）。
 */

function parsePaddingH(padding: string): { left: string; right: string } {
  const parts = padding.trim().split(/\s+/);
  if (parts.length === 1) return { left: parts[0], right: parts[0] };
  if (parts.length === 2) return { left: parts[1], right: parts[1] };
  if (parts.length === 3) return { left: parts[1], right: parts[1] };
  return { left: parts[3], right: parts[1] };
}

export function CaptureVAlign({
  height,
  contentH,
  padding,
  align = 'left',
  opticalNudge = 0,
  style,
  children,
}: {
  height: number;
  /** コンテンツブロックの推定高さ (px)。指定すると上下 padding で確実に中央揃え。 */
  contentH?: number;
  padding?: string;
  align?: 'left' | 'center' | 'right';
  /** 正の値でコンテンツを下へずらす（光学中心補正） */
  opticalNudge?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

  if (contentH !== undefined) {
    const free = Math.max(0, height - contentH);
    let padTop = Math.floor(free / 2) + opticalNudge;
    let padBottom = free - Math.floor(free / 2) - opticalNudge;
    if (padTop < 0) {
      padBottom += padTop;
      padTop = 0;
    }
    if (padBottom < 0) {
      padTop += padBottom;
      padBottom = 0;
    }
    const hPad = padding ? parsePaddingH(padding) : { left: '0', right: '0' };
    return (
      <div
        style={{
          height,
          boxSizing: 'border-box',
          paddingTop: padTop,
          paddingBottom: padBottom,
          paddingLeft: hPad.left,
          paddingRight: hPad.right,
          textAlign,
          overflow: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  // Fallback: nested table（contentH 不明な場合）
  return (
    <table
      role="presentation"
      style={{
        width: '100%',
        height,
        borderCollapse: 'collapse',
        borderSpacing: 0,
        tableLayout: 'fixed',
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              height,
              verticalAlign: 'middle',
              textAlign,
              padding: padding ?? 0,
              border: 'none',
              lineHeight: 1.25,
              ...style,
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** 1行テキストを高さいっぱいで縦中央に（lineHeight = height px）。 */
export function captureLineBox(height: number, style: CSSProperties = {}): CSSProperties {
  return {
    display: 'block',
    height,
    lineHeight: `${height}px`,
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    ...style,
  };
}

/** 採点セルのコンテンツ高さ (answer + gap + meta) */
export function scoreCellContentH(answerFs: number, metaFs: number): number {
  return Math.round(answerFs * 1.25) + 4 + Math.round(metaFs * 1.25);
}

/** 表ヘッダーセルのコンテンツ高さ (label + gap + pts) */
export function headerCellContentH(headFs: number, headPtsFs: number): number {
  return Math.round(headFs * 1.2) + 2 + Math.round(headPtsFs * 1.2);
}

/** 結果カードのコンテンツ高さ (label + gap + value) — 実測寄りにやや小さめ */
export function resultCardContentH(): number {
  // label ~17, gap 8, value ~36。余白計算が大きすぎると上寄りになるため控えめに。
  return 58;
}

/** 分析右ペイン共通カードのコンテンツ高さ（タイトル + 主値 + 副値） */
export function analysisSideCardContentH(titleFs: number, primaryFs: number, secondaryFs: number): number {
  return Math.round(titleFs * 1.2) + 6 + Math.round(primaryFs * 1.25) + 6 + Math.round(secondaryFs * 1.2);
}

/** @deprecated 互換用 — analysisSideCardContentH を使う */
export function insightCardContentH(titleFs: number, labelFs: number): number {
  return analysisSideCardContentH(titleFs, labelFs, 20);
}

/** @deprecated 互換用 — analysisSideCardContentH を使う */
export function bottleCardBodyContentH(nameFs: number, scoreFs: number): number {
  return analysisSideCardContentH(12, nameFs, scoreFs);
}
