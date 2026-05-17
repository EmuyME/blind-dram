/** API や表示用に、本数などを正の整数文字列へ（先頭ゼロ付き文字列も解消） */
export function displayBottleCount(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n ?? 0), 10);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}
