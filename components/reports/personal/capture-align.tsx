import type { CSSProperties, ReactNode } from 'react';

/**
 * PNG キャプチャ（html2canvas / html-to-image）向けの縦中央揃え。
 * テーブルセル内の flex はキャプチャ時に崩れるため、ネスト table を使う。
 */
export function CaptureVAlign({
  height,
  padding,
  align = 'left',
  style,
  children,
}: {
  height: number;
  padding?: string;
  align?: 'left' | 'center' | 'right';
  style?: CSSProperties;
  children: ReactNode;
}) {
  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

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

/** 1行テキストを高さいっぱいで縦中央に（棒グラフ・％表示向け） */
export function captureLineBox(
  height: number,
  style: CSSProperties = {},
): CSSProperties {
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
