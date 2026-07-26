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
    <div className="min-h-screen pt-8 pb-20 px-4">
      <div className="max-w-md mx-auto mt-8">
        <h1 className="ui-h1 mb-6">新しいイベント</h1>

        <form onSubmit={handleSubmit} className="ui-card p-6 space-y-5">
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
            <p className="block text-sm font-medium text-stone-200 mb-2">回答モード</p>
            <div className="space-y-1">
              <label className="flex items-center min-h-[44px] cursor-pointer gap-3">
                <input
                  type="radio"
                  name="mode"
                  value="sequential"
                  checked={mode === 'sequential'}
                  onChange={(e) => setMode(e.target.value as 'sequential' | 'simultaneous')}
                  className="w-4 h-4 accent-bd-accent"
                />
                <span className="text-stone-100 text-sm">逐次（サンプルごと）</span>
              </label>
              <label className="flex items-center min-h-[44px] cursor-pointer gap-3">
                <input
                  type="radio"
                  name="mode"
                  value="simultaneous"
                  checked={mode === 'simultaneous'}
                  onChange={(e) => setMode(e.target.value as 'sequential' | 'simultaneous')}
                  className="w-4 h-4 accent-bd-accent"
                />
                <span className="text-stone-100 text-sm">一斉（最後にまとめて）</span>
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

        <p className="mt-6 text-center text-sm text-stone-500">
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
