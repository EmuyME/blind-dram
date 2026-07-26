'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export type OwnerParticipantRow = {
  id: string;
  display_name: string;
  brought_count: number;
  bottle_labels?: string[];
};

/** オーナー向け：登録中の参加者の名前修正・削除 */
export function OwnerParticipantManager({
  ownerToken,
  participants,
  canEdit,
  peerNames,
  onChanged,
  showToast,
}: {
  ownerToken: string;
  participants: OwnerParticipantRow[];
  canEdit: boolean;
  peerNames?: Array<{ participant_id: string; display_name: string }>;
  onChanged: () => void | Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const startEdit = (p: OwnerParticipantRow) => {
    setEditingId(p.id);
    setDraftName(p.display_name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveName = async (participantId: string) => {
    const name = draftName.trim();
    if (!name) {
      showToast('表示名を入力してください', 'error');
      return;
    }
    setBusyId(participantId);
    try {
      const res = await fetch('/api/owner/update-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_token: ownerToken,
          participant_id: participantId,
          display_name: name,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || '名前の変更に失敗しました', 'error');
        return;
      }
      showToast('表示名を更新しました', 'success');
      cancelEdit();
      await onChanged();
    } catch {
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const removeParticipant = async (p: OwnerParticipantRow) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        `「${p.display_name}」を参加者一覧から外しますか？\n（この操作は参加登録中のみ可能です）`,
      );
      if (!ok) return;
    }
    setBusyId(p.id);
    try {
      const res = await fetch('/api/owner/remove-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_token: ownerToken,
          participant_id: p.id,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || '削除に失敗しました', 'error');
        return;
      }
      showToast(`「${p.display_name}」を外しました`, 'success');
      if (editingId === p.id) cancelEdit();
      await onChanged();
    } catch {
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (participants.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4 text-center">
        <p className="text-sm text-stone-400">参加者がいません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {participants.map((p) => {
        const busy = busyId === p.id;
        const editing = editingId === p.id;
        const peerHint =
          peerNames &&
          peerNames.some((x) => x.participant_id !== p.id && x.display_name === p.display_name);

        return (
          <div
            key={p.id}
            className="rounded-xl border border-white/10 bg-neutral-900/40 p-3 space-y-2"
          >
            {editing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={40}
                  className="flex-1 min-w-0 px-3 py-2.5 min-h-[44px] bg-neutral-700 border border-white/10 rounded-xl text-stone-100 focus:outline-none focus:ring-2 focus:ring-bd-accent/50"
                  aria-label="表示名"
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() => void saveName(p.id)}
                    className="flex-1 sm:flex-initial px-4"
                  >
                    {busy ? '保存中…' : '保存'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={cancelEdit} className="flex-1 sm:flex-initial px-4">
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-stone-100 truncate">
                    {p.display_name}
                    {peerHint && <span className="ml-2 text-xs text-amber-300/90">同名あり</span>}
                  </p>
                  {p.brought_count > 0 && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      持込 {p.brought_count}本
                      {p.bottle_labels && p.bottle_labels.length > 0
                        ? `（${p.bottle_labels.join('・')}）`
                        : ''}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(p)}
                      className="px-3 py-2 min-h-[44px] rounded-lg border border-white/10 text-xs text-stone-200 hover:bg-neutral-700 disabled:opacity-50"
                    >
                      名前変更
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeParticipant(p)}
                      className="px-3 py-2 min-h-[44px] rounded-lg border border-red-400/30 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      外す
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {canEdit && (
        <p className="text-xs text-stone-500 leading-relaxed pt-1">
          誤登録の修正は参加登録の締切前のみ可能です。締切後は本人の「修正する」から変更してください。
        </p>
      )}
    </div>
  );
}
