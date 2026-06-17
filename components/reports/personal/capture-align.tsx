import type { CSSProperties, ReactNode } from 'react';

/**
 * PNG キャプチャ（html2canvas / html-to-image）向けの縦中央揃え。
 *
 * html2canvas は iOS モバイルで foreignObjectRendering:false になり、
 * flex の justify-content や table の vertical-align を正しく描画できない。
 * そのため padding-top を数値で直接計算し、CSS の魔法に一切依存しない。
 *
 * contentH: コンテンツブロックの推定高さ（px）。
 *   指定すると paddingTop = floor((height - contentH) / 2) で確実に中央揃え。
 *   省略時は nested-table fallback（デスクトップ向け）。
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
  style,
  children,
}: {
  height: number;
  /** コンテンツブロックの推定高さ (px)。指定すると padding-top で確実に中央揃え。 */
  contentH?: number;
  padding?: string;
  align?: 'left' | 'center' | 'right';
  style?: CSSProperties;
  children: ReactNode;
}) {
  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

  if (contentH !== undefined) {
    const vPad = Math.max(0, Math.floor((height - contentH) / 2));
    const hPad = padding ? parsePaddingH(padding) : { left: '0', right: '0' };
    return (
      <div
        style={{
          height,
          boxSizing: 'border-box',
          paddingTop: vPad,
          paddingLeft: hPad.left,
          paddingRight: hPad.right,
          textAlign,
          overflow: 'visible',
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

/** 結果カードのコンテンツ高さ (label + gap + value) */
export function resultCardContentH(): number {
  // label: 14px × lh1.2, gap: 8px, value: 36px × lh1
  return Math.round(14 * 1.2) + 8 + 36;
}

/** インサイトカードのコンテンツ高さ */
export function insightCardContentH(titleFs: number, labelFs: number): number {
  // title: titleFs × lh1.2, gap: 4, label: labelFs × lh1.25, gap: 4, rate: 13 × lh1.2
  return Math.round(titleFs * 1.2) + 4 + Math.round(labelFs * 1.25) + 4 + Math.round(13 * 1.2);
}

/** ボトルカード本体のコンテンツ高さ */
export function bottleCardBodyContentH(nameFs: number, scoreFs: number): number {
  // name: nameFs × lh1.25, gap: 6, score line: scoreFs × lh1
  return Math.round(nameFs * 1.25) + 6 + scoreFs;
}
