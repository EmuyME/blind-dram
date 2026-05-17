'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { getParticipantToken, setParticipantToken } from '@/lib/utils';

type Props = {
  joinToken: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  /** 登録・更新のたびに参加者一覧などを再取得 */
  onRegistered: () => void;
};

/**
 * オーナー画面内での参加登録。登録後の参加トークンは端末に保存され、
 * Session 開始後はオーナー画面の案内から /session/:joinToken へ進んでプレイする。
 * この端末の localStorage に参加トークンがある場合は編集モードとして読み込む。
 */
export function OwnerSelfJoinForm({ joinToken, showToast, onRegistered }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [broughtCount, setBroughtCount] = useState(0);
  const [bottleLabels, setBottleLabels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formReady, setFormReady] = useState(false);
  /** 既に端末に参加トークンがあるとき Upsert に使う（直近の値） */
  const [rejoinParticipantToken, setRejoinParticipantToken] = useState<string | null>(null);

  useEffect(() => {
    if (!joinToken) return;

    setFormReady(false);
    setDisplayName('');
    setBroughtCount(0);
    setBottleLabels([]);
    setRejoinParticipantToken(null);

    const t = getParticipantToken(joinToken);
    if (!t) {
      setFormReady(true);
      return;
    }

    setRejoinParticipantToken(t);
    let cancelled = false;

    const load = async () => {
      try {
        const meRes = await fetch(
          `/api/participants/me?join_token=${encodeURIComponent(joinToken)}&participant_token=${encodeURIComponent(t)}`,
        );
        const meJson = await meRes.json();
        if (!meRes.ok) {
          if (!cancelled) {
            setRejoinParticipantToken(null);
            setFormReady(true);
          }
          return;
        }
        const me = meJson.data as { display_name: string; brought_count: number };
        if (cancelled) return;
        setDisplayName(me.display_name || '');
        const count = typeof me.brought_count === 'number' ? me.brought_count : 0;
        setBroughtCount(count);

        const samplesRes = await fetch(
          `/api/session/my-samples?join_token=${encodeURIComponent(joinToken)}&participant_token=${encodeURIComponent(t)}`,
        );
        const samplesJson = await samplesRes.json();
        if (cancelled) return;
        if (samplesRes.ok && Array.isArray(samplesJson.data) && samplesJson.data.length > 0) {
          const sorted = [...(samplesJson.data as { label: string; sort_order: number }[])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          );
          setBottleLabels(sorted.map((s) => s.label));
        } else if (count > 0) {
          setBottleLabels(
            Array.from({ length: count }, (_, i) => `Sample ${String.fromCharCode(65 + i)}`),
          );
        } else {
          setBottleLabels([]);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) showToast('登録内容の読み込みに失敗しました', 'error');
      } finally {
        if (!cancelled) setFormReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showToast は安定参照でないが再フェッチ不要
  }, [joinToken]);

  const handleBroughtCountChange = (count: number) => {
    setBroughtCount(count);
    const newLabels = [...bottleLabels];
    while (newLabels.length < count) {
      const index = newLabels.length;
      newLabels.push(`Sample ${String.fromCharCode(65 + index)}`);
    }
    while (newLabels.length > count) {
      newLabels.pop();
    }
    setBottleLabels(newLabels);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken) {
      showToast('参加トークンが無効です', 'error');
      return;
    }
    if (!displayName.trim()) {
      showToast('表示名を入力してください', 'error');
      return;
    }
    if (broughtCount > 0 && bottleLabels.some((label) => !label.trim())) {
      showToast('持参するボトルのラベルをすべて入力してください', 'error');
      return;
    }

    const isUpdate = !!rejoinParticipantToken;

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        join_token: joinToken,
        display_name: displayName,
        is_attending: true,
        brought_count: broughtCount,
        bottle_labels: broughtCount === 0 ? [] : bottleLabels.map((label) => label.trim()),
      };
      if (isUpdate && rejoinParticipantToken) {
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
        return;
      }
      const { participant_token } = result.data as { participant_token: string };
      setParticipantToken(joinToken, participant_token);
      setRejoinParticipantToken(participant_token);
      showToast(isUpdate ? '参加登録を更新しました' : '参加登録が完了しました', 'success');
      onRegistered();
    } catch (err) {
      console.error(err);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!formReady) {
    return (
      <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
        <p className="text-stone-400 text-sm">参加登録フォームを読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
      <h2 className="text-xl font-semibold text-stone-100 mb-2 tracking-tight">あなた（オーナー）の参加登録</h2>
      <p className="text-stone-400 text-sm mb-4 leading-relaxed">
        ゲームにボトルを持ち込む場合は、ここで登録してください。回答・プレゼンは
        <span className="text-stone-200 font-medium"> Session を開始したあと </span>
        、オーナー画面に表示される案内からセッション参加者画面へ進んで行います。
        <span className="block mt-2">
          登録しないまま「参加登録を締め切る」と、あなたは
          <span className="text-stone-200 font-medium"> 不参加 </span>
          （進行・操作のみ）として扱われます。ボトルを持ち込まない場合は 0 本のまま登録しても構いません。
        </span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="owner-self-display-name" className="block text-sm font-medium text-stone-200 mb-1.5">
            表示名
          </label>
          <input
            id="owner-self-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-700 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="例: 山田太郎"
            required
            autoComplete="name"
          />
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
            このイベント内で既に使われている表示名は登録できません（前後の空白は無視して比較します）。
          </p>
        </div>

        <div>
          <label htmlFor="owner-self-brought" className="block text-sm font-medium text-stone-200 mb-1.5">
            持参するボトル数
          </label>
          <input
            id="owner-self-brought"
            type="number"
            min={0}
            value={broughtCount}
            onChange={(e) => handleBroughtCountChange(parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-3 bg-neutral-700 border border-white/10 text-stone-100 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>

        {broughtCount > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-200">ボトルのラベル（順番通り）</label>
            {Array.from({ length: broughtCount }).map((_, index) => (
              <input
                key={index}
                type="text"
                value={bottleLabels[index] || ''}
                onChange={(e) => {
                  const next = [...bottleLabels];
                  next[index] = e.target.value;
                  setBottleLabels(next);
                }}
                className="w-full px-4 py-3 bg-neutral-700 border border-white/10 text-stone-100 placeholder:text-stone-500 rounded-lg text-base min-h-[44px] focus:border-white/20 focus:ring-2 focus:ring-white/20 transition-all"
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
          {isSubmitting ? '保存中…' : rejoinParticipantToken ? '参加登録を更新' : '参加登録する'}
        </Button>
      </form>
    </div>
  );
}
