/** DOM 要素を PNG の data URL に変換 */

import {
  computeSafePixelRatio,
  getMaxChunkHeight,
  isMobileCapture,
} from '@/lib/capture-device';
import { EXPORT_HEIGHT_PX, EXPORT_WIDTH_PX } from '@/lib/results-export-design';
import { REPORT_CAPTURE_PIXEL_RATIO, REPORT_WIDTH_PX } from '@/lib/report-export/theme';

type CaptureOpts = {
  pixelRatio?: number;
};

function applyCaptureLayout(el: HTMLElement): {
  overflowEl: HTMLElement | null;
  prevOverflow: string;
  prevWidth: string;
  prevElOverflow: string;
  prevElWidth: string;
  prevElHeight: string;
  prevElTransform: string;
  captureWidth: number;
  captureHeight: number;
} {
  const overflowEl = el.querySelector('.overflow-x-auto') as HTMLElement | null;
  const tableEl = el.querySelector('table') as HTMLElement | null;
  const prevOverflow = overflowEl?.style.overflow ?? '';
  const prevWidth = overflowEl?.style.width ?? '';
  const prevElOverflow = el.style.overflow;
  const prevElWidth = el.style.width;
  const prevElHeight = el.style.height;
  const prevElTransform = el.style.transform;
  const isReportPage = el.hasAttribute('data-report-capture-page');
  const isFixedExport = el.hasAttribute('data-export-fixed-size');
  const widthAttr = el.getAttribute('data-report-width');
  const reportWidth = widthAttr ? parseInt(widthAttr, 10) : REPORT_WIDTH_PX;
  const captureWidth = isReportPage
    ? reportWidth
    : isFixedExport
      ? EXPORT_WIDTH_PX
      : Math.max(el.scrollWidth, tableEl?.scrollWidth ?? 0, el.clientWidth);
  const captureHeight = isFixedExport
    ? EXPORT_HEIGHT_PX
    : Math.max(el.scrollHeight, tableEl?.scrollHeight ?? 0, el.clientHeight);

  if (overflowEl) {
    overflowEl.style.overflow = 'visible';
    overflowEl.style.width = `${captureWidth}px`;
  }
  el.style.overflow = 'visible';
  el.style.width = `${captureWidth}px`;
  el.style.transform = 'none';
  if (isFixedExport) {
    el.style.height = `${captureHeight}px`;
  } else if (isReportPage) {
    el.style.height = 'auto';
  }

  return {
    overflowEl,
    prevOverflow,
    prevWidth,
    prevElOverflow,
    prevElWidth,
    prevElHeight,
    prevElTransform,
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
  prevElHeight: string,
  prevElTransform: string,
) {
  if (overflowEl) {
    overflowEl.style.overflow = prevOverflow;
    overflowEl.style.width = prevWidth;
  }
  el.style.overflow = prevElOverflow;
  el.style.width = prevElWidth;
  el.style.height = prevElHeight;
  el.style.transform = prevElTransform;
}

function captureBackground(el: HTMLElement): string {
  if (el.hasAttribute('data-report-capture-page')) {
    const kind = el.closest('[data-report-kind]')?.getAttribute('data-report-kind');
    if (kind === 'tournament') return '#faf7f2';
    if (kind === 'overall') return '#f6faf7';
    if (kind === 'personal') return '#F7F2E8';
    return '#f8f4ec';
  }
  if (el.hasAttribute('data-export-capture-page')) return '#F8F4EC';
  return '#262626';
}

/** ほぼ空の PNG（白紙キャプチャ）を弾く */
function assertUsablePngDataUrl(dataUrl: string): string {
  if (!dataUrl.startsWith('data:image/png')) {
    throw new Error('Capture did not return a PNG data URL');
  }
  // 典型的な白紙〜極小 PNG は数 KB 未満。レポートは通常 50KB 超。
  if (dataUrl.length < 8000) {
    throw new Error('Capture produced a blank or tiny PNG');
  }
  return dataUrl;
}

async function captureWithHtml2Canvas(
  el: HTMLElement,
  captureWidth: number,
  captureHeight: number,
  pixelRatio: number,
): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const bg = captureBackground(el);
  const canvas = await html2canvas(el, {
    backgroundColor: bg,
    scale: pixelRatio,
    logging: false,
    useCORS: true,
    // toDataURL 前に taint すると iOS で保存失敗するため false
    allowTaint: false,
    foreignObjectRendering: !isMobileCapture(),
    width: captureWidth,
    height: captureHeight,
    windowWidth: captureWidth,
    windowHeight: captureHeight,
    scrollX: 0,
    scrollY: 0,
    onclone: (_doc, cloned) => {
      cloned.style.transform = 'none';
      cloned.style.opacity = '1';
      cloned.style.visibility = 'visible';
    },
  });

  // 真っ白 canvas の簡易検出
  try {
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      const sample = ctx.getImageData(
        Math.min(8, canvas.width - 1),
        Math.min(8, canvas.height - 1),
        Math.max(1, Math.min(32, canvas.width)),
        Math.max(1, Math.min(32, canvas.height)),
      ).data;
      let nonEmpty = 0;
      for (let i = 0; i < sample.length; i += 4) {
        const a = sample[i + 3];
        const r = sample[i];
        const g = sample[i + 1];
        const b = sample[i + 2];
        if (a > 8 && (r < 250 || g < 250 || b < 250)) {
          nonEmpty += 1;
          if (nonEmpty > 4) break;
        }
      }
      if (nonEmpty <= 4) {
        throw new Error('html2canvas produced a blank canvas');
      }
    }
  } catch (err) {
    if ((err as Error)?.message?.includes('blank canvas')) throw err;
    // getImageData がセキュリティで失敗した場合は続行
  }

  return assertUsablePngDataUrl(canvas.toDataURL('image/png'));
}

