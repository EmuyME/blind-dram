import { isIOS } from '@/lib/capture-device';

export type PngSaveResult = 'download' | 'share' | 'open';

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

function dataUrlToFile(filename: string, dataUrl: string): Promise<File> {
  return dataUrlToBlob(dataUrl).then((blob) => new File([blob], filename, { type: 'image/png' }));
}

/**
 * iOS Safari は巨大 data URL を document.write すると失敗しやすい。
 * Blob URL のプレビューページを開き、長押し保存を案内する。
 */
async function openIosPngPreview(filename: string, dataUrl: string): Promise<boolean> {
  const blob = await dataUrlToBlob(dataUrl);
  const blobUrl = URL.createObjectURL(blob);
  const opened = window.open(blobUrl, '_blank');
  if (opened) {
    // プレビュー用に軽い案内ページへ差し替え（可能なら）
    try {
      opened.document.write(
        `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${filename}</title></head><body style="margin:0;background:#1a1410;color:#f5ebe0;font:14px -apple-system,system-ui,sans-serif"><img src="${blobUrl}" alt="${filename}" style="width:100%;height:auto;display:block" /><p style="text-align:center;padding:16px;color:#a89070">画像を長押しして「写真に追加」または「保存」</p></body></html>`,
      );
      opened.document.close();
    } catch {
      // blob URL を直接開いただけでも保存可能
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return true;
  }
  URL.revokeObjectURL(blobUrl);
  return false;
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
    const opened = await openIosPngPreview(filename, dataUrl);
    if (opened) return 'open';
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
