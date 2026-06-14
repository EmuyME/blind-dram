/** 順位表 DOM 要素を PNG の data URL に変換 */

const MAX_CANVAS_DIMENSION = 16384;

function safePixelRatio(width: number, height: number, requested = 2): number {
  const maxSide = Math.max(width, height);
  if (maxSide * requested <= MAX_CANVAS_DIMENSION) return requested;
  return Math.max(1, MAX_CANVAS_DIMENSION / maxSide);
}

export async function captureElementToPngDataUrl(el: HTMLElement): Promise<string> {
  const overflowEl = el.querySelector('.overflow-x-auto') as HTMLElement | null;
  const tableEl = el.querySelector('table') as HTMLElement | null;
  const prevOverflow = overflowEl?.style.overflow ?? '';
  const prevWidth = overflowEl?.style.width ?? '';
  const prevElOverflow = el.style.overflow;
  const prevElWidth = el.style.width;
  const captureWidth = Math.max(el.scrollWidth, tableEl?.scrollWidth ?? 0, el.clientWidth);
  const captureHeight = Math.max(el.scrollHeight, tableEl?.scrollHeight ?? 0, el.clientHeight);
  const pixelRatio = safePixelRatio(captureWidth, captureHeight);

  if (overflowEl) {
    overflowEl.style.overflow = 'visible';
    overflowEl.style.width = `${captureWidth}px`;
  }
  el.style.overflow = 'visible';
  el.style.width = `${captureWidth}px`;

  try {
    const { toPng } = await import('html-to-image');
    return await toPng(el, {
      backgroundColor: '#262626',
      pixelRatio,
      cacheBust: true,
      width: captureWidth,
      height: captureHeight,
      style: { overflow: 'visible' },
    });
  } catch (pngErr) {
    console.warn('html-to-image failed, falling back to html2canvas', pngErr);
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, {
      backgroundColor: '#262626',
      scale: pixelRatio,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
    });
    return canvas.toDataURL('image/png');
  } finally {
    if (overflowEl) {
      overflowEl.style.overflow = prevOverflow;
      overflowEl.style.width = prevWidth;
    }
    el.style.overflow = prevElOverflow;
    el.style.width = prevElWidth;
  }
}
