import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blind Dram - ブラインドテイスティング会支援',
  description: 'ウイスキーブラインドテイスティング会を支援するデジタル司会',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased selection:bg-bd-accent/25 selection:text-stone-50">
        {children}
        <footer className="py-6 px-4 text-center" aria-label="著作権表記・クレジット">
          <p className="select-none text-[10px] font-extralight tracking-[0.18em] text-stone-500/42">
            <span className="text-stone-500/48">©</span>{' '}
            <time className="tabular-nums tracking-[0.12em] text-stone-500/38" dateTime="2026">
              2026
            </time>
            <span className="mx-1.5 text-stone-600/28" aria-hidden>
              ·
            </span>
            <span className="text-stone-400/50">Maltemuy</span>
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}


