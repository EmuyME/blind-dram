/** DB（TEXT 列）へ age/abv を保存する前の正規化 */

export function normalizeAgeAbvStorage(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (!s) return null;
  // 範囲ラベル（50.0-54.9 / 65.0- など）はそのまま
  if (/\d\s*-\s*\d/.test(s) || /-\s*$/.test(s)) return s;
  if (s === '-39.9') return s;
  const n = parseFloat(s.replace(/%/g, ''));
  if (!Number.isFinite(n)) return s;
  if (s.includes('.') || s.includes('%')) {
    return String(Math.round(n * 10) / 10);
  }
  return String(Math.trunc(n));
}
