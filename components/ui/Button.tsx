"use client";

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', disabled, ...props }: ButtonProps) {
  const baseClasses =
    'min-h-[44px] px-6 py-3 rounded-xl font-medium transition-all duration-200 ease-in-out focus-visible:outline-none';

  const variantClasses = {
    primary: disabled
      ? 'bg-neutral-700 text-stone-500 cursor-not-allowed opacity-50'
      : 'bg-bd-accent hover:bg-bd-accent-hover active:bg-bd-accent-active active:scale-[0.98] text-bd-accent-foreground shadow-lg shadow-black/30 focus-visible:ring-2 focus-visible:ring-bd-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900',
    secondary: disabled
      ? 'bg-transparent text-stone-500 cursor-not-allowed opacity-50 border border-white/10'
      : 'bg-transparent hover:bg-white/5 active:bg-white/[0.07] active:scale-[0.98] text-stone-100 border border-white/15 focus-visible:ring-2 focus-visible:ring-bd-accent/40',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
