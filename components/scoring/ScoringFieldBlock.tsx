'use client';

import type { ScoringItemConfig, ScoringItemKey } from '@/lib/scoring-schema';
import { optionsForItem } from '@/lib/scoring-schema';
import { DistilleryPickerAssist } from '@/components/common/DistilleryPickerAssist';
import { NumericFreeInput } from '@/components/scoring/NumericFreeInput';

export type GuessBundle = {
  guessed_cask?: string;
  guessed_region?: string;
  guessed_age?: string | number;
  guessed_abv?: string | number;
  guessed_distillery?: string;
  guessed_other1?: string;
  guessed_other2?: string;
};

export type TruthBundle = {
  true_cask?: string;
  true_region?: string;
  true_age?: string | number;
  true_abv?: string | number;
  true_distillery?: string;
  true_other1?: string;
  true_other2?: string;
};

type PropsGuess = {
  mode: 'guess';
  itemKey: ScoringItemKey;
  cfg: ScoringItemConfig;
  caskOptions: string[];
  regionOptions: string[];
  value: GuessBundle;
  onChange: (next: GuessBundle) => void;
  disabled?: boolean;
};

type PropsTruth = {
  mode: 'truth';
  itemKey: ScoringItemKey;
  cfg: ScoringItemConfig;
  caskOptions: string[];
  regionOptions: string[];
  value: TruthBundle;
  onChange: (next: TruthBundle) => void;
  disabled?: boolean;
};

type Props = PropsGuess | PropsTruth;

function activeItem(cfg: ScoringItemConfig): boolean {
  return cfg.enabled && cfg.maxPoints > 0;
}

