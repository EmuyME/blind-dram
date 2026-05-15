"use client";

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', disabled, ...props }: ButtonProps) {
  const baseClasses = 'min-h-[44px] px-6 py-3 rounded-xl font-medium transition-all duration-200 ease-in-out focus-visible:outline-none';
  
  const variantClasses = {
    primary: disabled
      ? 'bg-neutral-700 text-stone-500 cursor-not-allowed opacity-50'
      : 'bg-[#C88A2B] hover:bg-[#D79A3D] active:bg-[#B97B1F] active:scale-[0.98] text-black/90 shadow-lg shadow-black/40 focus-visible:ring-2 focus-visible:ring-[#C88A2B] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900',
    secondary: disabled
      ? 'bg-neutral-800 text-stone-500 cursor-not-allowed opacity-50 border border-white/10'
      : 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 active:scale-[0.98] text-stone-100 border border-white/10 focus-visible:ring-2 focus-visible:ring-white/25',
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
