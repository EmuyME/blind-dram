/** DOM 要素を PNG の data URL に変換 */

import {
  getDefaultPixelRatio,
  getMaxCanvasDimension,
  getMaxChunkHeight,
  isMobileCapture,
} from '@/lib/capture-device';

type CaptureOpts = {
  pixelRatio?: number;
};

function safePixelRatio(width: number, height: number, requested?: number): number {
  const base = requested ?? getDefaultPixelRatio();
  const maxDim = getMaxCanvasDimension();
  const maxSide = Math.max(width, height);
  if (maxSide * base <= maxDim) return base;
  return Math.max(1, maxDim / maxSide);
}

function applyCaptureLayout(el: HTMLElement): {
  overflowEl: HTMLElement | null;
  prevOverflow: string;
  prevWidth: string;
  prevElOverflow: string;
  prevElWidth: string;
  captureWidth: number;
  captureHeight: number;
} {
  const overflowEl = el.querySelector('.overflow-x-auto') as HTMLElement | null;
  const tableEl = el.querySelector('table') as HTMLElement | null;
  const prevOverflow = overflowEl?.style.overflow ?? '';
  const prevWidth = overflowEl?.style.width ?? '';
  const prevElOverflow = el.style.overflow;
  const prevElWidth = el.style.width;
  const captureWidth = Math.max(el.scrollWidth, tableEl?.scrollWidth ?? 0, el.clientWidth);
  const captureHeight = Math.max(el.scrollHeight, tableEl?.scrollHeight ?? 0, el.clientHeight);

  if (overflowEl) {
    overflowEl.style.overflow = 'visible';
    overflowEl.style.width = `${captureWidth}px`;
  }
  el.style.overflow = 'visible';
  el.style.width = `${captureWidth}px`;

  return {
    overflowEl,
    prevOverflow,
    prevWidth,
    prevElOverflow,
    prevElWidth,
    captureWidth,
    captureHeight,
  };
}

function restoreCaptureLayout(
  el: HTMLElement,
  overflowEl: HTMLElement | null,
  prevOverflow: string,
  prevWidth: string,
  prevElOverflow: string,
  prevElWidth: string,
) {
  if (overflowEl) {
    overflowEl.style.overflow = prevOverflow;
    overflowEl.style.width = prevWidth;
  }
  el.style.overflow = prevElOverflow;
  el.style.width = prevElWidth;
}

async function captureWithHtml2Canvas(
  el: HTMLElement,
  captureWidth: number,
  captureHeight: number,
  pixelRatio: number,
): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, {
    backgroundColor: '#262626',
    scale: pixelRatio,
    logging: false,
    useCORS: true,
    allowTaint: true,
    foreignObjectRendering: !isMobileCapture(),
    width: captureWidth,
    height: captureHeight,
    windowWidth: captureWidth,
    windowHeight: captureHeight,
    scrollX: 0,
    scrollY: 0,
  });
  return canvas.toDataURL('image/png');
}

async function captureWithHtmlToImage(
  el: HTMLElement,
  captureWidth: number,
  captureHeight: number,
  pixelRatio: number,
): Promise<string> {
  const { toPng } = await import('html-to-image');
  return await toPng(el, {
    backgroundColor: '#262626',
    pixelRatio,
    cacheBust: true,
    width: captureWidth,
    height: captureHeight,
    style: { overflow: 'visible' },
  });
}

export async function captureSingleElementToPngDataUrl(el: HTMLElement, opts?: CaptureOpts): Promise<string> {
  const layout = applyCaptureLayout(el);
  const pixelRatio = safePixelRatio(layout.captureWidth, layout.captureHeight, opts?.pixelRatio);

  try {
    if (isMobileCapture()) {
      try {
        return await captureWithHtml2Canvas(
          el,
          layout.captureWidth,
          layout.captureHeight,
          pixelRatio,
        );
      } catch (h2cErr) {
        console.warn('html2canvas failed on mobile, trying html-to-image', h2cErr);
        return await captureWithHtmlToImage(
          el,
          layout.captureWidth,
          layout.captureHeight,
          pixelRatio,
        );
      }
    }

    try {
      return await captureWithHtmlToImage(
        el,
        layout.captureWidth,
        layout.captureHeight,
        pixelRatio,
      );
    } catch (pngErr) {
      console.warn('html-to-image failed, falling back to html2canvas', pngErr);
      return await captureWithHtml2Canvas(
        el,
        layout.captureWidth,
        layout.captureHeight,
        pixelRatio,
      );
    }
  } finally {
    restoreCaptureLayout(
      el,
      layout.overflowEl,
      layout.prevOverflow,
      layout.prevWidth,
      layout.prevElOverflow,
      layout.prevElWidth,
    );
  }
}

function shouldUseChunkedCapture(el: HTMLElement): boolean {
  const height = Math.max(el.scrollHeight, el.clientHeight);
  return height > getMaxChunkHeight();
}

/** キャプチャ用に要素を一時的にビューポート内へ（iOS の描画抜け対策） */
export async function withCaptureVisible<T>(wrapper: HTMLElement, fn: () => Promise<T>): Promise<T> {
  const prev = {
    position: wrapper.style.position,
    left: wrapper.style.left,
    top: wrapper.style.top,
    opacity: wrapper.style.opacity,
    zIndex: wrapper.style.zIndex,
    pointerEvents: wrapper.style.pointerEvents,
    visibility: wrapper.style.visibility,
    width: wrapper.style.width,
    overflow: wrapper.style.overflow,
  };

  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.opacity = '0';
  wrapper.style.zIndex = '-1';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.visibility = 'visible';
  wrapper.style.overflow = 'visible';

  try {
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    return await fn();
  } finally {
    wrapper.style.position = prev.position;
    wrapper.style.left = prev.left;
    wrapper.style.top = prev.top;
    wrapper.style.opacity = prev.opacity;
    wrapper.style.zIndex = prev.zIndex;
    wrapper.style.pointerEvents = prev.pointerEvents;
    wrapper.style.visibility = prev.visibility;
    wrapper.style.width = prev.width;
    wrapper.style.overflow = prev.overflow;
  }
}

/** ポスター各ページを高解像度のまま個別にキャプチャ（結合・縮小なし） */
export async function capturePosterPagesToPngDataUrls(rootEl: HTMLElement): Promise<string[]> {
  const pages = Array.from(rootEl.querySelectorAll('[data-poster-capture-page]')) as HTMLElement[];
  if (pages.length === 0) {
    return [await captureSingleElementToPngDataUrl(rootEl)];
  }

  const results: string[] = [];
  for (const page of pages) {
    results.push(await captureSingleElementToPngDataUrl(page));
  }
  return results;
}

export async function captureElementToPngDataUrl(el: HTMLElement): Promise<string> {
  const pages = el.querySelectorAll('[data-poster-capture-page]');
  if (pages.length > 0) {
    const all = await capturePosterPagesToPngDataUrls(el);
    return all[0] ?? '';
  }

  if (shouldUseChunkedCapture(el)) {
    throw new Error('Element is too tall for single capture.');
  }

  return captureSingleElementToPngDataUrl(el);
}
