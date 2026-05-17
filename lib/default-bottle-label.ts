/**
 * 持ち込みボトル（サンプル）の仮ラベル既定値: 参加者表示名 + 連番（1始まり）。
 * 表示名がまだ空のときは「参加者」をプレフィックスにする。
 */
export function defaultBottleLabel(displayName: string, indexZeroBased: number): string {
  const base = displayName.trim() || '参加者';
  return `${base}${indexZeroBased + 1}`;
}
