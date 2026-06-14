import { isIOS } from '@/lib/capture-device';

export type PngSaveResult = 'download' | 'share' | 'open';

/** PNG を保存。iOS では共有シートまたはプレビュー表示にフォールバック */
export async function savePngDataUrl(filename: string, dataUrl: string): Promise<PngSaveResult> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const file = new File([blob], filename, { type: 'image/png' });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return 'share';
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
    }
  }

  if (isIOS()) {
    const opened = window.open('', '_blank');
    if (opened) {
      opened.document.write(
        `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${filename}</title></head><body style="margin:0;background:#262626"><img src="${dataUrl}" alt="${filename}" style="width:100%;height:auto;display:block" /><p style="color:#a8a29e;font:14px system-ui;text-align:center;padding:12px">画像を長押しして「写真に追加」または「保存」</p></body></html>`,
      );
      opened.document.close();
      return 'open';
    }
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return 'download';
}
