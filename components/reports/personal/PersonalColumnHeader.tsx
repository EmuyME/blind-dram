'use client';

/** 回答表ヘッダー：項目名 + 配点の2段表示 */
export function PersonalColumnHeader({
  label,
  points,
  align = 'left',
  headFs,
  headPtsFs,
}: {
  label: string;
  points: number;
  align?: 'left' | 'center';
  headFs: number;
  headPtsFs: number;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: align,
        lineHeight: 1.2,
        minHeight: 32,
      }}
    >
      <span style={{ display: 'block', fontSize: headFs, fontWeight: 700 }}>{label}</span>
      <span style={{ display: 'block', fontSize: headPtsFs, fontWeight: 600, opacity: 0.9, marginTop: 1 }}>({points}pt)</span>
    </span>
  );
}
