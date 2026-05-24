"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
      <main className="ui-card max-w-xl w-full p-8 md:p-12">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-bd-accent/80 mb-3">Blind Dram</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-100 mb-4 tracking-tight">
            Blind Dram
          </h1>
          <p className="text-lg text-stone-400 mb-8 leading-relaxed">
            ブラインドテイスティング会を支援するデジタル司会
          </p>
          <div className="space-y-4">
            <Link
              href="/create"
              className="inline-block w-full md:w-auto"
            >
              <Button
                variant="primary"
                className="w-full md:w-auto min-w-[200px]"
              >
                イベントを作成する
              </Button>
            </Link>
            <Link
              href="/join"
              className="inline-block w-full md:w-auto"
            >
              <Button
                variant="secondary"
                className="w-full md:w-auto min-w-[200px]"
              >
                参加コードで参加
              </Button>
            </Link>
            <Link
              href="/guide"
              className="inline-block w-full md:w-auto"
            >
              <Button
                variant="secondary"
                className="w-full md:w-auto min-w-[200px] border-bd-accent/35 hover:border-bd-accent/55"
              >
                使い方・進行のヒント
              </Button>
            </Link>
            <p className="text-sm text-stone-400 mt-6">
              イベントを作成すると、参加URLとOwner URLが発行されます
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}


