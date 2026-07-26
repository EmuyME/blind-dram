"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { SampleOrderList } from '@/components/common/SampleOrderList';
import { OwnerSelfJoinForm } from '@/components/common/OwnerSelfJoinForm';
import { JoinQrCode } from '@/components/common/JoinQrCode';
import { OwnerParticipantManager } from '@/components/common/OwnerParticipantManager';
import { copyToClipboard, openLineJoinInviteShare } from '@/lib/utils';

interface OwnerPanelProps {
  ownerToken: string;
  joinToken: string;
  session: {
    id: string;
    title: string;
    mode: 'sequential' | 'simultaneous';
    state: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published' | 'closed';
    join_code?: string | null;
  };
  onSessionUpdate: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface Participant {
  id: string;
  display_name: string;
  is_attending: boolean;
  brought_count: number;
}

interface Sample {
  id: string;
  label: string;
  sort_order: number;
  state: string;
  presenter_participant_id?: string;
}

export function OwnerPanel({ ownerToken, joinToken, session, onSessionUpdate, showToast }: OwnerPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/s/${joinToken}`);
  }, [joinToken]);

  useEffect(() => {
    if (isExpanded) {
      void loadParticipants();
      void loadSamples();
      const id = window.setInterval(() => {
        void loadParticipants();
        if (session.state === 'ordering') void loadSamples();
      }, 4000);
      return () => window.clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParticipants/loadSamples は ownerToken に紐づく
  }, [isExpanded, ownerToken, session.state]);

  const loadParticipants = async () => {
    if (!ownerToken) return;
    
    try {
      const response = await fetch(`/api/owner/get-participants?owner_token=${ownerToken}`);
      const result = await response.json();
      if (response.ok && result.data?.participants) {
        setParticipants(result.data.participants);
      }
    } catch (error) {
      console.error('Load participants error:', error);
    }
  };

  const loadSamples = async () => {
    if (!ownerToken) return;
    
    try {
      const response = await fetch(`/api/owner/get-samples?owner_token=${ownerToken}`);
      const result = await response.json();
      if (response.ok && result.data?.samples) {
        setSamples(result.data.samples);
      }
    } catch (error) {
      console.error('Load samples error:', error);
    }
  };

  const handleCloseRegistration = async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        '参加登録を締め切り、順番決めに進みますか？\n\n' +
          'このパネル内の「あなた（オーナー）の参加登録」をまだ行っていない場合、あなたは不参加（進行・操作のみ）として扱われます。',
      );
      if (!ok) return;
    }
    setIsLoading(true);
    try {
      // 最新のセッション状態を再取得して検証
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      if (sessionCheckResult.data.state !== 'registering') {
        showToast(`現在の状態では実行できません。現在の状態: ${sessionCheckResult.data.state}`, 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/owner/close-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '登録締切に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }

      showToast('登録を締め切りました', 'success');
      
      if (result.data.samples) {
        setSamples(result.data.samples);
      }
      if (result.data.participants) {
        setParticipants(result.data.participants);
      }
      
      onSessionUpdate();
    } catch (error) {
      console.error('Close registration error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      onSessionUpdate(); // エラー時も状態を再読み込み
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      // 最新のセッション状態を再取得して検証
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      if (sessionCheckResult.data.state !== 'ordering') {
        showToast(`現在の状態では実行できません。現在の状態: ${sessionCheckResult.data.state}`, 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/owner/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || 'Session開始に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }

      showToast('Sessionを開始しました', 'success');
      onSessionUpdate();
    } catch (error) {
      console.error('Start session error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      onSessionUpdate(); // エラー時も状態を再読み込み
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      // 最新のセッション状態を再取得して検証
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      if (sessionCheckResult.data.state !== 'aggregating') {
        showToast(`現在の状態では実行できません。現在の状態: ${sessionCheckResult.data.state}`, 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/owner/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '結果公開に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }

      showToast('結果を公開しました', 'success');
      onSessionUpdate();
    } catch (error) {
      console.error('Publish error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      onSessionUpdate(); // エラー時も状態を再読み込み
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceClose = async () => {
    if (!confirm('セッションを強制終了してもよろしいですか？')) {
      return;
    }

    setIsLoading(true);
    try {
      // 最新のセッション状態を再取得して検証（closed状態でないことを確認）
      const sessionCheckResponse = await fetch(`/api/session/get?join_token=${joinToken}`);
      const sessionCheckResult = await sessionCheckResponse.json();
      
      if (!sessionCheckResponse.ok || !sessionCheckResult.data) {
        showToast('セッション状態の確認に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      if (sessionCheckResult.data.state === 'closed') {
        showToast('イベントは既に終了しています', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/owner/force-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '強制終了に失敗しました', 'error');
        onSessionUpdate(); // 状態を再読み込み
        setIsLoading(false);
        return;
      }

      showToast('イベントを強制終了しました', 'success');
      onSessionUpdate();
    } catch (error) {
      console.error('Force close error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
      onSessionUpdate(); // エラー時も状態を再読み込み
    } finally {
      setIsLoading(false);
    }
  };

  const copyJoinUrl = async () => {
    const url = `${window.location.origin}/s/${joinToken}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      showToast('URLをクリップボードにコピーしました', 'success');
    } else {
      showToast('コピーに失敗しました', 'error');
    }
  };

  const shareJoinUrlOnLine = () => {
    const url = `${window.location.origin}/s/${joinToken}`;
    if (openLineJoinInviteShare(url, session.title)) {
      showToast('LINEの送信画面を開きました', 'success');
    } else {
      showToast('ポップアップがブロックされました。許可してから再度お試しください', 'error');
    }
  };

  const copyJoinCode = async () => {
    if (session.join_code) {
      try {
        await navigator.clipboard.writeText(session.join_code);
        showToast('参加コードをクリップボードにコピーしました', 'success');
      } catch {
        showToast('コピーに失敗しました', 'error');
      }
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-neutral-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-stone-100">オーナー機能</span>
          <span className="text-xs text-stone-400 bg-stone-700 px-2 py-1 rounded">管理者</span>
        </div>
        <svg
          className={`w-5 h-5 max-w-5 max-h-5 flex-shrink-0 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ width: '20px', height: '20px' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-6 space-y-4 border-t border-white/10">
          {session.state === 'registering' && (
            <OwnerSelfJoinForm
              joinToken={joinToken}
              showToast={showToast}
              onRegistered={() => {
                void loadParticipants();
              }}
            />
          )}

          {/* 参加URL・参加コード */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-300">
              {session.state === 'registering' ? '招待' : '共有'}
            </h3>
            <JoinQrCode url={joinUrl} size={132} caption="カメラで読み取って参加" />
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={copyJoinUrl}
                className="flex-1 text-sm min-w-[7rem]"
              >
                URLをコピー
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={shareJoinUrlOnLine}
                className="flex-1 text-sm min-w-[7rem]"
                aria-label="LINEで参加URLを送る"
              >
                LINE
              </Button>
              {session.join_code && (
                <Button
                  variant="secondary"
                  onClick={copyJoinCode}
                  className="flex-1 text-sm min-w-[7rem]"
                >
                  コード {session.join_code}
                </Button>
              )}
            </div>
          </div>

          {session.state === 'registering' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-300">
                参加者（{participants.length}）
              </h3>
              <OwnerParticipantManager
                ownerToken={ownerToken}
                participants={participants}
                canEdit
                peerNames={participants.map((p) => ({
                  participant_id: p.id,
                  display_name: p.display_name,
                }))}
                onChanged={loadParticipants}
                showToast={showToast}
              />
            </div>
          )}

          {session.state === 'registering' && (
            <Button
              variant="primary"
              onClick={handleCloseRegistration}
              disabled={isLoading || participants.length === 0}
              className="w-full"
            >
              {isLoading
                ? '処理中...'
                : participants.length === 0
                  ? '参加者がいません'
                  : '参加登録を締め切る'}
            </Button>
          )}

          {/* セッションを開始する */}
          {session.state === 'ordering' && (
            <div>
              <SampleOrderList
                samples={samples}
                participants={participants}
                ownerToken={ownerToken}
                onSamplesChange={(updatedSamples) => {
                  setSamples(updatedSamples);
                  loadSamples();
                }}
                onError={(error) => showToast(error, 'error')}
                onSuccess={() => showToast('順番を更新しました', 'success')}
              />
              <Button
                variant="primary"
                onClick={handleStartSession}
                disabled={isLoading || samples.length === 0}
                className="w-full mt-4"
              >
                {isLoading ? '処理中...' : 'セッションを開始する'}
              </Button>
            </div>
          )}

          {/* 結果を公開する */}
          {session.state === 'aggregating' && (
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '処理中...' : '結果を公開する'}
            </Button>
          )}

          {/* セッションを終了する */}
          {session.state === 'published' && (
            <Button
              variant="secondary"
              onClick={handleForceClose}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '処理中...' : 'セッションを終了する'}
            </Button>
          )}

          {/* オーナーページへのリンク */}
          <div className="pt-2 border-t border-white/10">
            <Button
              variant="secondary"
              onClick={() => window.open(`/o/${ownerToken}?join_token=${joinToken}`, '_blank')}
              className="w-full text-sm"
            >
              詳細なオーナーページを開く（別タブ）
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
