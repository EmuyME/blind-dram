"use client";

import { useState, useMemo } from 'react';
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
  const [localSamples, setLocalSamples] = useState<Sample[]>(samples);

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
    try {
      const sample_orders = localSamples.map((sample, index) => ({
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

      // 更新されたsamplesを反映
      if (result.data.samples) {
        setLocalSamples(result.data.samples);
        onSamplesChange(result.data.samples);
      } else {
        onSamplesChange(localSamples);
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
      
      <div className="space-y-2">
        {sortedSamples.map((sample, index) => (
            <div
              key={sample.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 border rounded-xl cursor-move min-h-[44px] transition-all ${
                draggedIndex === index
                  ? 'bg-[#C88A2B]/20 border-[#C88A2B]'
                  : 'bg-neutral-700 border-white/10 hover:bg-neutral-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-neutral-600 rounded-lg font-semibold text-sm text-stone-100">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-stone-100">Sample {sample.label}</div>
                  <div className="text-sm text-stone-400">
                    持ち込み: {getParticipantName(sample.presenter_participant_id)}
                  </div>
                </div>
              </div>
              <div className="text-stone-400">⋮⋮</div>
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
