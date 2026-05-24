'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export interface NextActionFocusProps {
  /** ヘッダー上段（例: Sample B） */
  headerKicker?: string;
  /** ヘッダー下段（例: 逐次モード · 進行中） */
  headerMeta?: string;
  /** 見出し上の短いラベル（例: あなたの番です） */
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  /** テキストリンク風の副操作 */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  note?: string;
  footer?: ReactNode;
}

export function NextActionFocus({
  headerKicker,
  headerMeta,
  eyebrow,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  note,
  footer,
}: NextActionFocusProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {(headerKicker || headerMeta) && (
        <div className="px-4 py-3 border-b text-center shrink-0" style={{ borderColor: 'var(--bd-border)' }}>
          {headerKicker && <p className="text-xs text-stone-500">{headerKicker}</p>}
          {headerMeta && <p className="text-sm text-stone-300">{headerMeta}</p>}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 pb-8">
        {icon && <div className="mb-4">{icon}</div>}
        {eyebrow && <p className="text-stone-500 text-sm mb-2">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold text-stone-100 text-center mb-2">{title}</h2>
        {description && (
          <p className="text-stone-400 text-sm text-center mb-10 leading-relaxed max-w-sm">
            {description}
          </p>
        )}

        {primaryAction && (
          <Button
            variant="primary"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="w-full max-w-[280px] py-4 text-lg font-semibold rounded-2xl min-h-[56px]"
          >
            {primaryAction.label}
          </Button>
        )}

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="mt-4 text-sm text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}

        {note && <p className="text-sm text-stone-500 mt-4 text-center">{note}</p>}
      </div>

      {footer && <div className="px-4 pb-6 shrink-0">{footer}</div>}
    </div>
  );
}

export function PresenterFocusIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-bd-accent/15 border border-bd-accent/45 flex items-center justify-center">
      <span className="text-2xl text-bd-accent font-semibold">P</span>
    </div>
  );
}

export function sessionModeLabel(mode: 'sequential' | 'simultaneous'): string {
  return mode === 'sequential' ? '逐次モード' : '同時モード';
}
