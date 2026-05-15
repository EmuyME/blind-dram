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
    <div className="ui-card p-6">
      <h2 className="ui-h2 mb-2">{title}</h2>
      {description && <p className="text-base md:text-lg ui-muted mb-4 leading-relaxed">{description}</p>}
      {primaryAction && (
        <div>
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            variant="primary"
            className="w-full"
          >
            {primaryAction.disabled && primaryAction.disabledReason
              ? primaryAction.disabledReason
              : primaryAction.label}
          </Button>
        </div>
      )}
      {note && <p className="text-sm ui-muted mt-2">{note}</p>}
    </div>
  );
}
