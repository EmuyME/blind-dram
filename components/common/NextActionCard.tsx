"use client";

import { Button } from '@/components/ui/Button';

interface NextActionCardProps {
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
  };
  note?: string;
}

export function NextActionCard({ title, description, primaryAction, note }: NextActionCardProps) {
  return (
    <div className="ui-paper-card !p-5 sm:!p-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b7355] mb-2">次にやること</p>
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--bd-font-serif)' }}>
        {title}
      </h2>
      {description && (
        <p className="text-base md:text-lg text-[#5c4a32] mb-4 leading-relaxed">{description}</p>
      )}
      {primaryAction && (
        <div>
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            variant="primary"
            className="w-full !shadow-none"
          >
            {primaryAction.disabled && primaryAction.disabledReason
              ? primaryAction.disabledReason
              : primaryAction.label}
          </Button>
        </div>
      )}
      {note && <p className="text-sm text-[#8b7355] mt-2">{note}</p>}
    </div>
  );
}
