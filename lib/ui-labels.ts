/** ユーザー向け表示ラベル（日英混在を避ける） */

export function formatSampleLabel(label: string | null | undefined): string {
  const t = (label ?? '').trim();
  if (!t) return 'サンプル';
  if (/^サンプル\s+/.test(t)) return t;
  if (/^sample\s+/i.test(t)) return t.replace(/^sample\s+/i, 'サンプル ');
  return `サンプル ${t}`;
}
