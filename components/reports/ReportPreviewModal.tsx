'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/Button';
import type { ReportCaptureKind } from '@/lib/capture-ranking-png';
import { REPORT_CAPTURE_PIXEL_RATIO } from '@/lib/report-export/theme';

export type ReportPreviewPayload = {
  kind: ReportCaptureKind;
  title: string;
  filename: string;
  pngDataUrl: string;
  /** 個人レポート時の参加者表示名 */
  participantName?: string;
};

type Props = {
  preview: ReportPreviewPayload | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
};

const KIND_LABEL: Record<ReportCaptureKind, string> = {
  tournament: '大会レポート',
  overall: '全体レポート',
  personal: '個人レポート',
};

function formatBytesFromDataUrl(dataUrl: string): string {
  // Rough estimate: base64 is ~4/3 of binary size; strip prefix
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * レポート PNG のプレビューモーダル。
 * 保存前の確認用／レイアウト・キャプチャ品質のデバッグ用。
 */
export function ReportPreviewModal({ preview, isSaving, onClose, onSave }: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState<'fit' | '100'>('fit');
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    if (!preview) {
      setNaturalSize(null);
      setZoom('fit');
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [preview, isSaving, onClose]);

  const onImgLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const debugLines = useMemo(() => {
    if (!preview) return [];
    const lines: Array<{ label: string; value: string }> = [
      { label: '種別', value: KIND_LABEL[preview.kind] },
      { label: 'ファイル名', value: preview.filename },
      { label: '推定サイズ', value: formatBytesFromDataUrl(preview.pngDataUrl) },
      { label: 'pixelRatio', value: String(REPORT_CAPTURE_PIXEL_RATIO) },
    ];
    if (preview.participantName) {
      lines.splice(1, 0, { label: '参加者', value: preview.participantName });
    }
    if (naturalSize) {
      lines.push({
        label: '画像ピクセル',
        value: `${naturalSize.w} × ${naturalSize.h}`,
      });
      lines.push({
        label: 'CSS 相当幅',
        value: `約 ${Math.round(naturalSize.w / REPORT_CAPTURE_PIXEL_RATIO)}px`,
      });
      lines.push({
        label: 'アスペクト',
        value: (naturalSize.w / naturalSize.h).toFixed(3),
      });
    }
    return lines;
  }, [preview, naturalSize]);

  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-preview-title"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 border-b border-white/10 bg-neutral-950/95 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">プレビュー</p>
            <h2 id="report-preview-title" className="truncate text-lg font-semibold text-stone-100">
              {KIND_LABEL[preview.kind]}
              {preview.participantName ? ` · ${preview.participantName}` : ''}
            </h2>
            <p className="truncate text-xs text-stone-400">{preview.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setZoom('fit')}
                className={`min-h-[40px] px-3 text-sm ${
                  zoom === 'fit' ? 'bg-neutral-700 text-stone-100' : 'bg-neutral-900 text-stone-400 hover:bg-neutral-800'
                }`}
              >
                全体表示
              </button>
              <button
                type="button"
                onClick={() => setZoom('100')}
                className={`min-h-[40px] px-3 text-sm ${
                  zoom === '100' ? 'bg-neutral-700 text-stone-100' : 'bg-neutral-900 text-stone-400 hover:bg-neutral-800'
                }`}
              >
                実寸
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowDebug((v) => !v)}
              className="min-h-[40px] rounded-lg border border-white/10 bg-neutral-900 px-3 text-sm text-stone-300 hover:bg-neutral-800"
            >
              {showDebug ? '情報を隠す' : '情報を表示'}
            </button>
            <Button variant="secondary" onClick={onClose} disabled={isSaving} className="!min-h-[40px] !px-4 !py-2 text-sm">
              閉じる
            </Button>
            <Button variant="primary" onClick={onSave} disabled={isSaving} className="!min-h-[40px] !px-4 !py-2 text-sm">
              {isSaving ? '保存中…' : 'この画像を保存'}
            </Button>
          </div>
        </div>
      </header>

      {/* Body: image + optional debug panel */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        <div
          className={`min-h-0 flex-1 overflow-auto p-3 md:p-6 ${
            zoom === 'fit' ? 'flex items-start justify-center' : ''
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.pngDataUrl}
            alt={`${KIND_LABEL[preview.kind]}プレビュー`}
            onLoad={onImgLoad}
            className={
              zoom === 'fit'
                ? 'max-h-[calc(100vh-8rem)] w-auto max-w-full rounded-md shadow-2xl shadow-black/60'
                : 'block h-auto max-w-none rounded-md shadow-2xl shadow-black/60'
            }
            style={
              zoom === '100' && naturalSize
                ? { width: Math.round(naturalSize.w / REPORT_CAPTURE_PIXEL_RATIO) }
                : undefined
            }
          />
        </div>

        {showDebug && (
          <aside className="flex-shrink-0 border-t border-white/10 bg-neutral-950/90 p-4 md:w-72 md:border-l md:border-t-0 md:overflow-y-auto">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">デバッグ情報</p>
            <dl className="space-y-3">
              {debugLines.map((row) => (
                <div key={row.label}>
                  <dt className="text-[11px] text-stone-500">{row.label}</dt>
                  <dd className="break-all text-sm text-stone-200 font-mono leading-snug">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-stone-500">
              「実寸」でキャプチャ後の見た目を拡大確認できます。縦位置ずれや余白はここでチェックしてください。
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