export function ScoringFieldBlock(props: Props) {
  const { itemKey, cfg, caskOptions, regionOptions, disabled } = props;
  if (!activeItem(cfg)) return null;

  const label = cfg.label || itemKey;
  const opts = optionsForItem(itemKey, cfg, caskOptions, regionOptions);

  if (props.mode === 'guess') {
    const { value, onChange } = props;
    switch (itemKey) {
      case 'cask':
        if (cfg.inputType === 'free') {
          return (
            <div>
              <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
              <input
                type="text"
                name="guessed_cask"
                autoComplete="off"
                value={value.guessed_cask || ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_cask: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              />
            </div>
          );
        }
        return (
          <div>
            <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
            <select
              name="guessed_cask"
              value={value.guessed_cask || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, guessed_cask: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      case 'region':
        if (cfg.inputType === 'free') {
          return (
            <div>
              <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
              <input
                type="text"
                name="guessed_region"
                autoComplete="off"
                value={value.guessed_region || ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_region: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              />
            </div>
          );
        }
        return (
          <div>
            <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
            <select
              name="guessed_region"
              value={value.guessed_region || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, guessed_region: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      case 'age':
        if (cfg.inputType === 'choice') {
          return (
            <div>
              <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
              <select
                name="guessed_age"
                value={value.guessed_age != null ? String(value.guessed_age) : ''}
                disabled={disabled}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...value,
                    guessed_age: v === '' ? undefined : v,
                  });
                }}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              >
                <option value="">選択してください</option>
                {opts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <NumericFreeInput
            name="guessed_age"
            label={label}
            value={value.guessed_age}
            disabled={disabled}
            decimal={cfg.freeValueType === 'decimal1'}
            min={0}
            onChange={(next) => onChange({ ...value, guessed_age: next })}
          />
        );
      case 'abv':
        if (cfg.inputType === 'choice') {
          return (
            <div>
              <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
              <select
                name="guessed_abv"
                value={value.guessed_abv != null ? String(value.guessed_abv) : ''}
                disabled={disabled}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...value,
                    guessed_abv: v === '' ? undefined : v,
                  });
                }}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              >
                <option value="">選択してください</option>
                {opts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <NumericFreeInput
            name="guessed_abv"
            label={label}
            value={value.guessed_abv}
            disabled={disabled}
            decimal={cfg.freeValueType !== 'int'}
            min={0}
            max={100}
            onChange={(next) => onChange({ ...value, guessed_abv: next })}
          />
        );
      case 'distillery':
        if (cfg.inputType === 'choice') {
          return (
            <div>
              <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
              <div className="flex gap-2 items-stretch">
                <div className="flex-1 min-w-0">
                  <select
                    name="guessed_distillery"
                    value={value.guessed_distillery || ''}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, guessed_distillery: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
                  >
                    <option value="">選択してください</option>
                    {opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <DistilleryPickerAssist
                  disabled={disabled}
                  hintRegion={value.guessed_region}
                  onApply={(name) => onChange({ ...value, guessed_distillery: name })}
                />
              </div>
            </div>
          );
        }
        return (
          <div>
            <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                name="guessed_distillery"
                value={value.guessed_distillery || ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_distillery: e.target.value })}
                placeholder="例: マッカラン"
                className="flex-1 min-w-0 px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              />
              <DistilleryPickerAssist
                disabled={disabled}
                hintRegion={value.guessed_region}
                onApply={(name) => onChange({ ...value, guessed_distillery: name })}
              />
            </div>
          </div>
        );
      case 'other1':
        return (
          <div>
            <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
            {cfg.inputType === 'choice' ? (
              <select
                name="guessed_other1"
                value={value.guessed_other1 || ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_other1: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              >
                <option value="">選択してください</option>
                {opts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={cfg.freeValueType === 'string' ? 'text' : 'number'}
                name="guessed_other1"
                step={cfg.freeValueType === 'decimal1' ? 0.1 : cfg.freeValueType === 'int' ? 1 : undefined}
                value={
                  cfg.freeValueType === 'string'
                    ? value.guessed_other1 || ''
                    : (value.guessed_other1 ?? '')
                }
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_other1: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              />
            )}
          </div>
        );
      case 'other2':
        return (
          <div>
            <label className="block text-base font-medium text-stone-100 mb-2">{label}</label>
            {cfg.inputType === 'choice' ? (
              <select
                name="guessed_other2"
                value={value.guessed_other2 || ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_other2: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              >
                <option value="">選択してください</option>
                {opts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={cfg.freeValueType === 'string' ? 'text' : 'number'}
                name="guessed_other2"
                step={cfg.freeValueType === 'decimal1' ? 0.1 : cfg.freeValueType === 'int' ? 1 : undefined}
                value={
                  cfg.freeValueType === 'string'
                    ? value.guessed_other2 || ''
                    : (value.guessed_other2 ?? '')
                }
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guessed_other2: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              />
            )}
          </div>
        );
      default:
        return null;
    }
  }

  const { value, onChange } = props;
  switch (itemKey) {
    case 'cask':
      if (cfg.inputType === 'free') {
        return (
          <div>
            <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
            <input
              type="text"
              name="true_cask"
              value={value.true_cask || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_cask: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            />
          </div>
        );
      }
      return (
        <div>
          <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
          <select
            name="true_cask"
            value={value.true_cask || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, true_cask: e.target.value })}
            className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case 'region':
      if (cfg.inputType === 'free') {
        return (
          <div>
            <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
            <input
              type="text"
              name="true_region"
              value={value.true_region || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_region: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            />
          </div>
        );
      }
      return (
        <div>
          <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
          <select
            name="true_region"
            value={value.true_region || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, true_region: e.target.value })}
            className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {opts.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case 'age':
      if (cfg.inputType === 'choice') {
        return (
          <div>
            <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
            <select
              name="true_age"
              value={value.true_age != null ? String(value.true_age) : ''}
              disabled={disabled}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...value,
                  true_age: v === '' ? undefined : v,
                });
              }}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      }
      return (
        <NumericFreeInput
          name="true_age"
          label={label}
          value={value.true_age}
          disabled={disabled}
          decimal={cfg.freeValueType === 'decimal1'}
          min={0}
          className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
          onChange={(next) => onChange({ ...value, true_age: next })}
        />
      );
    case 'abv':
      if (cfg.inputType === 'choice') {
        return (
          <div>
            <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
            <select
              name="true_abv"
              value={value.true_abv != null ? String(value.true_abv) : ''}
              disabled={disabled}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...value,
                  true_abv: v === '' ? undefined : v,
                });
              }}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      }
      return (
        <NumericFreeInput
          name="true_abv"
          label={label}
          value={value.true_abv}
          disabled={disabled}
          decimal={cfg.freeValueType !== 'int'}
          min={0}
          max={100}
          className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
          onChange={(next) => onChange({ ...value, true_abv: next })}
        />
      );
    case 'distillery':
      if (cfg.inputType === 'choice') {
        return (
          <div>
            <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
            <div className="flex gap-2 items-stretch">
              <div className="flex-1 min-w-0">
                <select
                  name="true_distillery"
                  value={value.true_distillery || ''}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, true_distillery: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
                >
                  <option value="">選択してください</option>
                  {opts.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <DistilleryPickerAssist
                disabled={disabled}
                hintRegion={value.true_region}
                onApply={(name) => onChange({ ...value, true_distillery: name })}
              />
            </div>
          </div>
        );
      }
      return (
        <div>
          <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              name="true_distillery"
              value={value.true_distillery || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_distillery: e.target.value })}
              placeholder="例: マッカラン"
              className="flex-1 min-w-0 px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            />
            <DistilleryPickerAssist
              disabled={disabled}
              hintRegion={value.true_region}
              onApply={(name) => onChange({ ...value, true_distillery: name })}
            />
          </div>
        </div>
      );
    case 'other1':
      return (
        <div>
          <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
          {cfg.inputType === 'choice' ? (
            <select
              name="true_other1"
              value={value.true_other1 || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_other1: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={cfg.freeValueType === 'string' ? 'text' : 'number'}
              name="true_other1"
              step={cfg.freeValueType === 'decimal1' ? 0.1 : cfg.freeValueType === 'int' ? 1 : undefined}
              value={
                cfg.freeValueType === 'string' ? value.true_other1 || '' : (value.true_other1 ?? '')
              }
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_other1: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            />
          )}
        </div>
      );
    case 'other2':
      return (
        <div>
          <label className="block text-sm font-semibold text-stone-100 mb-2">{label}</label>
          {cfg.inputType === 'choice' ? (
            <select
              name="true_other2"
              value={value.true_other2 || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_other2: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            >
              <option value="">選択してください</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={cfg.freeValueType === 'string' ? 'text' : 'number'}
              name="true_other2"
              step={cfg.freeValueType === 'decimal1' ? 0.1 : cfg.freeValueType === 'int' ? 1 : undefined}
              value={
                cfg.freeValueType === 'string' ? value.true_other2 || '' : (value.true_other2 ?? '')
              }
              disabled={disabled}
              onChange={(e) => onChange({ ...value, true_other2: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
            />
          )}
        </div>
      );
    default:
      return null;
  }
}
