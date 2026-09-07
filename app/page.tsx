'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

function DramGlass({ idPrefix }: { idPrefix: string }) {
  const glass = `${idPrefix}-glass`;
  const liquid = `${idPrefix}-liquid`;
  const meniscus = `${idPrefix}-meniscus`;
  const bowl = `${idPrefix}-bowl`;

  return (
    <svg
      viewBox="0 0 160 280"
      className="h-[min(48vh,420px)] w-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)] bd-dram-enter"
      aria-hidden
    >
      <defs>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(245,235,224,0.22)" />
          <stop offset="45%" stopColor="rgba(245,235,224,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
        </linearGradient>
        <linearGradient id={liquid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0c48a" />
          <stop offset="30%" stopColor="#c4a574" />
          <stop offset="70%" stopColor="#8b5a2b" />
          <stop offset="100%" stopColor="#3d2e1f" />
        </linearGradient>
        <linearGradient id={meniscus} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(245,235,224,0.5)" />
          <stop offset="100%" stopColor="rgba(245,235,224,0)" />
        </linearGradient>
        <clipPath id={bowl}>
          <path d="M40 70 C36 120 34 168 58 214 C72 240 88 248 80 268 C72 248 88 240 102 214 C126 168 124 120 120 70 Z" />
        </clipPath>
      </defs>

      <ellipse cx="80" cy="272" rx="30" ry="4.5" fill="rgba(0,0,0,0.4)" />

      <path
        d="M34 52 C30 120 28 170 56 220 C72 248 88 256 80 274 C72 256 88 248 104 220 C132 170 130 120 126 52"
        fill={`url(#${glass})`}
        stroke="rgba(201,184,150,0.5)"
        strokeWidth="1.75"
      />

      <g clipPath={`url(#${bowl})`} className="bd-liquid-shimmer">
        <rect x="28" y="118" width="104" height="160" fill={`url(#${liquid})`} />
        <rect x="28" y="118" width="104" height="30" fill={`url(#${meniscus})`} />
      </g>

      <ellipse
        cx="80"
        cy="52"
        rx="46"
        ry="10"
        fill="rgba(245,235,224,0.06)"
        stroke="rgba(245,235,224,0.4)"
        strokeWidth="1.5"
      />
      <path
        d="M42 58 C50 74 70 82 80 82 C90 82 110 74 118 58"
        fill="none"
        stroke="rgba(245,235,224,0.14)"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#2a1f18_0%,#1a1410_55%,#120e0b_100%)]" />
        <div className="absolute inset-0 bd-grain opacity-[0.35]" />
        <div className="absolute -top-[20%] right-[-10%] h-[70vmin] w-[70vmin] rounded-full bg-[radial-gradient(circle,rgba(196,165,116,0.22)_0%,transparent_68%)] bd-glow-breathe" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[85vmin] w-[85vmin] rounded-full bg-[radial-gradient(circle,rgba(61,46,31,0.55)_0%,transparent_62%)]" />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-[4%] z-0 flex justify-center opacity-50 md:hidden"
        aria-hidden
      >
        <DramGlass idPrefix="bd-m" />
      </div>

      <main className="relative z-10 mx-auto grid min-h-[100dvh] max-w-6xl grid-cols-1 items-end px-5 pb-16 pt-20 sm:px-8 sm:pb-20 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:gap-10 md:pb-24 lg:gap-14">
        <div className="max-w-xl bd-rise" style={{ animationDelay: '60ms' }}>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-bd-brand/90 sm:text-xs">
            Blind tasting host
          </p>
          <h1 className="ui-display text-[clamp(2.75rem,12vw,5.25rem)] font-semibold leading-[0.92] tracking-tight text-stone-50">
            Blind Dram
          </h1>
          <p
            className="mt-5 max-w-md text-base leading-relaxed text-stone-300/90 sm:text-lg bd-rise"
            style={{ animationDelay: '180ms' }}
          >
            ブラインドテイスティング会のデジタル司会
          </p>

          <div
            className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:items-center bd-rise"
            style={{ animationDelay: '300ms' }}
          >
            <Link href="/create" className="sm:min-w-[220px]">
              <Button variant="primary" className="w-full">
                イベントを作成する
              </Button>
            </Link>
            <Link href="/join" className="sm:min-w-[200px]">
              <Button variant="secondary" className="w-full">
                参加コードで参加
              </Button>
            </Link>
          </div>

          <p className="mt-6 bd-rise" style={{ animationDelay: '420ms' }}>
            <Link
              href="/guide"
              className="text-sm text-stone-500 underline-offset-4 transition-colors hover:text-stone-300 hover:underline"
            >
              使い方を見る
            </Link>
          </p>
        </div>

        <div className="pointer-events-none hidden justify-center md:flex md:justify-end md:pr-2 lg:pr-6" aria-hidden>
          <DramGlass idPrefix="bd-d" />
        </div>
      </main>
    </div>
  );
}
