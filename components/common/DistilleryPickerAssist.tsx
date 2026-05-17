'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DISTILLERY_BY_REGION, DISTILLERY_REGIONS_ORDER } from '@/lib/data/distillery-by-region';

type Props = {
  disabled?: boolean;
  /** すでに入力されている地域（推測・正解）と照らして初期地域を選ぶ */
  hintRegion?: string;
  /** 選択した蒸留所名をフィールドへ反映 */
  onApply: (distilleryName: string) => void;
  className?: string;
};

/** セッションの地域表記や表の「地域」列とのゆるい対応 */
function resolveInitialRegion(hint: string | undefined): string {
  if (!hint?.trim()) return '';
  const h = hint.trim();
  for (const r of DISTILLERY_REGIONS_ORDER) {
    if (h.includes(r) || r.includes(h)) return r;
  }
  const aliases: [string, string][] = [
    ['スコットランド', ''],
    ['低地', 'ローランド'],
    ['カンベルタウン', 'キャンベルタウン'],
  ];
  for (const [needle, mapped] of aliases) {
    if (h.includes(needle)) {
      if (mapped) return mapped;
    }
  }
  return '';
}

export function DistilleryPickerAssist({ disabled, hintRegion, onApply, className }: Props) {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState('');
  const [distillery, setDistillery] = useState('');

  const distilleries = useMemo(() => {
    if (!region) return [];
    return [...(DISTILLERY_BY_REGION[region] ?? [])];
  }, [region]);

  const handleOpen = () => {
    setRegion(resolveInitialRegion(hintRegion) || DISTILLERY_REGIONS_ORDER[0]);
    setDistillery('');
    setOpen(true);
  };

  const handleApply = () => {
    if (!distillery.trim()) return;
    onApply(distillery.trim());
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={handleOpen}
        className={`min-h-[44px] px-3 text-sm shrink-0 whitespace-nowrap ${className ?? ''}`}
        aria-haspopup="dialog"
      >
        リストから
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="distillery-picker-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="distillery-picker-title" className="text-lg font-semibold text-stone-100">
              蒸留所を選ぶ
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed">
              地域（表 A 列）→ 蒸留所（表 C 列）の順に選び、「入力に反映」でフィールドへコピーします。
            </p>

            <div>
              <label htmlFor="distillery-picker-region" className="block text-sm font-medium text-stone-200 mb-1.5">
                地域
              </label>
              <select
                id="distillery-picker-region"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setDistillery('');
                }}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px]"
              >
                {DISTILLERY_REGIONS_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="distillery-picker-name" className="block text-sm font-medium text-stone-200 mb-1.5">
                蒸留所
              </label>
              <select
                id="distillery-picker-name"
                value={distillery}
                onChange={(e) => setDistillery(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px]"
              >
                <option value="">選択してください</option>
                {distilleries.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="button" variant="primary" onClick={handleApply} disabled={!distillery.trim()}>
                入力に反映
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