async function captureWithHtmlToImage(
  el: HTMLElement,
  captureWidth: number,
  captureHeight: number,
  pixelRatio: number,
): Promise<string> {
  const { toPng } = await import('html-to-image');
  const bg = captureBackground(el);
  const dataUrl = await toPng(el, {
    backgroundColor: bg,
    pixelRatio,
    cacheBust: true,
    width: captureWidth,
    height: captureHeight,
    style: {
      overflow: 'visible',
      opacity: '1',
      transform: 'none',
      visibility: 'visible',
    },
  });
  return assertUsablePngDataUrl(dataUrl);
}

export async function captureSingleElementToPngDataUrl(el: HTMLElement, opts?: CaptureOpts): Promise<string> {
  const layout = applyCaptureLayout(el);
  const pixelRatio = computeSafePixelRatio(
    layout.captureWidth,
    layout.captureHeight,
    opts?.pixelRatio,
  );

  // レイアウト確定待ち（iOS で高さ 0 キャプチャを避ける）
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

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
      layout.prevElHeight,
      layout.prevElTransform,
    );
  }
}

function shouldUseChunkedCapture(el: HTMLElement): boolean {
  const height = Math.max(el.scrollHeight, el.clientHeight);
  return height > getMaxChunkHeight();
}

/**
 * キャプチャ用に要素を一時的にビューポート内へ。
 * iOS では opacity:0 だと html2canvas が白紙になるため、画面外へ平行移動しつつ opacity:1 を保つ。
 */
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
    transform: wrapper.style.transform,
  };

  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.opacity = '1';
  wrapper.style.zIndex = '0';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.visibility = 'visible';
  wrapper.style.overflow = 'visible';
  // 画面外だが Safari がレイアウト／描画する位置
  wrapper.style.transform = 'translate3d(-12000px, 0, 0)';

  try {
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise<void>((r) => setTimeout(r, 50));
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
    wrapper.style.transform = prev.transform;
  }
}

/** ポスター各ページを高解像度のまま個別にキャプチャ（結合・縮小なし） */
export async function captureExportPagesToPngDataUrls(
  rootEl: HTMLElement,
  kind: 'share' | 'archive',
): Promise<string[]> {
  const selector =
    kind === 'share'
      ? '[data-export-capture-page][data-export-kind="share"]'
      : '[data-export-capture-page][data-export-kind="archive"]';
  const pages = Array.from(rootEl.querySelectorAll(selector)) as HTMLElement[];
  if (pages.length === 0) {
    throw new Error(`No export pages found for kind: ${kind}`);
  }
  const results: string[] = [];
  for (const page of pages) {
    results.push(await captureSingleElementToPngDataUrl(page));
  }
  return results;
}

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

export type ReportCaptureKind = 'tournament' | 'overall' | 'personal';

export type ReportCaptureFilter = {
  kind: ReportCaptureKind;
  participantId?: string;
};

export async function captureReportFromRoot(
  root: HTMLElement,
  kind: ReportCaptureKind,
  participantId?: string,
): Promise<string> {
  let page: HTMLElement | null = null;
  if (kind === 'personal' && participantId) {
    page = root.querySelector(
      `[data-report-kind="personal"][data-participant-id="${participantId}"] [data-report-capture-page]`,
    ) as HTMLElement | null;
  } else {
    page = root.querySelector(
      `[data-report-kind="${kind}"] [data-report-capture-page]`,
    ) as HTMLElement | null;
  }
  if (!page) {
    throw new Error(`Report page not found: ${kind}`);
  }
  return captureSingleElementToPngDataUrl(page, { pixelRatio: REPORT_CAPTURE_PIXEL_RATIO });
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
