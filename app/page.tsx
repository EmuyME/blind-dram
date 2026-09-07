'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden">
      {/* Full-bleed atmosphere: walnut bar + amber dram glow */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#2a1f18_0%,#1a1410_55%,#120e0b_100%)]" />
        <div className="absolute inset-0 bd-grain opacity-[0.35]" />
        <div className="absolute -top-[20%] right-[-10%] h-[70vmin] w-[70vmin] rounded-full bg-[radial-gradient(circle,rgba(196,165,116,0.22)_0%,transparent_68%)] bd-glow-breathe" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[85vmin] w-[85vmin] rounded-full bg-[radial-gradient(circle,rgba(61,46,31,0.55)_0%,transparent_62%)]" />

        {/* Dominant visual: stylized dram glass */}
        <div className="absolute inset-x-0 bottom-[8%] flex justify-center sm:bottom-[6%] md:justify-end md:pr-[8%] lg:pr-[12%]">
          <div className="relative h-[42vh] w-[min(42vw,220px)] min-h-[220px] max-h-[420px] bd-dram-enter">
            <div className="absolute inset-x-[18%] top-[8%] bottom-[6%] rounded-b-[48%_48%_42%_42%/18%_18%_58%_58%] border border-[#c9b896]/28 bg-gradient-to-b from-white/[0.07] via-transparent to-black/20 backdrop-blur-[1px]" />
            <div className="absolute inset-x-[24%] bottom-[10%] top-[42%] overflow-hidden rounded-b-[46%_46%_40%_40%/12%_12%_70%_70%]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#c4a574]/75 via-[#8b5a2b]/80 to-[#3d2e1f]/90 bd-liquid-shimmer" />
              <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-[#f5ebe0]/35 to-transparent" />
            </div>
            <div className="absolute inset-x-[28%] top-[10%] h-[10%] rounded-full border border-white/15 bg-white/[0.04]" />
          </div>
        </div>
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col justify-end px-5 pb-16 pt-20 sm:px-8 sm:pb-20 md:justify-center md:pb-24">
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
      </main>
    </div>
  );
}
