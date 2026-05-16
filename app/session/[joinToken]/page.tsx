"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { NextActionCard } from '@/components/common/NextActionCard';
import { ParticipantProgress } from '@/components/common/ParticipantProgress';
import { OwnerPanel } from '@/components/common/OwnerPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { getParticipantToken, getOwnerToken } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  mode: 'sequential' | 'simultaneous';
  state: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published' | 'closed';
}

interface Sample {
  id: string;
  label: string;
  state: 'pending' | 'answering' | 'grading' | 'revealed' | 'closed';
  sort_order: number;
  /** current-sample API などで付与（round/status 失敗時の Presenter 判定用） */
  presenter_participant_id?: string | null;
}

interface RoundStatus {
  current_sample: Sample | null;
  participants: Array<{
    id: string;
    display_name: string;
    status: 'draft' | 'submitted' | 'graded';
  }>;
  truth_entered: boolean;
  presenter_participant_id?: string | null;
  label?: string;
  truth?: unknown;
}

interface MySample {
  id: string;
  label: string;
  state: 'pending' | 'answering' | 'grading' | 'revealed' | 'closed';
  sort_order: number;
}

export default function SessionHomePage() {
  const params = useParams();
  const router = useRouter();
  const [joinToken, setJoinToken] = useState<string>('');

  useEffect(() => {
    if (params && typeof params.joinToken === 'string') {
      setJoinToken(params.joinToken);
    }
  }, [params]);

  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [roundStatus, setRoundStatus] = useState<RoundStatus | null>(null);
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [mySamples, setMySamples] = useState<MySample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingToRound, setIsNavigatingToRound] = useState(false);
  const [pendingSampleReady, setPendingSampleReady] = useState<Record<string, boolean>>({});
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isPublishingResults, setIsPublishingResults] = useState(false);
  /** running なのに current_sample が一時的に取れないとき、check-complete の reason を UI に出す */
  const [runningGapReason, setRunningGapReason] = useState<string | null>(null);

  useEffect(() => {
    if (session?.state !== 'running') {
      setRunningGapReason(null);
    }
  }, [session?.state]);

  useEffect(() => {
    if (roundStatus != null) {
      setRunningGapReason(null);
    }
  }, [roundStatus]);

  useEffect(() => {
    if (!joinToken) return;
    
    // participantTokenを取得（リダイレクト直後でも確実に読み込む）
    const loadParticipantToken = () => {
      const token = getParticipantToken(joinToken);
      setParticipantToken(token);
      if (token) {
        loadParticipantInfo(token);
      }
      return token;
    };
    
    // 初回読み込み
    const initialToken = loadParticipantToken();
    
    // リダイレクト直後の場合に備えて、少し遅延して再度読み込み（ただし、既にtokenがある場合は不要）
    const timeoutId = setTimeout(() => {
      if (!initialToken) {
        loadParticipantToken();
      }
    }, 300);
    
    // オーナートークンを取得
    const storedOwnerToken = getOwnerToken(joinToken);
    if (storedOwnerToken) {
      setOwnerToken(storedOwnerToken);
      checkOwnerStatus(storedOwnerToken);
    }
    
    loadSession();
    
    // セッション状態を定期的に更新（ポーリング）
    // registering状態でも参加者リストの更新が必要
    // participantTokenが既にある場合は、ポーリング頻度を下げる
    const pollingInterval = initialToken ? 5000 : 3000; // participantTokenがある場合は5秒、ない場合は3秒
    const interval = setInterval(() => {
      loadSession();
      // participantTokenがない場合のみ再確認（既にある場合は不要）
      if (!initialToken) {
        const currentToken = getParticipantToken(joinToken);
        if (currentToken && currentToken !== initialToken) {
          setParticipantToken(currentToken);
          loadParticipantInfo(currentToken);
        }
      }
    }, pollingInterval);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ポーリングは joinToken 固定。loadSession 等を依存に入れると間隔が毎回リセットされる
  }, [joinToken]);
  
  // オーナーかどうかをチェック
  const checkOwnerStatus = useCallback(async (token: string) => {
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
  }, [joinToken]);

  const loadParticipantInfo = async (token: string) => {
    if (!joinToken) return;
    
    try {
      const response = await fetch(`/api/participants/me?join_token=${joinToken}&participant_token=${token}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setParticipantId(result.data.id);
        setParticipantName(result.data.display_name || null);
        // 自分の持ち込みSampleを取得
        if (result.data.id && session) {
          loadMySamples();
        }
      }
    } catch (error) {
      console.error('Load participant info error:', error);
    }
  };

  const loadMySamples = async () => {
    if (!joinToken || !participantToken) return;
    
    try {
      // SessionのSample一覧を取得（participant_tokenで認証）
      const response = await fetch(`/api/session/get?join_token=${joinToken}`);
      const result = await response.json();
      if (response.ok && result.data) {
        // Sample一覧を取得するために、別のAPIを呼び出す必要がある
        // 簡易的に、現在のSampleが自分の持ち込みSampleかどうかを確認
        // より良い方法は、新しいAPIエンドポイントを作成すること
        // ここでは、roundStatusから現在のSampleを取得し、それが自分の持ち込みSampleかどうかを確認
      }
    } catch (error) {
      console.error('Load my samples error:', error);
    }
  };

  // pending状態のサンプルが全員の「次へ」待ちかどうかをチェック
  const checkPendingSampleReady = useCallback(async (sampleId: string) => {
    if (!joinToken || !sampleId) return;
    
    try {
      const response = await fetch(`/api/session/check-pending-sample-ready?join_token=${joinToken}&sample_id=${sampleId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setPendingSampleReady((prev) => ({
          ...prev,
          [sampleId]: result.data.is_ready,
        }));
      }
    } catch (error) {
      console.error('Check pending sample ready error:', error);
    }
  }, [joinToken]);

  const loadCurrentSampleAndStatus = useCallback(async () => {
    if (!session || !joinToken) {
      return;
    }

    try {
      // 現在のSampleを取得（participant_tokenは不要）
      const currentSampleResponse = await fetch(`/api/session/current-sample?join_token=${joinToken}`);
      let currentSampleResult: { data?: { current_sample?: Sample | null; mode?: string } };
      try {
        currentSampleResult = await currentSampleResponse.json();
      } catch {
        return;
      }


      if (!currentSampleResponse.ok || !currentSampleResult.data) {
        if (currentSampleResponse.status === 429) {
          setRunningGapReason('rate_limit');
        }
        return;
      }

      const currentSample = currentSampleResult.data.current_sample;

      if (!currentSample) {
        setRoundStatus(null);
        return;
      }

      type RoundStatusProgressRow = {
        participant_id: string;
        display_name: string;
        status: 'draft' | 'submitted' | 'graded';
      };
      type RoundStatusApiData = {
        participant_progress?: RoundStatusProgressRow[];
        truth_entered?: boolean;
        presenter_participant_id?: string | null;
        label?: string;
        truth?: unknown;
      };
      type ApiResult<T> = { data?: T; error?: string };

      const isProgressRow = (v: unknown): v is RoundStatusProgressRow => {
        const o = v as Partial<RoundStatusProgressRow> | null;
        return (
          !!o &&
          typeof o === 'object' &&
          typeof o.participant_id === 'string' &&
          typeof o.display_name === 'string' &&
          (o.status === 'draft' || o.status === 'submitted' || o.status === 'graded')
        );
      };

      // participant_tokenがある場合のみRound状態を取得（失敗しても currentSample ベースで UI を進める）
      let statusResult: ApiResult<RoundStatusApiData> | null = null;
      if (participantToken) {
        try {
          const statusResponse = await fetch(
            `/api/round/status?sample_id=${currentSample.id}&participant_token=${participantToken}`
          );
          let parsed: unknown = null;
          try {
            parsed = await statusResponse.json();
          } catch {
            parsed = null;
          }
          if (
            statusResponse.ok &&
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          ) {
            statusResult = parsed as ApiResult<RoundStatusApiData>;
          }
        } catch {
          statusResult = null;
        }
      }

      const rawProgress = statusResult?.data?.participant_progress;
      const participantProgress = Array.isArray(rawProgress)
        ? rawProgress.filter(isProgressRow).map((p) => ({
            id: p.participant_id,
            display_name: p.display_name,
            status: p.status,
          }))
        : [];

      const resolvedPresenterId =
        statusResult?.data?.presenter_participant_id ??
        currentSample.presenter_participant_id ??
        null;

      let listForPendingCheck: MySample[] = mySamples;
      if (participantToken) {
        try {
          const msRes = await fetch(
            `/api/session/my-samples?join_token=${encodeURIComponent(joinToken)}&participant_token=${encodeURIComponent(participantToken)}`,
          );
          let msBody: { data?: MySample[] } = {};
          try {
            msBody = (await msRes.json()) as { data?: MySample[] };
          } catch {
            msBody = {};
          }
          if (msRes.ok && Array.isArray(msBody.data)) {
            listForPendingCheck = msBody.data;
            setMySamples(msBody.data);
          }
        } catch {
          /* my-samples は補助。無視して従来の mySamples を使う */
        }
      }

      if (
        listForPendingCheck.length === 0 &&
        participantId &&
        resolvedPresenterId === participantId &&
        currentSample
      ) {
        const fallbackRow: MySample = {
          id: currentSample.id,
          label: statusResult?.data?.label || currentSample.label,
          state: currentSample.state,
          sort_order: 0,
        };
        listForPendingCheck = [fallbackRow];
        setMySamples([fallbackRow]);
      }

      // ログは重要な変更時のみ記録（ポーリングで頻繁に呼ばれるため）
      // console.log('[DEBUG] Session home - Loaded round status:', {
      //   sample_id: currentSample.id,
      //   sample_state: currentSample.state,
      //   participants_count: participantProgress.length,
      // });

      setRoundStatus({
        current_sample: currentSample,
        participants: participantProgress,
        truth_entered: statusResult?.data?.truth_entered || false,
        presenter_participant_id: resolvedPresenterId,
        label: statusResult?.data?.label ?? currentSample.label,
        truth: statusResult?.data?.truth, // Truth情報を保存（revealed状態の場合）
      });

      // 自分のpending状態のサンプルがある場合、全員の「次へ」待ちかどうかをチェック
      if (participantId && session?.mode === 'sequential') {
        listForPendingCheck
          .filter((s) => s.state === 'pending')
          .forEach((sample) => {
            checkPendingSampleReady(sample.id);
          });
      }
    } catch (error) {
      console.error('Load current sample and status error:', error);
    }
  }, [session, joinToken, participantToken, participantId, checkPendingSampleReady, mySamples, setRunningGapReason]);

  useEffect(() => {
    // participantTokenがなくても、逐次モードでrevealed状態のサンプルを表示するためにloadCurrentSampleAndStatusを呼び出す
    if (session && session.state === 'running' && joinToken) {
      loadCurrentSampleAndStatus();
      const interval = setInterval(() => {
        loadCurrentSampleAndStatus();
      }, 3000); // 3秒ごとに更新（より頻繁に更新）
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session 全体を依存に入れるとポーリングが過剰に再実行される
  }, [session?.state, participantToken, joinToken, loadCurrentSampleAndStatus]);

  // 遷移先を先読みして、クリック時の体感を改善
  useEffect(() => {
    if (!joinToken) return;
    const currentSampleId = roundStatus?.current_sample?.id;
    if (!currentSampleId) return;
    router.prefetch(`/session/${joinToken}/round/${currentSampleId}`);
  }, [joinToken, roundStatus?.current_sample?.id, router]);

  // roundStatusがnullで、セッションがrunning状態の場合、すべてのサンプルが完了した可能性がある
  // 定期的にセッション状態をチェックし、すべてのサンプルが完了している場合にセッションをaggregating状態に遷移させる
  useEffect(() => {
    // 条件チェックはuseEffectの内部で行う
    if (!(session?.state === 'running' && !roundStatus && joinToken)) {
      return;
    }

    const checkAndUpdateSession = async () => {
      try {
        const response = await fetch('/api/session/check-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ join_token: joinToken }),
        });
        const result = await response.json();
        
        if (result.data?.updated) {
          setRunningGapReason(null);
          await loadSession();
          return;
        }
        const reason = result.data?.reason;
        if (typeof reason === 'string') {
          setRunningGapReason(reason);
        } else {
          setRunningGapReason(null);
        }
        loadCurrentSampleAndStatus();
      } catch (error) {
        console.error('Check complete error:', error);
        setRunningGapReason('error');
      }
    };

    checkAndUpdateSession();

    const interval = setInterval(checkAndUpdateSession, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSession は毎レンダーで新規生成
  }, [session?.state, roundStatus, joinToken, loadCurrentSampleAndStatus]);

  // aggregating状態の間、定期的にセッション状態をチェックして、publishedになったら結果ページにリダイレクト
  useEffect(() => {
    if (!(session?.state === 'aggregating' && joinToken)) {
      return;
    }

    const checkPublished = async () => {
      try {
        const response = await fetch(`/api/session/get?join_token=${joinToken}`);
        const result = await response.json();
        
        if (result.data?.state === 'published') {
          // 結果ページにリダイレクト
          router.push(`/session/${joinToken}/results`);
        }
      } catch (error) {
        console.error('Check published error:', error);
      }
    };

    // 初回チェック
    checkPublished();
    
    // 3秒ごとにチェック
    const interval = setInterval(checkPublished, 3000);
    return () => clearInterval(interval);
  }, [session?.state, joinToken, router]);

  // 逐次モードで、revealed状態のサンプルがある場合は結果ページにリダイレクト
  useEffect(() => {
    if (session?.state === 'running' && session?.mode === 'sequential' && roundStatus?.current_sample?.state === 'revealed') {
      const currentSample = roundStatus.current_sample;
      router.push(`/session/${joinToken}/round-result/${currentSample.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- current_sample オブジェクト参照は id/state で十分
  }, [session?.state, session?.mode, roundStatus?.current_sample?.state, roundStatus?.current_sample?.id, joinToken, router]);

  const loadSession = async () => {
    if (!joinToken) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/session/get?join_token=${joinToken}`);
      const result = await response.json();


      if (!response.ok) {
        showToast(result.error || 'Session取得に失敗しました', 'error');
        setIsLoading(false);
        return;
      }

      setSession(result.data);
      // 参加者情報が既に読み込まれている場合、自分のSampleを取得
      if (participantId && result.data.id) {
        loadMySamples();
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishResults = useCallback(async () => {
    if (!ownerToken) {
      showToast('オーナートークンが見つかりません（オーナーページから公開してください）', 'error');
      return;
    }

    if (isPublishingResults) return;
    setIsPublishingResults(true);
    try {
      const ok = window.confirm('結果を公開します。よろしいですか？');
      if (!ok) return;

      const response = await fetch('/api/owner/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_token: ownerToken }),
      });
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || '公開に失敗しました', 'error');
        return;
      }

      showToast('結果を公開しました', 'success');
      await loadSession();
      router.push(`/session/${joinToken}/results`);
    } catch (error) {
      console.error('Publish results error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsPublishingResults(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSession は毎レンダーで新規生成
  }, [ownerToken, isPublishingResults, showToast, router, joinToken]);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <div className="max-w-md mx-auto mt-8">
          <p className="text-center text-stone-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // participantTokenがない場合でも、オーナーの場合はオーナー機能を表示
  if (!participantToken && !isOwner) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加登録が必要です</h2>
            <p className="text-stone-400 mb-4 leading-relaxed">
              このページを表示するには、まず参加登録を行ってください。
            </p>
            <Button
              variant="primary"
              onClick={() => {
                if (joinToken) {
                  router.push(`/s/${joinToken}`);
                }
              }}
              className="w-full"
            >
              参加登録へ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (session.state === 'registering') {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-2xl mx-auto mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">{session.title}</h1>
            {participantName && (
              <div className="text-base md:text-lg text-stone-400">
                参加者: <span className="font-medium text-stone-100">{participantName}</span>
              </div>
            )}
          </div>

          {/* オーナー機能パネル（registering状態でも表示） */}
          {isOwner && ownerToken && (
            <OwnerPanel
              ownerToken={ownerToken}
              joinToken={joinToken}
              session={session}
              onSessionUpdate={loadSession}
              showToast={showToast}
            />
          )}

          {/* 参加者向けメッセージ */}
          {participantToken && (
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加登録完了</h2>
              <p className="text-stone-400 mb-4 leading-relaxed">
                参加登録が完了しました。オーナーが参加登録を締め切るまでお待ちください。
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (session.state === 'ordering') {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-2xl mx-auto mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">{session.title}</h1>
            {participantName && (
              <div className="text-base md:text-lg text-stone-400">
                参加者: <span className="font-medium text-stone-100">{participantName}</span>
              </div>
            )}
          </div>

          {/* オーナー機能パネル（ordering状態でも表示） */}
          {isOwner && ownerToken && (
            <OwnerPanel
              ownerToken={ownerToken}
              joinToken={joinToken}
              session={session}
              onSessionUpdate={loadSession}
              showToast={showToast}
            />
          )}

          {/* 参加者向けメッセージ */}
          {participantToken && !isOwner && (
            <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">順番決め中</h2>
              <p className="text-stone-400 mb-4 leading-relaxed">
                オーナーがサンプルの順番を決めています。しばらくお待ちください。
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (session.state === 'published') {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">結果が公開されました</h2>
            <Button
              variant="primary"
              onClick={() => {
                if (joinToken) {
                  router.push(`/session/${joinToken}/results`);
                }
              }}
              className="w-full"
            >
              結果を見る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (session.state === 'aggregating') {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">結果を集計中</h2>
            <p className="text-stone-400 mb-4 leading-relaxed">
              すべてのRoundが完了しました。Ownerが結果を公開するまでお待ちください。結果が公開されると、自動的に結果ページに移動します。
            </p>

            <div className="space-y-3">
              <Button
                variant="secondary"
                onClick={() => loadSession()}
                className="w-full"
              >
                状態を更新
              </Button>

              {ownerToken && (
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/o/${ownerToken}?join_token=${joinToken}`)}
                  className="w-full"
                >
                  オーナーページを開く
                </Button>
              )}

              {isOwner && ownerToken && (
                <Button
                  variant="primary"
                  onClick={handlePublishResults}
                  disabled={isPublishingResults}
                  className="w-full"
                >
                  {isPublishingResults ? '公開中...' : '結果を公開する'}
                </Button>
              )}
            </div>

            {ownerToken && !isOwner && (
              <p className="text-xs text-stone-500 mt-4 leading-relaxed">
                オーナー確認中、またはこの端末ではオーナー権限がありません。オーナーの端末で「結果を公開する」を押してください。
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (session.state === 'closed') {
    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-stone-100 tracking-tight">イベントは終了しました</h2>
            <p className="text-stone-400">このイベントは終了しました。</p>
          </div>
        </div>
      </div>
    );
  }

  if (session.state === 'running' && roundStatus) {
    const currentSample = roundStatus.current_sample;
    const myStatus = participantId
      ? roundStatus.participants.find((p) => p.id === participantId)
      : null;
    
    // 自分の持ち込みSampleで、まだ開始されていないもの
    const myPendingSample = mySamples.find((s) => s.state === 'pending');
    
    // 逐次モードで、pending状態のサンプルが全員の「次へ」待ちの場合は「Roundを開始」ボタンを表示しない
    // NOTE: undefined（未判定）の間は開始不可にして、ボタンが一瞬出る/消えるのを防ぐ
    const isPendingSampleReady = myPendingSample ? pendingSampleReady[myPendingSample.id] : undefined;
    const canStartPendingSample =
      !!myPendingSample && (session.mode !== 'sequential' || isPendingSampleReady === true);
    
    // 逐次モードで、revealed状態のサンプルがある場合は結果ページにリダイレクト中
    if (session.mode === 'sequential' && currentSample && currentSample.state === 'revealed') {
      return (
        <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
          <p className="text-center text-stone-400">結果ページに移動しています...</p>
        </div>
      );
    }
    
    // 現在のSampleが自分の持ち込みSampleかどうかを確認（roundStatusから直接取得）
    // roundStatusには現在のSampleのpresenter_participant_idが含まれている
    const isMySample =
      currentSample &&
      participantId &&
      roundStatus.presenter_participant_id === participantId;

    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
          currentSample={currentSample ? { id: currentSample.id, label: currentSample.label } : undefined}
        />

        <div className="max-w-2xl mx-auto mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">{session.title}</h1>
            {participantName && (
              <div className="text-base md:text-lg text-stone-400">
                参加者: <span className="font-medium text-stone-100">{participantName}</span>
              </div>
            )}
          </div>

          {/* オーナー機能パネル */}
          {isOwner && ownerToken && (
            <OwnerPanel
              ownerToken={ownerToken}
              joinToken={joinToken}
              session={session}
              onSessionUpdate={loadSession}
              showToast={showToast}
            />
          )}

          {/* Presenterとして担当しているSampleのPresenterパネルへのリンク */}
          {(isMySample || (myPendingSample && canStartPendingSample)) && (
            <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h2 className="text-lg font-semibold text-stone-100 mb-2">Presenterパネル</h2>
              <p className="text-sm text-stone-400 mb-3 leading-relaxed">
                {isMySample
                  ? `あなたはSample ${currentSample?.label}のPresenterです。Roundを開始・管理できます。`
                  : myPendingSample
                  ? `あなたはSample ${myPendingSample.label}のPresenterです。Roundを開始できます。`
                  : ''}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  const targetSampleId = isMySample ? currentSample?.id : myPendingSample?.id;
                  if (joinToken && targetSampleId) {
                    router.push(`/session/${joinToken}/presenter/${targetSampleId}`);
                  }
                }}
                className="w-full"
              >
                Presenterパネルを開く
              </Button>
            </div>
          )}
          
          {/* 逐次モードで、pending状態のサンプルが全員の「次へ」待ちの場合のメッセージ */}
          {myPendingSample && !canStartPendingSample && session.mode === 'sequential' && (
            <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl shadow-black/40 p-6">
              <h2 className="text-lg font-semibold text-stone-100 mb-2">次のラウンド待機中</h2>
              <p className="text-sm text-stone-400 mb-3 leading-relaxed">
                あなたはSample {myPendingSample.label}のPresenterです。前のラウンドの結果確認が完了するまでお待ちください。
              </p>
            </div>
          )}

          {/* プレゼンター（自分の持ち込みSample）の場合は回答入力欄を表示しない */}
          {currentSample && !isMySample && (
            <NextActionCard
              title={
                currentSample.state === 'answering'
                  ? `Sample ${currentSample.label} の回答を入力してください`
                  : currentSample.state === 'pending'
                  ? `Sample ${currentSample.label} はまだ開始されていません`
                  : currentSample.state === 'grading'
                  ? `Sample ${currentSample.label} は採点中です`
                  : `Sample ${currentSample.label} は終了しました`
              }
              description={
                currentSample.state === 'answering'
                  ? '現在のSampleについて、推測とフレーバーを入力してください。'
                  : currentSample.state === 'pending'
                  ? 'PresenterがRoundを開始するまでお待ちください。'
                  : currentSample.state === 'grading'
                  ? '回答は提出済みです。採点を待っています。'
                  : 'このRoundは終了しました。'
              }
              primaryAction={
                currentSample.state === 'answering'
                  ? {
                      label: isNavigatingToRound
                        ? '移動中...'
                        : myStatus?.status === 'submitted'
                          ? '回答を編集する'
                          : '回答入力へ',
                      onClick: () => {
                        if (joinToken && currentSample?.id) {
                          setIsNavigatingToRound(true);
                          router.push(`/session/${joinToken}/round/${currentSample.id}`);
                        }
                      },
                      disabled: isNavigatingToRound,
                    }
                  : undefined
              }
              note={currentSample.state === 'answering' ? '回答は後で編集できます' : undefined}
            />
          )}

          {roundStatus.participants.length > 0 && (
            <ParticipantProgress participants={roundStatus.participants} />
          )}
        </div>
      </div>
    );
  }

  if (session.state === 'running' && !roundStatus) {
    const reasonHints: Record<string, string> = {
      no_samples:
        'サンプル（ボトル）が1件も登録されていない可能性があります。オーナーの「参加登録締切」前に、参加者が持ち込み本数を正しく登録したか確認してください。',
      incomplete_samples_pending:
        'サーバー上ではラウンド未完了と判断されています。プレゼンターが「Round開始」を済ませているか、しばらく待ってから更新してください。',
      rate_limit:
        '短時間にアクセスが集中し、一時的に制限されました。Blind Dram のタブを1つに減らすか、30〜60秒待ってから「状態を更新」を押してください。',
      samples_not_completed:
        'いずれかのサンプルがまだ最終状態（結果公開／クローズ）になっていません。表示の同期待ちの可能性があります。',
      error: 'サーバーとの通信に失敗しました。接続を確認してから更新してください。',
    };
    const hint =
      runningGapReason && reasonHints[runningGapReason]
        ? reasonHints[runningGapReason]
        : '現在のサンプル情報を取得できていません。数秒待つか、下のボタンで再読み込みしてください。';

    return (
      <div className="min-h-screen bg-neutral-900 pt-16 pb-20 px-4">
        <PhaseBanner
          sessionState={session.state}
          mode={session.mode}
        />
        <div className="max-w-md mx-auto mt-8">
          <div className="bg-neutral-800 rounded-2xl shadow-xl shadow-black/40 border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">
              進行状況を同期しています
            </h2>
            <p className="text-stone-400 mb-4 leading-relaxed">{hint}</p>
            <Button
              variant="primary"
              onClick={() => {
                void loadSession();
                void loadCurrentSampleAndStatus();
              }}
              className="w-full"
            >
              状態を更新
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
        <p className="text-center text-stone-400">読み込み中...</p>
      </div>
    </div>
  );
}
