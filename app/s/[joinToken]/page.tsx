"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { setParticipantToken, getParticipantToken, getOwnerToken } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  mode: 'sequential' | 'simultaneous';
  state: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published';
  join_code?: string | null;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const [joinToken, setJoinToken] = useState<string>('');

  useEffect(() => {
    if (params && typeof params.joinToken === 'string') {
      setJoinToken(params.joinToken);
    }
  }, [params]);

  const { toast, showToast, hideToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [broughtCount, setBroughtCount] = useState(0);
  const [bottleLabels, setBottleLabels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setOwnerTokenState] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (joinToken) {
      // 既に参加登録済みの場合は自動的にリダイレクト
      const existingToken = getParticipantToken(joinToken);
      if (existingToken) {
        router.push(`/session/${joinToken}`);
        return;
      }
      
      loadSession();
      
      // オーナートークンを取得
      const storedOwnerToken = getOwnerToken(joinToken);
      if (storedOwnerToken) {
        setOwnerTokenState(storedOwnerToken);
        checkOwnerStatus(storedOwnerToken);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- マウント時のみ joinToken で再実行
  }, [joinToken]);
  
  // オーナーかどうかをチェック
  const checkOwnerStatus = async (token: string) => {
    if (!joinToken || !token) return;
    
    try {
      const response = await fetch(`/api/session/check-owner?join_token=${joinToken}&owner_token=${token}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setIsOwner(result.data.is_owner);
      }
    } catch (error) {
      console.error('Check owner status error:', error);
    }
  };

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/session/get?join_token=${joinToken}`);
      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Session取得に失敗しました', 'error');
        return;
      }

      setSession(result.data);
    } catch (error) {
      console.error('Load error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroughtCountChange = (count: number) => {
    setBroughtCount(count);
    // bottleLabels配列を調整（デフォルト値としてSample A, B, C...を設定）
    const newLabels = [...bottleLabels];
    while (newLabels.length < count) {
      const index = newLabels.length;
      const defaultLabel = `Sample ${String.fromCharCode(65 + index)}`; // A, B, C, ...
      newLabels.push(defaultLabel);
    }
    while (newLabels.length > count) {
      newLabels.pop();
    }
    setBottleLabels(newLabels);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinToken) {
      showToast('参加URLが無効です', 'error');
      return;
    }
    
    if (!displayName.trim()) {
      showToast('表示名を入力してください', 'error');
      return;
    }

    if (broughtCount > 0 && bottleLabels.some(label => !label.trim())) {
      showToast('持参するボトルのラベルをすべて入力してください', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      
      const response = await fetch('/api/participants/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          join_token: joinToken,
          display_name: displayName,
          is_attending: true,
          brought_count: broughtCount,
          bottle_labels: bottleLabels.filter(label => label.trim()),
        }),
      });

      const result = await response.json();


      if (!response.ok) {
        showToast(result.error || '参加登録に失敗しました', 'error');
        setIsSubmitting(false);
        return;
      }

      const { participant_token } = result.data;
      setParticipantToken(joinToken, participant_token);
      
      
      showToast('参加登録が完了しました', 'success');
      
      // 参加者ホームに即座にリダイレクト（setTimeoutを削除して即座に遷移）
      if (joinToken) {
        router.push(`/session/${joinToken}`);
      }
    } catch (error) {
      console.error('Join error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <div className="max-w-md mx-auto mt-8">
          <p className="text-center text-stone-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (session.state !== 'registering') {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加登録は締め切られています</h2>
            <p className="text-stone-400 mb-4 leading-relaxed">
              このイベントの参加登録は既に締め切られています。
            </p>
            <Button
              variant="primary"
              onClick={() => {
                if (joinToken) {
                  router.push(`/session/${joinToken}`);
                }
              }}
              className="w-full"
            >
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
      <PhaseBanner
        sessionState={session.state}
        mode={session.mode}
      />

      <div className="max-w-md mx-auto mt-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 mb-6 tracking-tight">{session.title}</h1>
        
        {/* オーナー向け：参加URLと参加コードの表示 */}
        {isOwner && (
          <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl shadow-black/40 p-6 mb-6">
            <h2 className="text-lg font-semibold text-stone-100 mb-4">参加URLを共有</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">参加URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/s/${joinToken}` : ''}
                    className="flex-1 px-4 py-2.5 bg-neutral-700 border border-white/10 rounded-xl text-stone-100 text-sm focus:outline-none"
                  />
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/s/${joinToken}` : '';
                      try {
                        await navigator.clipboard.writeText(url);
                        showToast('URLをクリップボードにコピーしました', 'success');
                      } catch {
                        showToast('コピーに失敗しました', 'error');
                      }
                    }}
                    className="text-sm"
                  >
                    コピー
                  </Button>
                </div>
              </div>
              {session.join_code && (
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">参加コード</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={session.join_code}
                      className="flex-1 px-4 py-2.5 bg-neutral-700 border border-white/10 rounded-xl text-stone-100 text-sm focus:outline-none"
                    />
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (session.join_code) {
                          try {
                            await navigator.clipboard.writeText(session.join_code);
                            showToast('参加コードをクリップボードにコピーしました', 'success');
                          } catch {
                            showToast('コピーに失敗しました', 'error');
                          }
                        }
                      }}
                      className="text-sm"
                    >
                      コピー
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="displayName" className="block text-base md:text-lg font-medium text-stone-100 mb-2">
              表示名
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base md:text-lg min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder="例: 山田太郎"
              required
            />
          </div>

          <div>
            <label htmlFor="broughtCount" className="block text-base md:text-lg font-medium text-stone-100 mb-2">
              持参するボトル数
            </label>
            <input
              id="broughtCount"
              type="number"
              min="0"
              value={broughtCount}
              onChange={(e) => handleBroughtCountChange(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 rounded-lg text-base md:text-lg min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          {broughtCount > 0 && (
            <div className="space-y-3">
              <label className="block text-base md:text-lg font-medium text-stone-100 mb-2">
                ボトルのラベル（順番通りに入力）
              </label>
              {Array.from({ length: broughtCount }).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  value={bottleLabels[index] || ''}
                  onChange={(e) => {
                    const newLabels = [...bottleLabels];
                    newLabels[index] = e.target.value;
                    setBottleLabels(newLabels);
                  }}
                  className="w-full px-4 py-3 bg-neutral-800 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base md:text-lg min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder={`Sample ${String.fromCharCode(65 + index)}`}
                  required
                />
              ))}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !displayName.trim()}
            className="w-full"
          >
            {isSubmitting ? '登録中...' : '参加登録する'}
          </Button>
        </form>
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
