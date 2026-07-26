'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const SECTIONS: Array<{ title: string; body: ReactNode }> = [
  {
    title: '役割',
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>
          <span className="text-stone-200 font-medium">司会（オーナー）</span>
          — 作成・締切・順番・公開。オーナーURLは司会だけが開く。
        </li>
        <li>
          <span className="text-stone-200 font-medium">参加者</span>
          — 参加リンク／コードで入室し、回答する。
        </li>
        <li>
          <span className="text-stone-200 font-medium">プレゼンター</span>
          — 持ち込み主。正解入力とラウンド進行を担当。
        </li>
      </ul>
    ),
  },
  {
    title: '司会の流れ',
    body: (
      <ol className="space-y-2 list-decimal pl-5">
        <li>
          <Link href="/create" className="text-bd-accent hover:underline">
            イベントを作成
          </Link>
          し、参加URL／QR／コードを共有する。
        </li>
        <li>登録が揃ったら締切 → 順番を決めてセッション開始。</li>
        <li>各ラウンドで正解・採点・完了。全終了後に結果を公開。</li>
        <li>逐次＝サンプルごと途中結果。一斉＝最後にまとめて公開。</li>
      </ol>
    ),
  },
  {
    title: '参加者の流れ',
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>
          リンクを開くか、
          <Link href="/join" className="text-bd-accent hover:underline">
            参加コード
          </Link>
          を入力。
        </li>
        <li>表示名・持ち込みを登録して回答する。端末が変わったら名前で復帰できる。</li>
      </ul>
    ),
  },
  {
    title: 'うまく動かないとき',
    body: (
      <ul className="space-y-2 list-disc pl-5">
        <li>参加コードと参加URLは別物です。</li>
        <li>設定・締切はオーナーURLからのみ操作できます。</li>
        <li>別端末ではセッションホームから以前の名前を選んで復帰します。</li>
      </ul>
    ),
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-300">
            ← トップ
          </Link>
          <h1 className="ui-h1">使い方</h1>
          <p className="text-sm text-stone-400 leading-relaxed">
            ブラインドテイスティング会の進行に必要な最低限の手順です。
          </p>
        </header>

        <div className="ui-card divide-y divide-white/10 overflow-hidden">
          {SECTIONS.map((section) => (
            <details key={section.title} className="group">
              <summary className="cursor-pointer list-none px-5 py-4 min-h-[44px] flex items-center justify-between gap-3 text-stone-100 font-medium hover:bg-neutral-700/40">
                <span>{section.title}</span>
                <span className="text-stone-500 text-sm group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-stone-300 leading-relaxed">{section.body}</div>
            </details>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/create" className="flex-1">
            <Button variant="primary" className="w-full">
              イベントを作成
            </Button>
          </Link>
          <Link href="/join" className="flex-1">
            <Button variant="secondary" className="w-full">
              参加コードで参加
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
