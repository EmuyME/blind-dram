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

/** 分割キャプチャ時の1チャンク最大高さ（CSS px） */
export function getMaxChunkHeight(): number {
  if (isIOS()) return 2400;
  if (isMobileCapture()) return 4000;
  return 8000;
}

/** モバイルでは pixelRatio を抑える */
export function getDefaultPixelRatio(): number {
  if (isIOS()) return 1;
  if (isMobileCapture()) return 1.5;
  return 2;
}
