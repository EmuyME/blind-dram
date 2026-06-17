'use client';

/** 回答表ヘッダー：項目名 + 配点の2段表示（flex 非依存） */
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
    <span style={{ textAlign: align, lineHeight: 1.2, display: 'block' }}>
      <span style={{ display: 'block', fontSize: headFs, fontWeight: 700 }}>{label}</span>
      <span style={{ display: 'block', fontSize: headPtsFs, fontWeight: 600, opacity: 0.9, marginTop: 1 }}>({points}pt)</span>
    </span>
  );
}
