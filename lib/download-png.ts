import { isIOS } from '@/lib/capture-device';

export type PngSaveResult = 'download' | 'share' | 'open';

function dataUrlToFile(filename: string, dataUrl: string): Promise<File> {
  return fetch(dataUrl)
    .then((r) => r.blob())
    .then((blob) => new File([blob], filename, { type: 'image/png' }));
}

/** PNG を保存。iOS では共有シートまたはプレビュー表示にフォールバック */
export async function savePngDataUrl(filename: string, dataUrl: string): Promise<PngSaveResult> {
  const file = await dataUrlToFile(filename, dataUrl);

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

export type MultiPngSaveResult = {
  mode: PngSaveResult;
  count: number;
};

/** 複数 PNG を保存（結果レポートの複数ページ用） */
export async function saveMultiplePngDataUrls(
  filenames: string[],
  dataUrls: string[],
): Promise<MultiPngSaveResult> {
  if (filenames.length !== dataUrls.length || dataUrls.length === 0) {
    throw new Error('Filename and data URL counts must match');
  }

  if (dataUrls.length === 1) {
    const mode = await savePngDataUrl(filenames[0], dataUrls[0]);
    return { mode, count: 1 };
  }

  const files = await Promise.all(
    filenames.map((name, i) => dataUrlToFile(name, dataUrls[i])),
  );

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          title: filenames[0]?.replace(/_\d+_.*\.png$/, '') ?? '結果レポート',
        });
        return { mode: 'share', count: files.length };
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
    }
  }

  let lastMode: PngSaveResult = 'download';
  for (let i = 0; i < dataUrls.length; i++) {
    lastMode = await savePngDataUrl(filenames[i], dataUrls[i]);
    if (i < dataUrls.length - 1) {
      await new Promise<void>((r) => setTimeout(r, 400));
    }
  }
  return { mode: lastMode, count: dataUrls.length };
}
