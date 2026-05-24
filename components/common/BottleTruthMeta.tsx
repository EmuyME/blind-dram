'use client';

import type { ReactNode } from 'react';

/** Presenter Truth / API と共通のボトルメタ欄 */
export type BottleTruthMetaValues = {
  true_bottler_name?: string;
  true_distillation_year?: number | null;
  true_bottling_year?: number | null;
};

export function BottleTruthMetaFields({
  value,
  onChange,
  disabled,
  children,
}: {
  value: BottleTruthMetaValues;
  onChange: (next: BottleTruthMetaValues) => void;
  disabled?: boolean;
  /** メモ・ボトル画像など、このブロック内にまとめたい追加入力 */
  children?: ReactNode;
}) {
  const yearProps = {
    min: 1800,
    max: 2100,
    step: 1,
    className:
      'w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50',
  } as const;

  return (
    <div className="space-y-4 rounded-xl border border-bd-accent/20 bg-neutral-900/30 p-4">
      <h3 className="text-lg font-semibold text-stone-100 tracking-tight">ボトル情報（任意）</h3>
      <p className="text-sm text-stone-500 leading-relaxed">
        ボトラーズ名・蒸留年・ボトリング年は採点対象外です。テイスティングでは Tier1 ごとに強度（1〜5）も付けられます。メモ・ボトル画像は記録・共有用に入力できます。
      </p>
      <div>
        <label htmlFor="truth-bottler-name" className="block text-sm font-medium text-stone-200 mb-1.5">
          ボトラーズ名
        </label>
        <input
          id="truth-bottler-name"
          type="text"
          autoComplete="organization"
          disabled={disabled}
          value={value.true_bottler_name || ''}
          onChange={(e) => onChange({ ...value, true_bottler_name: e.target.value })}
          className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
          placeholder="例: ダグラスレイン"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="truth-distillation-year" className="block text-sm font-medium text-stone-200 mb-1.5">
            蒸留年
          </label>
          <input
            id="truth-distillation-year"
            type="number"
            disabled={disabled}
            {...yearProps}
            placeholder="例: 2015"
            value={
              value.true_distillation_year != null && Number.isFinite(value.true_distillation_year)
                ? value.true_distillation_year
                : ''
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onChange({ ...value, true_distillation_year: null });
                return;
              }
              const n = parseInt(raw, 10);
              onChange({
                ...value,
                true_distillation_year: Number.isFinite(n) ? n : null,
              });
            }}
          />
        </div>
        <div>
          <label htmlFor="truth-bottling-year" className="block text-sm font-medium text-stone-200 mb-1.5">
            ボトリング年
          </label>
          <input
            id="truth-bottling-year"
            type="number"
            disabled={disabled}
            {...yearProps}
            placeholder="例: 2023"
            value={
              value.true_bottling_year != null && Number.isFinite(value.true_bottling_year)
                ? value.true_bottling_year
                : ''
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onChange({ ...value, true_bottling_year: null });
                return;
              }
              const n = parseInt(raw, 10);
              onChange({
                ...value,
                true_bottling_year: Number.isFinite(n) ? n : null,
              });
            }}
          />
        </div>
      </div>

      {children ? <div className="space-y-4 pt-2 border-t border-white/10">{children}</div> : null}
    </div>
  );
}

export function BottleTruthMetaSummary({
  true_bottler_name,
  true_distillation_year,
  true_bottling_year,
  alwaysShow = false,
}: BottleTruthMetaValues & { alwaysShow?: boolean }) {
  const bottler = (true_bottler_name || '').trim();
  const hasAny =
    !!bottler ||
    (true_distillation_year != null && Number.isFinite(true_distillation_year)) ||
    (true_bottling_year != null && Number.isFinite(true_bottling_year));
  if (!alwaysShow && !hasAny) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/10 text-sm text-stone-300 space-y-2">
      <p className="font-semibold text-stone-200">ボトル情報</p>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <dt className="text-stone-500 text-xs uppercase tracking-wide">ボトラーズ名</dt>
          <dd className="text-stone-100">{bottler || '—'}</dd>
        </div>
        <div>
          <dt className="text-stone-500 text-xs uppercase tracking-wide">蒸留年</dt>
          <dd className="text-stone-100">
            {true_distillation_year != null && Number.isFinite(true_distillation_year)
              ? String(true_distillation_year)
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500 text-xs uppercase tracking-wide">ボトリング年</dt>
          <dd className="text-stone-100">
            {true_bottling_year != null && Number.isFinite(true_bottling_year)
              ? String(true_bottling_year)
              : '—'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
