/** 画像キャプチャ時のデバイス別制限 */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isMobileCapture(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIOS() || /Android/i.test(navigator.userAgent);
}

/** 1辺あたりの canvas 上限（iOS Safari は約 4096px） */
export function getMaxCanvasDimension(): number {
  if (isIOS()) return 4096;
  if (isMobileCapture()) return 8192;
  return 16384;
}

/** iOS は面積上限（約 4096²）も厳しい */
export function getMaxCanvasArea(): number {
  const side = getMaxCanvasDimension();
  return side * side;
}

/** 分割キャプチャ時の1チャンク最大高さ（CSS px） */
export function getMaxChunkHeight(): number {
  if (isIOS()) return 2400;
  if (isMobileCapture()) return 4000;
  return 8000;
}

/** モバイルでもページ単位なら高解像度を狙う */
export function getDefaultPixelRatio(): number {
  if (isMobileCapture()) return 2;
  return 2;
}

/**
 * 端末の canvas 上限に収まる pixelRatio を返す。
 * iOS では辺長・面積の両方を守り、必要なら 1 未満にも落とす。
 */
export function computeSafePixelRatio(
  width: number,
  height: number,
  requested?: number,
): number {
  const base = requested ?? getDefaultPixelRatio();
  if (!(width > 0) || !(height > 0)) return Math.min(base, 1);

  const maxDim = getMaxCanvasDimension();
  const maxArea = getMaxCanvasArea();
  let ratio = base;

  const maxSide = Math.max(width, height);
  if (maxSide * ratio > maxDim) {
    ratio = maxDim / maxSide;
  }

  const area = width * height * ratio * ratio;
  if (area > maxArea) {
    ratio = Math.sqrt(maxArea / (width * height));
  }

  // 極端な縮小は視認性を壊すので下限を設けるが、上限超過は絶対に避ける
  const floored = Math.floor(ratio * 1000) / 1000;
  return Math.max(0.25, floored);
}
