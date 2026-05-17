'use client';

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  SCORING_ITEM_KEYS,
  buildScoringSettingsFile,
  parseScoringSettingsFile,
  type FullScoringConfig,
  type ScoringItemConfig,
  type ScoringItemKey,
} from '@/lib/scoring-schema';

type Props = {
  value: FullScoringConfig;
  onChange: (next: FullScoringConfig) => void;
};

function patchItem(
  cfg: FullScoringConfig,
  key: ScoringItemKey,
  patch: Partial<ScoringItemConfig>,
): FullScoringConfig {
  return {
    ...cfg,
    items: {
      ...cfg.items,
      [key]: { ...cfg.items[key], ...patch },
    },
  };
}

function ChoiceOptionsRows({
  options,
  onChange,
  addLabel,
}: {
  options: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-stone-400">選択肢</label>
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={option}
            onChange={(e) => {
              const next = [...options];
              next[index] = e.target.value;
              onChange(next);
            }}
            placeholder="選択肢の名前"
            className="flex-1 px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm focus:border-white/20 focus:ring-2 focus:ring-white/20"
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 px-3 py-2 text-sm bg-red-500/15 text-red-300 border border-red-400/30 hover:bg-red-500/25"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            削除
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="w-full text-sm"
        onClick={() => onChange([...options, ''])}
      >
        {addLabel}
      </Button>
    </div>
  );
}

export function ScoringSettingsPanel({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadJson = useCallback(() => {
    const bundle = buildScoringSettingsFile(value);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `blind-dram-scoring-v2-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [value]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const next = parseScoringSettingsFile(raw);
      onChange(next);
    } catch {
      alert(
        '配点JSONの読み込みに失敗しました。format が "blind-dram-scoring"、version が 2 のファイルのみ対応しています。',
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="text-sm" onClick={downloadJson}>
          配点JSONをダウンロード
        </Button>
        <Button type="button" variant="secondary" className="text-sm" onClick={() => fileRef.current?.click()}>
          配点JSONを読み込む
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      <p className="text-xs text-stone-400 leading-relaxed">
        選択式の項目は下で選択肢を編集します。カスク・地域は自由入力にしていても、ここで選択肢を残しておけば JSON
        に含まれ、あとから選択式に戻すときに使えます。
        ファイル形式は{' '}
        <span className="font-mono text-stone-300">format: &quot;blind-dram-scoring&quot;, version: 2</span>
        の1種類です（scoring のみ・重複フィールドなし）。
      </p>

      <div className="space-y-4">
        {SCORING_ITEM_KEYS.map((key) => {
          const it = value.items[key];
          const isCaskOrRegion = key === 'cask' || key === 'region';
          return (
            <div
              key={key}
              className="rounded-xl border border-white/10 bg-neutral-900/40 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-stone-200 uppercase tracking-wide">
                  {key}
                </span>
                <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={it.enabled}
                    onChange={(e) =>
                      onChange(patchItem(value, key, { enabled: e.target.checked }))
                    }
                    className="rounded border-white/20 bg-neutral-700"
                  />
                  この項目を使う
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">表示名</label>
                <input
                  type="text"
                  value={it.label}
                  onChange={(e) => onChange(patchItem(value, key, { label: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">満点</label>
                <input
                  type="number"
                  min={0}
                  value={it.maxPoints}
                  onChange={(e) =>
                    onChange(
                      patchItem(value, key, { maxPoints: Math.max(0, parseInt(e.target.value, 10) || 0) }),
                    )
                  }
                  className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1">入力</label>
                  <select
                    value={it.inputType}
                    onChange={(e) => {
                      const inputType = e.target.value === 'choice' ? 'choice' : 'free';
                      onChange(
                        patchItem(value, key, {
                          inputType,
                          ...(inputType === 'choice'
                            ? {}
                            : isCaskOrRegion
                              ? {
                                  freeValueType: 'string',
                                  freeGrading: it.freeGrading === 'manual' ? 'manual' : 'auto',
                                }
                              : {
                                  freeValueType: it.freeValueType || 'string',
                                  freeGrading: it.freeGrading || 'auto',
                                }),
                        }),
                      );
                    }}
                    className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                  >
                    <option value="choice">選択式</option>
                    <option value="free">自由入力</option>
                  </select>
                </div>

                {it.inputType === 'free' && isCaskOrRegion && (
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">値の種類</label>
                    <p className="text-sm text-stone-300 px-3 py-2 bg-neutral-700/60 border border-white/10 rounded-lg">
                      文字列のみ
                    </p>
                  </div>
                )}

                {it.inputType === 'free' && !isCaskOrRegion && (
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1">値の種類</label>
                    <select
                      value={it.freeValueType || 'string'}
                      onChange={(e) => {
                        const v = e.target.value;
                        const freeValueType =
                          v === 'int' || v === 'decimal1' || v === 'string' ? v : 'string';
                        onChange(patchItem(value, key, { freeValueType }));
                      }}
                      className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                    >
                      <option value="int">整数</option>
                      <option value="decimal1">小数第1位</option>
                      <option value="string">文字列</option>
                    </select>
                  </div>
                )}

                {it.inputType === 'free' && (
                  <div className={isCaskOrRegion ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-stone-400 mb-1">自動/手動採点</label>
                    <select
                      value={it.freeGrading || 'auto'}
                      onChange={(e) => {
                        const freeGrading = e.target.value === 'manual' ? 'manual' : 'auto';
                        onChange(patchItem(value, key, { freeGrading }));
                      }}
                      className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                    >
                      <option value="auto">自動（真値との差で減点・または文字一致）</option>
                      <option value="manual">手動（プレゼンター採点）</option>
                    </select>
                  </div>
                )}
              </div>

              {it.inputType === 'free' &&
                it.freeGrading === 'auto' &&
                !isCaskOrRegion &&
                (it.freeValueType === 'int' || it.freeValueType === 'decimal1') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">誤差1単位（年・%など）</label>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={it.penaltyStep ?? 1}
                        onChange={(e) =>
                          onChange(
                            patchItem(value, key, {
                              penaltyStep: Math.max(0.1, parseFloat(e.target.value) || 1),
                            }),
                          )
                        }
                        className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1">1単位ごとの減点</label>
                      <input
                        type="number"
                        min={0}
                        value={it.penaltyPointsPerStep ?? 1}
                        onChange={(e) =>
                          onChange(
                            patchItem(value, key, {
                              penaltyPointsPerStep: Math.max(0, parseFloat(e.target.value) || 0),
                            }),
                          )
                        }
                        className="w-full px-3 py-2 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}

              {key === 'cask' && (
                <ChoiceOptionsRows
                  options={it.options ?? []}
                  onChange={(next) => onChange(patchItem(value, key, { options: next }))}
                  addLabel="+ 選択肢を追加（カスク）"
                />
              )}

              {key === 'region' && (
                <ChoiceOptionsRows
                  options={it.options ?? []}
                  onChange={(next) => onChange(patchItem(value, key, { options: next }))}
                  addLabel="+ 選択肢を追加（地域）"
                />
              )}

              {it.inputType === 'choice' && key !== 'cask' && key !== 'region' && (
                <ChoiceOptionsRows
                  options={it.options || []}
                  onChange={(next) => onChange(patchItem(value, key, { options: next }))}
                  addLabel="+ 選択肢を追加"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
