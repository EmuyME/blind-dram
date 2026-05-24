'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { setParticipantToken, setOwnerToken } from '@/lib/utils';
import { disambiguatedDisplayName } from '@/lib/participant-display';

type ParticipantRow = {
  id: string;
  display_name: string;
  brought_count: number;
};

type Props = {
  joinToken: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  /** 復帰後の遷移先。省略時は /session/:joinToken */
  redirectTo?: string;
  /** 復帰成功時のコールバック（遷移しない場合に使用） */
  onRecovered?: (participantToken: string, displayName: string) => void;
  /** オーナーURL入力欄を表示する */
  showOwnerRecovery?: boolean;
  /** 「おかえりなさい」見出しを表示する */
  showWelcomeHeader?: boolean;
  className?: string;
};

function parseOwnerTokenFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/o\/([a-f0-9-]+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^[a-f0-9-]{36}$/i.test(trimmed)) return trimmed;
  return null;
}

function nameInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  return trimmed[0];
}

export function ParticipantRecoveryPicker({
  joinToken,
  showToast,
  redirectTo,
  onRecovered,
  showOwnerRecovery = true,
  showWelcomeHeader = true,
  className = '',
}: Props) {
  const router = useRouter();
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [isSavingOwner, setIsSavingOwner] = useState(false);

  const loadParticipants = useCallback(async () => {
    if (!joinToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/participants/list?join_token=${encodeURIComponent(joinToken)}`,
      );
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || '参加者一覧の取得に失敗しました', 'error');
        setParticipants([]);
        return;
      }
      setParticipants(Array.isArray(result.data?.participants) ? result.data.participants : []);
    } catch (error) {
      console.error('Load participants error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [joinToken, showToast]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const handleRecover = async (participantId: string) => {
    if (!joinToken || recoveringId) return;
    setRecoveringId(participantId);
    try {
      const response = await fetch('/api/participants/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          join_token: joinToken,
          participant_id: participantId,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || '復帰に失敗しました', 'error');
        return;
      }

      const { participant_token, display_name } = result.data as {
        participant_token: string;
        display_name: string;
      };
      setParticipantToken(joinToken, participant_token);
      showToast(`${display_name || '参加者'}として復帰しました`, 'success');

      if (onRecovered) {
        onRecovered(participant_token, display_name);
        return;
      }

      router.push(redirectTo ?? `/session/${joinToken}`);
    } catch (error) {
      console.error('Recover error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setRecoveringId(null);
    }
  };

  const handleSaveOwnerToken = async () => {
    const token = parseOwnerTokenFromInput(ownerInput);
    if (!token) {
      showToast('オーナーURLまたはトークンを入力してください', 'error');
      return;
    }
    if (!joinToken) return;

    setIsSavingOwner(true);
    try {
      const response = await fetch(
        `/api/session/check-owner?join_token=${encodeURIComponent(joinToken)}&owner_token=${encodeURIComponent(token)}`,
      );
      const result = await response.json();
      if (!response.ok || !result.data?.is_owner) {
        showToast('オーナーURLがこのイベントと一致しません', 'error');
        return;
      }
      setOwnerToken(joinToken, token);
      showToast('オーナー権限をこの端末に保存しました', 'success');
      setOwnerInput('');
      router.push(`/o/${token}?join_token=${encodeURIComponent(joinToken)}`);
    } catch (error) {
      console.error('Save owner token error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSavingOwner(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`text-stone-400 text-sm ${className}`}>参加者一覧を読み込み中...</div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        {showWelcomeHeader && (
          <>
            <h2 className="text-lg font-semibold text-stone-100">おかえりなさい</h2>
            <p className="text-sm text-stone-400 leading-relaxed">
              以前登録した名前を選ぶと、続きから操作できます
            </p>
          </>
        )}
        <p className="text-stone-400 text-sm leading-relaxed">
          まだ参加者が登録されていません。新規参加登録を行ってください。
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showWelcomeHeader && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-1">おかえりなさい</h2>
          <p className="text-sm text-stone-400 leading-relaxed">
            以前登録した名前を選ぶと、続きから操作できます（パスワード不要）
          </p>
        </div>
      )}

      <div className="space-y-3">
        {participants.map((p) => {
          const label = disambiguatedDisplayName(p.display_name, p.id, participants);
          const isRecovering = recoveringId === p.id;
          const bottleLabel =
            p.brought_count > 0 ? `持ち込み ${p.brought_count} 本` : '持ち込みなし';

          return (
            <button
              key={p.id}
              type="button"
              disabled={recoveringId !== null}
              aria-label={`${label}として復帰`}
              onClick={() => void handleRecover(p.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-neutral-800/80 border hover:border-bd-accent/50 hover:bg-neutral-700/50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--bd-border)' }}
            >
              <div
                className="w-12 h-12 rounded-xl ui-paper-badge flex items-center justify-center text-lg font-semibold shrink-0"
                aria-hidden="true"
              >
                {nameInitial(p.display_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-100 truncate">{label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{bottleLabel}</p>
              </div>
              <span className="text-xs text-stone-500 shrink-0">
                {isRecovering ? '復帰中...' : '選択 →'}
              </span>
            </button>
          );
        })}
      </div>

      {showOwnerRecovery && (
        <div className="pt-6 border-t border-white/10">
          <p className="text-xs text-stone-500 mb-2">オーナーの方</p>
          <p className="text-xs text-stone-500 mb-3 leading-relaxed">
            イベント作成時に表示されたオーナーURL（/o/...）を入力してください
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              placeholder="https://.../o/xxxxxxxx または トークン"
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-xs text-stone-100 placeholder:text-stone-500 min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isSavingOwner || !ownerInput.trim()}
              onClick={() => void handleSaveOwnerToken()}
              className="text-xs px-3 py-2 min-h-[44px] shrink-0"
            >
              {isSavingOwner ? '確認中...' : '開く'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
