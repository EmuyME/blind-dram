'use client';

import type { ReactNode } from 'react';

export function UiTabList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={`ui-tablist ${className}`.trim()}>
      {children}
    </div>
  );
}

export function UiTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`ui-tab ${active ? 'ui-tab-active' : ''}`.trim()}
    >
      {children}
    </button>
  );
}
