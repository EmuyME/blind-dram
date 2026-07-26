'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
      <main className="ui-card max-w-xl w-full p-8 md:p-12">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-100 tracking-tight">
            Blind Dram
          </h1>
          <p className="mt-3 text-base md:text-lg text-stone-400 leading-relaxed">
            ブラインドテイスティング会のデジタル司会
          </p>
          <div className="mt-10 space-y-3">
            <Link href="/create" className="block">
              <Button variant="primary" className="w-full">
                イベントを作成する
              </Button>
            </Link>
            <Link href="/join" className="block">
              <Button variant="secondary" className="w-full">
                参加コードで参加
              </Button>
            </Link>
            <Link
              href="/guide"
              className="inline-block pt-2 text-sm text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline"
            >
              使い方を見る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
