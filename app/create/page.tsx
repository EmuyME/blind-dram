"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      
      // オーナートークンをlocalStorageに保存
      if (owner_token && join_token) {
        setOwnerToken(join_token, owner_token);
      }
      
      // オーナーページにリダイレクト
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
    <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
      <div className="max-w-md mx-auto mt-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 mb-6 tracking-tight">新しいイベントを作成</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-base md:text-lg font-medium text-stone-100 mb-2">
              イベント名
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base md:text-lg min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder="例: 2024年新年会"
              required
            />
          </div>

          <div>
            <label className="block text-base md:text-lg font-medium text-stone-100 mb-2">
              回答モード
            </label>
            <div className="space-y-2">
              <label className="flex items-center min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="sequential"
                  checked={mode === 'sequential'}
                  onChange={(e) => setMode(e.target.value as 'sequential' | 'simultaneous')}
                  className="mr-3 w-5 h-5 accent-[#C88A2B]"
                />
                <span className="text-base md:text-lg text-stone-100">逐次モード（1つずつ回答）</span>
              </label>
              <label className="flex items-center min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="simultaneous"
                  checked={mode === 'simultaneous'}
                  onChange={(e) => setMode(e.target.value as 'sequential' | 'simultaneous')}
                  className="mr-3 w-5 h-5 accent-[#C88A2B]"
                />
                <span className="text-base md:text-lg text-stone-100">一斉モード（全員同時回答）</span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !title.trim()}
            className="w-full"
          >
            {isSubmitting ? '作成中...' : 'イベントを作成'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-sm text-stone-400 text-center mb-4">
            参加コードをお持ちの方はこちら
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push('/join')}
            className="w-full"
          >
            参加コードで参加
          </Button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}


