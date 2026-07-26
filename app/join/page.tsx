'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';

export default function JoinByCodePage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinCode.trim()) {
      showToast('参加コードを入力してください', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/session/get-by-code?join_code=${encodeURIComponent(joinCode.trim().toUpperCase())}`,
      );
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '参加コードが見つかりません', 'error');
        return;
      }

      const { join_token } = result.data;
      if (join_token) {
        router.push(`/s/${join_token}`);
      } else {
        showToast('参加コードが見つかりません', 'error');
      }
    } catch (error) {
      console.error('Join by code error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-20 px-4">
      <div className="max-w-md mx-auto mt-8">
        <h1 className="ui-h1 mb-6">参加コードで参加</h1>

        <form onSubmit={handleSubmit} className="ui-card p-6 space-y-5">
          <div>
            <label htmlFor="joinCode" className="block text-sm font-medium text-stone-200 mb-2">
              参加コード
            </label>
            <input
              id="joinCode"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-neutral-900/50 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-xl text-base min-h-[44px] focus:border-bd-accent/50 focus:ring-2 focus:ring-bd-accent/30 transition-all uppercase tracking-wider font-mono"
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !joinCode.trim()}
            className="w-full"
          >
            {isLoading ? '確認中...' : '参加する'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          イベントを作る方は{' '}
          <Link href="/create" className="text-stone-300 underline-offset-2 hover:underline">
            こちら
          </Link>
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
