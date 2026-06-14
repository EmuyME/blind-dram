/** DOM 要素を PNG の data URL に変換（モバイル向け分割キャプチャ対応） */

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

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load captured image'));
    img.src = dataUrl;
  });
}

function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return loadImageFromDataUrl(dataUrl).then((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0);
    return canvas;
  });
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

async function captureSingleElementToPngDataUrl(el: HTMLElement, opts?: CaptureOpts): Promise<string> {
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

function stitchCanvasesToDataUrl(parts: HTMLCanvasElement[], sourceWidth: number): string {
  const maxDim = getMaxCanvasDimension();
  const naturalHeight = parts.reduce((sum, p) => sum + p.height, 0);
  const naturalWidth = Math.max(sourceWidth, ...parts.map((p) => p.width));
  const heightScale = Math.min(1, maxDim / naturalHeight);
  const widthScale = Math.min(1, maxDim / naturalWidth);
  const scale = Math.min(heightScale, widthScale);
  const outW = Math.max(1, Math.round(naturalWidth * scale));
  const outH = Math.max(1, Math.round(naturalHeight * scale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#262626';
  ctx.fillRect(0, 0, outW, outH);

  let y = 0;
  for (const part of parts) {
    const drawH = Math.round(part.height * scale);
    const drawW = Math.round(part.width * scale);
    ctx.drawImage(part, 0, 0, part.width, part.height, 0, y, drawW, drawH);
    y += drawH;
  }

  return out.toDataURL('image/png');
}

async function capturePosterChunksToPngDataUrl(
  rootEl: HTMLElement,
  chunks: HTMLElement[],
): Promise<string> {
  const sourceWidth = rootEl.scrollWidth || rootEl.clientWidth;
  const canvases: HTMLCanvasElement[] = [];

  for (const chunk of chunks) {
    const chunkHeight = chunk.scrollHeight || chunk.clientHeight;
    if (chunkHeight <= 0) continue;

    const dataUrl = await captureSingleElementToPngDataUrl(chunk, { pixelRatio: 1 });
    canvases.push(await dataUrlToCanvas(dataUrl));
  }

  if (canvases.length === 0) {
    throw new Error('No poster chunks captured');
  }
  if (canvases.length === 1) {
    return canvases[0].toDataURL('image/png');
  }
  return stitchCanvasesToDataUrl(canvases, sourceWidth);
}

function shouldUseChunkedCapture(el: HTMLElement): boolean {
  const chunks = el.querySelectorAll('[data-poster-capture-chunk]');
  if (chunks.length > 0) return true;
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

export async function captureElementToPngDataUrl(el: HTMLElement): Promise<string> {
  const chunkEls = Array.from(el.querySelectorAll('[data-poster-capture-chunk]')) as HTMLElement[];

  if (chunkEls.length > 0) {
    return capturePosterChunksToPngDataUrl(el, chunkEls);
  }

  if (shouldUseChunkedCapture(el)) {
    throw new Error(
      'Poster is too tall for single capture and has no capture chunks. Add data-poster-capture-chunk markers.',
    );
  }

  return captureSingleElementToPngDataUrl(el);
}
