"use client";

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { BroughtCountInput } from '@/components/common/BroughtCountInput';
import { setParticipantToken, getParticipantToken, getOwnerToken } from '@/lib/utils';
import { defaultBottleLabel } from '@/lib/default-bottle-label';
import { displayBottleCount } from '@/lib/display-count';

interface Session {
  id: string;
  title: string;
  mode: 'sequential' | 'simultaneous';
  state: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published';
  join_code?: string | null;
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
          <div className="max-w-md mx-auto mt-8">
            <p className="text-center text-stone-400">読み込み中...</p>
          </div>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}

function JoinPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';
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
  const [rejoinParticipantToken, setRejoinParticipantToken] = useState<string | null>(null);

  useEffect(() => {
    if (joinToken) {
      const existingToken = getParticipantToken(joinToken);
      if (existingToken && !isEditMode) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- マウント時のみ joinToken / 修正モードで再実行
  }, [joinToken, isEditMode, router]);
  
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

  useEffect(() => {
    if (!joinToken || !isEditMode) return;
    const t = getParticipantToken(joinToken);
    if (!t) {
      showToast('参加登録の修正には、この端末で保存された参加トークンが必要です', 'error');
      return;
    }
    setRejoinParticipantToken(t);

    const load = async () => {
      try {
        const meRes = await fetch(
          `/api/participants/me?join_token=${encodeURIComponent(joinToken)}&participant_token=${encodeURIComponent(t)}`,
        );
        const meJson = await meRes.json();
        if (!meRes.ok) {
          showToast(meJson.error || '登録内容の読み込みに失敗しました', 'error');
          return;
        }
        const me = meJson.data as { display_name: string; brought_count: number };
        setDisplayName(me.display_name || '');
        const count = displayBottleCount(me.brought_count);
        setBroughtCount(count);

        const samplesRes = await fetch(
          `/api/session/my-samples?join_token=${encodeURIComponent(joinToken)}&participant_token=${encodeURIComponent(t)}`,
        );
        const samplesJson = await samplesRes.json();
        if (samplesRes.ok && Array.isArray(samplesJson.data) && samplesJson.data.length > 0) {
          const sorted = [...(samplesJson.data as { label: string; sort_order: number }[])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          );
          setBottleLabels(sorted.map((s) => s.label));
        } else if (count > 0) {
          const name = (me.display_name || '').trim();
          const defaults = Array.from({ length: count }, (_, i) => defaultBottleLabel(name, i));
          setBottleLabels(defaults);
        } else {
          setBottleLabels([]);
        }
      } catch (e) {
        console.error(e);
        showToast('ネットワークエラーが発生しました', 'error');
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinToken, isEditMode]);

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
    // bottleLabels配列を調整（デフォルトは「表示名 + 連番」）
    const newLabels = [...bottleLabels];
    while (newLabels.length < count) {
      const index = newLabels.length;
      newLabels.push(defaultBottleLabel(displayName, index));
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

    if (isEditMode && !rejoinParticipantToken) {
      showToast('登録内容を読み込み中です。しばらく待ってから再度お試しください', 'error');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      
      const payload: Record<string, unknown> = {
        join_token: joinToken,
        display_name: displayName,
        is_attending: true,
        brought_count: broughtCount,
        bottle_labels: bottleLabels.filter((label) => label.trim()),
      };
      if (isEditMode && rejoinParticipantToken) {
        payload.rejoin_participant_token = rejoinParticipantToken;
      }

      const response = await fetch('/api/participants/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();


      if (!response.ok) {
        showToast(result.error || '参加登録に失敗しました', 'error');
        setIsSubmitting(false);
        return;
      }

      const { participant_token } = result.data;
      setParticipantToken(joinToken, participant_token);
      
      
      showToast(isEditMode ? '参加登録を更新しました' : '参加登録が完了しました', 'success');
      
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
        {isEditMode && (
          <p className="text-sm text-stone-400 mb-4 leading-relaxed">
            参加登録内容を修正しています。保存すると新しい参加トークンがこの端末に記録されます。
          </p>
        )}
        
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
            <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
              このイベント内で既に使われている表示名は登録できません（前後の空白は無視して比較します）。
            </p>
          </div>

          <div>
            <label htmlFor="broughtCount" className="block text-base md:text-lg font-medium text-stone-100 mb-2">
              持参するボトル数
            </label>
            <BroughtCountInput
              id="broughtCount"
              value={broughtCount}
              onChange={handleBroughtCountChange}
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
                  placeholder={defaultBottleLabel(displayName, index)}
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
            {isSubmitting ? '保存中...' : isEditMode ? '変更を保存' : '参加登録する'}
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
