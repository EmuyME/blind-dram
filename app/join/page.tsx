"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhaseBanner } from '@/components/common/PhaseBanner';
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
      const response = await fetch(`/api/session/get-by-code?join_code=${encodeURIComponent(joinCode.trim().toUpperCase())}`);
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '参加コードが見つかりません', 'error');
        setIsLoading(false);
        return;
      }

      // join_tokenを取得して参加ページにリダイレクト
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
    <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
      <PhaseBanner sessionState="registering" mode="sequential" />

      <div className="max-w-md mx-auto mt-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 mb-6 tracking-tight">参加コードで参加</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="joinCode" className="block text-base md:text-lg font-medium text-stone-100 mb-2">
              参加コード
            </label>
            <input
              id="joinCode"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base md:text-lg min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all uppercase"
              placeholder="例: ABC12"
              maxLength={6}
              required
            />
            <p className="text-sm text-stone-400 mt-2">
              オーナーから提供された参加コードを入力してください
            </p>
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

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-sm text-stone-400 text-center mb-4">
            新しいイベントを作成する方はこちら
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push('/create')}
            className="w-full"
          >
            イベントを作成
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


