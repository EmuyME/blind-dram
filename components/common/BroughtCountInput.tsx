'use client';

type Props = {
  id: string;
  value: number;
  onChange: (n: number) => void;
  className?: string;
  min?: number;
  max?: number;
};

/**
 * 持ち込み本数。モバイルで type="number" が 01 のように見えたり操作しづらいことがあるため、
 * numeric キーボード付きの text で整数のみ受け付ける。
 */
export function BroughtCountInput({
  id,
  value,
  onChange,
  className,
  min = 0,
  max = 99,
}: Props) {
  const clamped = Math.min(max, Math.max(min, Math.floor(Number.isFinite(value) ? value : 0)));
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="done"
      pattern="[0-9]*"
      value={String(clamped)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits === '') {
          onChange(min);
          return;
        }
        const n = parseInt(digits, 10);
        if (!Number.isNaN(n)) {
          onChange(Math.min(max, Math.max(min, n)));
        }
      }}
      className={className}
    />
  );
}
