'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { setOwnerToken } from '@/lib/utils';

export default function CreatePage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'sequential' | 'simultaneous'>('sequential');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('イベント名を入力してください', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mode }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'イベント作成に失敗しました', 'error');
        return;
      }

      const { owner_token, join_token } = result.data;

      if (owner_token && join_token) {
        setOwnerToken(join_token, owner_token);
      }

      if (owner_token) {
        const nextUrl = join_token
          ? `/o/${owner_token}?join_token=${join_token}`
          : `/o/${owner_token}`;
        router.push(nextUrl);
      }
    } catch (error) {
      console.error('Create error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="ui-page-shell">
        <Link href="/" className="ui-kicker inline-block hover:text-bd-accent transition-colors">
          Blind Dram
        </Link>
        <h1 className="ui-h1 mb-2">新しいイベント</h1>
        <p className="mb-8 text-sm text-stone-400 leading-relaxed">
          会の名前と回答モードを決めて、司会を始めます。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-stone-200 mb-2">
              イベント名
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-900/50 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-xl text-base min-h-[44px] focus:border-bd-accent/50 focus:ring-2 focus:ring-bd-accent/30 transition-all"
              placeholder="例: 第12回 ブラインド会"
              required
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-stone-200 mb-3">回答モード</p>
            <div className="grid gap-2">
              <label
                className={`flex items-start min-h-[44px] cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  mode === 'sequential'
                    ? 'border-bd-accent/45 bg-bd-accent/10'
                    : 'border-white/10 bg-neutral-900/40 hover:bg-neutral-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="sequential"
                  checked={mode === 'sequential'}
                  onChange={(e) => setMode(e.target.value as 'sequential' | 'simultaneous')}
                  className="mt-1 w-4 h-4 accent-bd-accent"
                />
                <span>
                  <span className="block text-stone-100 text-sm font-medium">逐次</span>
                  <span className="block text-stone-500 text-xs mt-0.5">サンプルごとに途中結果</span>
                </span>
              </label>
              <label
                className={`flex items-start min-h-[44px] cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  mode === 'simultaneous'
                    ? 'border-bd-accent/45 bg-bd-accent/10'
                    : 'border-white/10 bg-neutral-900/40 hover:bg-neutral-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value="simultaneous"
                  checked={mode === 'simultaneous'}
                  onChange={(e) => setMode(e.target.value as 'sequential' | 'simultaneous')}
                  className="mt-1 w-4 h-4 accent-bd-accent"
                />
                <span>
                  <span className="block text-stone-100 text-sm font-medium">一斉</span>
                  <span className="block text-stone-500 text-xs mt-0.5">最後にまとめて公開</span>
                </span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !title.trim()}
            className="w-full"
          >
            {isSubmitting ? '作成中...' : '作成する'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-stone-500">
          参加コードがある方は{' '}
          <Link href="/join" className="text-stone-300 underline-offset-2 hover:underline">
            こちら
          </Link>
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
