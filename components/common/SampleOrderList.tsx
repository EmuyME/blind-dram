"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { disambiguatedDisplayName } from '@/lib/participant-display';

interface Sample {
  id: string;
  label: string;
  sort_order: number;
  state: string;
  presenter_participant_id?: string;
}

interface Participant {
  id: string;
  display_name: string;
  is_attending: boolean;
  brought_count: number;
}

interface SampleOrderListProps {
  samples: Sample[];
  participants: Participant[];
  ownerToken: string;
  onSamplesChange: (samples: Sample[]) => void;
  onError: (error: string) => void;
  onSuccess: () => void;
}

export function SampleOrderList({
  samples,
  participants,
  ownerToken,
  onSamplesChange,
  onError,
  onSuccess,
}: SampleOrderListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localSamples, setLocalSamples] = useState<Sample[]>(() =>
    [...samples].sort((a, b) => a.sort_order - b.sort_order),
  );
  /** ポインタが細い端末だけ HTML5 DnD を有効化（タッチ端末では動作が不安定なため） */
  const [dragEnabled, setDragEnabled] = useState(false);

  /** 親がポーリングで毎回新しい samples 配列を渡すため、未保存の並べ替えを上書きしない */
  const dirtyRef = useRef(false);
  const localSamplesRef = useRef<Sample[]>(localSamples);
  localSamplesRef.current = localSamples;

  useEffect(() => {
    const incoming = [...samples].sort((a, b) => a.sort_order - b.sort_order);
    if (dirtyRef.current) {
      const curIds = new Set(localSamplesRef.current.map((s) => s.id));
      const incIds = new Set(incoming.map((s) => s.id));
      const sameSampleSet =
        curIds.size === incIds.size && [...curIds].every((id) => incIds.has(id));
      if (sameSampleSet) {
        return;
      }
      dirtyRef.current = false;
    }
    setLocalSamples(incoming);
  }, [samples]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: fine)');
    const apply = () => setDragEnabled(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const participantPeers = useMemo(
    () =>
      (participants || []).map((p) => ({
        participant_id: p.id,
        display_name: p.display_name,
      })),
    [participants],
  );

  // 参加者名を取得
  const getParticipantName = (participantId?: string) => {
    if (!participantId) return '不明';
    if (!participants || !Array.isArray(participants)) return '不明';
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return '不明';
    return disambiguatedDisplayName(
      participant.display_name,
      participant.id,
      participantPeers,
    );
  };

  // ソート済みサンプルリスト
  const sortedSamples = [...localSamples].sort((a, b) => a.sort_order - b.sort_order);

  const moveSample = (index: number, delta: number) => {
    const ordered = [...sortedSamples];
    const next = index + delta;
    if (next < 0 || next >= ordered.length) return;
    const [row] = ordered.splice(index, 1);
    ordered.splice(next, 0, row);
    dirtyRef.current = true;
    setLocalSamples(ordered.map((s, idx) => ({ ...s, sort_order: idx })));
    setDraggedIndex(null);
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newSamples = [...sortedSamples];
    const draggedSample = newSamples[draggedIndex];
    newSamples.splice(draggedIndex, 1);
    newSamples.splice(index, 0, draggedSample);

    // sort_orderを更新
    const updatedSamples = newSamples.map((sample, idx) => ({
      ...sample,
      sort_order: idx,
    }));

    dirtyRef.current = true;
    setLocalSamples(updatedSamples);
    setDraggedIndex(index);
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 順番を保存
  const handleSaveOrder = async () => {
    setIsSaving(true);
    const ordered = [...localSamples].sort((a, b) => a.sort_order - b.sort_order);
    try {
      const sample_orders = ordered.map((sample, index) => ({
        sample_id: sample.id,
        sort_order: index,
      }));

      const response = await fetch('/api/owner/set-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_token: ownerToken,
          sample_orders,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        onError(result.error || '順番保存に失敗しました');
        return;
      }

      dirtyRef.current = false;
      // 更新されたsamplesを反映
      if (result.data.samples) {
        const next = [...result.data.samples].sort((a, b) => a.sort_order - b.sort_order);
        setLocalSamples(next);
        onSamplesChange(next);
      } else {
        onSamplesChange(ordered);
      }

      onSuccess();
    } catch (error) {
      console.error('Save order error:', error);
      onError('ネットワークエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ui-card p-6 space-y-4">
      <h3 className="ui-h3">Sample順番</h3>
      <p className="text-sm text-stone-400 leading-relaxed">
        {dragEnabled
          ? 'ドラッグで入れ替えるか、↑ ↓ で順序を変えられます。確定後は「順番を保存」を押してください。'
          : '↑ ↓ ボタンで順序を入れ替え、「順番を保存」で確定してください。'}
      </p>

      <div className="space-y-2">
        {sortedSamples.map((sample, index) => (
            <div
              key={sample.id}
              draggable={dragEnabled}
              onDragStart={dragEnabled ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={dragEnabled ? (e) => handleDragOver(e, index) : undefined}
              onDrop={dragEnabled ? handleDrop : undefined}
              onDragEnd={dragEnabled ? handleDragEnd : undefined}
              className={`flex items-center gap-2 sm:gap-3 p-3 border rounded-xl min-h-[44px] transition-all touch-manipulation ${
                dragEnabled ? 'cursor-move' : ''
              } ${
                draggedIndex === index
                  ? 'bg-[#C88A2B]/20 border-[#C88A2B]'
                  : 'bg-neutral-700 border-white/10 hover:bg-neutral-600'
              }`}
            >
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-white/15 bg-neutral-600 text-stone-100 text-lg leading-none disabled:opacity-25 disabled:cursor-not-allowed active:bg-neutral-500"
                  onClick={() => moveSample(index, -1)}
                  disabled={index === 0}
                  aria-label="1つ上へ移動"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-white/15 bg-neutral-600 text-stone-100 text-lg leading-none disabled:opacity-25 disabled:cursor-not-allowed active:bg-neutral-500"
                  onClick={() => moveSample(index, 1)}
                  disabled={index === sortedSamples.length - 1}
                  aria-label="1つ下へ移動"
                >
                  ↓
                </button>
              </div>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-neutral-600 rounded-lg font-semibold text-sm text-stone-100">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-stone-100 truncate">Sample {sample.label}</div>
                  <div className="text-sm text-stone-400 truncate">
                    持ち込み: {getParticipantName(sample.presenter_participant_id)}
                  </div>
                </div>
              </div>
              {dragEnabled ? (
                <div className="text-stone-400 shrink-0 select-none" aria-hidden>
                  ⋮⋮
                </div>
              ) : null}
            </div>
          ))}
      </div>

      <Button
        variant="primary"
        onClick={handleSaveOrder}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? '保存中...' : '順番を保存'}
      </Button>
    </div>
  );
}
