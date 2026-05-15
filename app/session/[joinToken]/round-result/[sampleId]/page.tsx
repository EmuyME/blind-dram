"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { CorrectnessBadge } from '@/components/common/CorrectnessBadge';
import { FlavorChips } from '@/components/common/FlavorChips';
import { copyToClipboard, getParticipantToken } from '@/lib/utils';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RoundResult {
  session: {
    id: string;
    title: string;
    mode: 'sequential' | 'simultaneous';
    state: string;
  };
  current_sample: {
    id: string;
    label: string;
  };
  rankings: Array<{
    rank: number;
    participant_id: string;
    display_name: string;
    total_score: number;
    sample_scores: Array<{
      sample_id: string;
      sample_label: string;
      score: number;
    }>;
  }>;
          sample_detail: {
            sample_id: string;
            sample_label: string;
            presenter_name?: string | null;
            truth: {
              true_cask: string;
              true_region: string;
              true_age: number;
              true_abv: number;
              true_distillery: string;
              bottle_image_url?: string | null;
            };
    participant_answers: Array<{
      participant_id: string;
      display_name: string;
      guessed_cask: string;
      guessed_region: string;
      guessed_age: number;
      guessed_abv: number;
      guessed_distillery: string;
      is_correct_distillery: boolean;
      score: number;
    }>;
    comments?: Array<{
      participant_id: string;
      display_name: string;
      nose: { tier1_tags: string[]; tier2_terms: string[]; text: string | null };
      palate: { tier1_tags: string[]; tier2_terms: string[]; text: string | null };
      finish: { tier1_tags: string[]; tier2_terms: string[]; text: string | null };
    }>;
    radar?: {
      tier1_counts: Record<string, number>;
    };
    other_terms?: Array<{
      term: string;
      count: number;
    }>;
  };
  active_sample: { id: string; label: string | null; state: string | null; presenter_participant_id?: string | null } | null;
  has_next_sample: boolean;
  next_sample: { id: string; label: string; presenter_participant_id?: string | null } | null;
  all_clicked_next: boolean;
  next_clicks: {
    clicked_count: number;
    total_count: number;
    not_clicked_participants: Array<{ participant_id: string; display_name: string }>;
  };
}

export default function RoundResultPage() {
  const params = useParams();
  const router = useRouter();
  const [joinToken, setJoinToken] = useState<string>('');
  const [sampleId, setSampleId] = useState<string>('');
  const [participantToken, setParticipantToken] = useState<string>('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const tokenPollRef = useRef<number | null>(null);

  useEffect(() => {
    if (params && typeof params.joinToken === 'string') {
      setJoinToken(params.joinToken);
    }
    if (params && typeof params.sampleId === 'string') {
      setSampleId(params.sampleId);
    }
  }, [params]);

  // joinTokenが確定した後にparticipant_tokenを取得（遅延保存に備えて短時間ポーリング）
  useEffect(() => {
    if (!joinToken) return;

    const loadToken = () => {
      const token = getParticipantToken(joinToken);
      if (token) {
        setParticipantToken(token);
        return true;
      }
      return false;
    };

    if (loadToken()) {
      return;
    }

    if (tokenPollRef.current) {
      window.clearInterval(tokenPollRef.current);
    }

    tokenPollRef.current = window.setInterval(() => {
      if (loadToken()) {
        if (tokenPollRef.current) {
          window.clearInterval(tokenPollRef.current);
          tokenPollRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (tokenPollRef.current) {
        window.clearInterval(tokenPollRef.current);
        tokenPollRef.current = null;
      }
    };
  }, [joinToken]);

  const { toast, showToast, hideToast } = useToast();
  const [result, setResult] = useState<RoundResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClickingNext, setIsClickingNext] = useState(false);
  const [isStartingNextRound, setIsStartingNextRound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'ranking' | 'details' | 'participants'>('ranking');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (!joinToken) return;
    if (typeof window === 'undefined') return;
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'ranking' || tab === 'details' || tab === 'participants') {
      setActiveTab(tab);
    }
  }, [joinToken]);

  useEffect(() => {
    if (participantId && !selectedParticipantId) {
      setSelectedParticipantId(participantId);
    }
  }, [participantId, selectedParticipantId]);

  const loadResult = useCallback(async (options?: { manual?: boolean }) => {
    if (!joinToken || !sampleId) {
      setIsLoading(false);
      return;
    }

    if (options?.manual) setIsRefreshing(true);

    try {
      const response = await fetch(`/api/round-result/get?join_token=${joinToken}&sample_id=${sampleId}`);
      const resultData = await response.json();

      if (!response.ok) {
        showToast(resultData.error || '結果取得に失敗しました', 'error');
        setIsLoading(false);
        return;
      }

      if (resultData.data) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'round-result/page.tsx:loadResult',message:'Result data loaded',data:{all_clicked_next:resultData.data.all_clicked_next,has_next_sample:resultData.data.has_next_sample,next_sample_id:resultData.data.next_sample?.id||null,next_sample_presenter_id:resultData.data.next_sample?.presenter_participant_id||null,session_state:resultData.data.session?.state,current_sample_id:resultData.data.current_sample?.id||null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setResult(resultData.data);
        setLastUpdatedAt(Date.now());
      } else {
        showToast('結果データが見つかりません', 'error');
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
      if (options?.manual) setIsRefreshing(false);
    }
  }, [joinToken, sampleId, showToast]);

  useEffect(() => {
    if (joinToken && sampleId) {
      loadResult();
      // 定期的に更新（全員が「次へ」を押したかチェック）
      const interval = setInterval(() => {
        loadResult();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [joinToken, sampleId, loadResult]);

  // セッション状態が変わった場合（aggregating/published）、セッションページへ自動リダイレクト
  useEffect(() => {
    if (!joinToken || !result) return;
    const sessionState = result.session?.state;
    if (sessionState === 'aggregating' || sessionState === 'published') {
      router.push(`/session/${joinToken}?from=round-result`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- result 参照は session.state のみ必要
  }, [result?.session?.state, joinToken, router]);

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getCurrentUrl = () => (typeof window !== 'undefined' ? window.location.href : '');
  const getTabUrl = (tab: 'ranking' | 'details' | 'participants') => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    return url.toString();
  };

  const handleCopyLink = async (url: string) => {
    const ok = await copyToClipboard(url);
    showToast(ok ? 'リンクをコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = getCurrentUrl();
    const title = result?.session?.title ? `${result.session.title} - 結果` : 'Blind Dram';
    const text = 'ラウンド結果を共有します';

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url });
        showToast('共有しました', 'success');
        return;
      }
    } catch {
      // fallthrough
    }
    await handleCopyLink(url);
  };

  const handleCopyRankingText = async () => {
    if (!result) return;
    const lines = [
      `【${result.session.title}】Sample ${result.sample_detail.sample_label} の結果`,
      '',
      ...result.rankings.map((r) => `${r.rank}位 ${r.display_name} - ${r.total_score}点`),
    ];
    await handleCopyLink(lines.join('\n'));
  };

  // 次ラウンドが開始されたら、自動で結果ページから離脱して次の画面へ
  // - Presenter: presenter 画面へ
  // - それ以外: 回答入力（round）へ
  useEffect(() => {
    if (!joinToken || !sampleId || !result?.active_sample) return;
    const active = result.active_sample;
    if (!active?.id) return;
    if (active.id === sampleId) return;

    // participantId がまだ取得できていない場合は、いったんセッションへ戻す
    if (!participantId) {
      router.push(`/session/${joinToken}`);
      return;
    }

    const isActivePresenter =
      !!active.presenter_participant_id && active.presenter_participant_id === participantId;

    if (isActivePresenter) {
      router.push(`/session/${joinToken}/presenter/${active.id}`);
    } else {
      router.push(`/session/${joinToken}/round/${active.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- active_sample は id / presenter で十分
  }, [result?.active_sample?.id, result?.active_sample?.presenter_participant_id, joinToken, sampleId, participantId, router]);

  // participantTokenからparticipant_idを取得（次ラウンドPresenter判定用）
  useEffect(() => {
    if (!joinToken || !participantToken) return;

    const loadParticipant = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            location:'app/session/[joinToken]/round-result/[sampleId]/page.tsx:150',
            message:'Loading participant for round-result',
            data:{has_join_token:!!joinToken,has_participant_token:!!participantToken},
            timestamp:Date.now(),
            sessionId:'debug-session',
            runId:'run1',
            hypothesisId:'H_NEXT_PRESENTER'
          })
        }).catch(()=>{});
        // #endregion
        const response = await fetch(
          `/api/participants/me?join_token=${joinToken}&participant_token=${participantToken}`,
        );
        const result = await response.json();
        if (response.ok && result.data?.id) {
          setParticipantId(result.data.id);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              location:'app/session/[joinToken]/round-result/[sampleId]/page.tsx:166',
              message:'Participant loaded for round-result',
              data:{participant_id:result.data.id},
              timestamp:Date.now(),
              sessionId:'debug-session',
              runId:'run1',
              hypothesisId:'H_NEXT_PRESENTER'
            })
          }).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        console.error('Load participant error:', error);
      }
    };

    loadParticipant();
  }, [joinToken, participantToken]);

  const handleClickNext = async () => {
    if (!participantToken || !sampleId || isClickingNext) {
      return;
    }

    setIsClickingNext(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/round-result/[sampleId]/page.tsx:204',message:'handleClickNext - called',data:{has_participant_token:!!participantToken,sample_id:sampleId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H_CLICK_NEXT'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/round-result/click-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
        }),
      });

      const resultData = await response.json();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/session/[joinToken]/round-result/[sampleId]/page.tsx:214',message:'handleClickNext - API response',data:{ok:response.ok,all_clicked:resultData?.data?.all_clicked,error:resultData?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H_CLICK_NEXT'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        showToast(resultData.error || 'エラーが発生しました', 'error');
        return;
      }

      // 結果を再読み込み（全員がクリックしたか確認するため）
      await loadResult();
      
      if (resultData.data.all_clicked) {
        showToast('全員が「次へ」を押しました。次のラウンドに進む準備ができました', 'success');
        // 自動リダイレクトは行わない（ユーザーが明示的にボタンを押すまで待機）
      } else {
        showToast('「次へ」を押しました。他の参加者を待っています。', 'success');
      }
    } catch (error) {
      console.error('Click next error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsClickingNext(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <p className="text-center text-stone-400">読み込み中...</p>
      </div>
    );
  }

  if (!result || !result.session || !result.current_sample || !result.sample_detail) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <PhaseBanner sessionState="running" mode="sequential" />
        <div className="max-w-md mx-auto mt-8">
          <p className="text-center text-stone-400">結果が見つかりません</p>
        </div>
      </div>
    );
  }

  const { sample_detail } = result;
  const truth = sample_detail.truth;

  return (
    <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
      <PhaseBanner sessionState="running" mode="sequential" />

      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">
          {result.session.title} - Sample {sample_detail.sample_label} の結果
        </h1>

        <div className="ui-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ui-h3">共有</h2>
              <p className="text-sm ui-muted mt-1">
                リンクや順位表を簡単に共有できます。
              </p>
            </div>
            {participantId && (
              <div className="text-xs text-stone-400">
                <span className="px-2 py-1 rounded-full border border-white/10 bg-neutral-900/30">
                  自分の行をハイライト中
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
            <Button variant="secondary" onClick={() => handleCopyLink(getCurrentUrl())} className="w-full">
              リンクをコピー
            </Button>
            <Button variant="secondary" onClick={() => handleCopyLink(getTabUrl('ranking'))} className="w-full">
              順位表リンクをコピー
            </Button>
            <Button variant="secondary" onClick={handleCopyRankingText} className="w-full">
              順位表をテキストでコピー
            </Button>
            <Button variant="primary" onClick={handleShare} className="w-full">
              共有
            </Button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 min-h-[44px] font-medium transition-all ${
              activeTab === 'ranking'
                ? 'border-b-2 border-[#C88A2B] text-[#C88A2B]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            順位表
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 min-h-[44px] font-medium transition-all ${
              activeTab === 'details'
                ? 'border-b-2 border-[#C88A2B] text-[#C88A2B]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            詳細
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 min-h-[44px] font-medium transition-all ${
              activeTab === 'participants'
                ? 'border-b-2 border-[#C88A2B] text-[#C88A2B]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            参加者
          </button>
        </div>

        {/* 順位表 */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <div className="ui-card p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">現段階での順位表</h2>
              <div className="overflow-x-auto">
                <table className="ui-table">
                  <thead>
                    <tr className="ui-thead">
                      <th className="ui-th px-4">順位</th>
                      <th className="ui-th px-4">参加者</th>
                      <th className="ui-th px-4 text-right">合計点数</th>
                      {result.rankings[0]?.sample_scores && result.rankings[0].sample_scores.map((sample) => (
                        <th key={sample.sample_id} className="ui-th px-4 text-right">
                          {sample.sample_label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rankings.map((ranking) => (
                      <tr
                        key={ranking.participant_id}
                        className={`ui-tr ${participantId && ranking.participant_id === participantId ? 'bg-[#C88A2B]/10' : ''}`}
                      >
                        <td className="py-3 px-4 font-semibold text-stone-100">{ranking.rank}</td>
                        <td className="py-3 px-4 text-stone-100 break-words max-w-[200px]">{ranking.display_name}</td>
                        <td className="py-3 px-4 text-right font-semibold text-lg text-[#C88A2B]">
                          {ranking.total_score}
                        </td>
                        {ranking.sample_scores && ranking.sample_scores.map((sample) => (
                          <td key={sample.sample_id} className="py-3 px-4 text-right text-stone-100">
                            {sample.score}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 詳細 */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="ui-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-stone-100 tracking-tight">Sample {sample_detail.sample_label}</h3>
                  {sample_detail.presenter_name && (
                    <p className="text-sm text-stone-400 mt-1">
                      持ち込み: {sample_detail.presenter_name}
                    </p>
                  )}
                </div>
                {truth.bottle_image_url && (
                  <Image
                    src={truth.bottle_image_url}
                    alt={`Sample ${sample_detail.sample_label} ボトル画像`}
                    width={80}
                    height={80}
                    className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg border border-white/10 flex-shrink-0"
                  />
                )}
              </div>

              <div className="mb-6 p-4 bg-neutral-700 rounded-xl border border-white/10">
                <h4 className="font-semibold text-stone-100 mb-3">正解</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-stone-400">カスク: <span className="text-stone-100 font-medium">{truth.true_cask}</span></div>
                  <div className="text-stone-400">地域: <span className="text-stone-100 font-medium">{truth.true_region}</span></div>
                  <div className="text-stone-400">年数: <span className="text-stone-100 font-medium">{truth.true_age}年</span></div>
                  <div className="text-stone-400">度数: <span className="text-stone-100 font-medium">{truth.true_abv}%</span></div>
                  <div className="col-span-2 text-stone-400">蒸留所: <span className="text-stone-100 font-medium">{truth.true_distillery}</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-stone-100 mb-4">参加者の回答</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-neutral-900/30">
                        <th className="text-left py-3 px-3 text-stone-200 font-semibold">参加者</th>
                        <th className="text-left py-3 px-3 text-stone-200 font-semibold">
                          カスク
                          <span className="text-xs text-stone-400 block font-normal">正解: {truth.true_cask}</span>
                        </th>
                        <th className="text-left py-3 px-3 text-stone-200 font-semibold">
                          地域
                          <span className="text-xs text-stone-400 block font-normal">正解: {truth.true_region}</span>
                        </th>
                        <th className="text-left py-3 px-3 text-stone-200 font-semibold">
                          年数
                          <span className="text-xs text-stone-400 block font-normal">正解: {truth.true_age}年</span>
                        </th>
                        <th className="text-left py-3 px-3 text-stone-200 font-semibold">
                          度数
                          <span className="text-xs text-stone-400 block font-normal">正解: {truth.true_abv}%</span>
                        </th>
                        <th className="text-left py-3 px-3 text-stone-200 font-semibold">
                          蒸留所
                          <span className="text-xs text-stone-400 block font-normal">正解: {truth.true_distillery}</span>
                        </th>
                        <th className="text-right py-3 px-3 text-stone-200 font-semibold">点数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sample_detail.participant_answers.map((answer) => {
                        const caskCorrect = answer.guessed_cask === truth.true_cask;
                        const regionCorrect = answer.guessed_region === truth.true_region;
                        const ageCorrect = answer.guessed_age === truth.true_age;
                        const abvCorrect = answer.guessed_abv === truth.true_abv;
                        const distilleryCorrect = answer.is_correct_distillery;
                        
                        return (
                          <tr
                            key={answer.participant_id}
                            className={`border-b border-white/5 hover:bg-neutral-700/40 transition-colors ${
                              participantId && answer.participant_id === participantId ? 'bg-[#C88A2B]/10' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-medium text-stone-100 break-words max-w-[150px]">{answer.display_name}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-stone-100 break-words">{answer.guessed_cask || '-'}</span>
                                <CorrectnessBadge value={caskCorrect} />
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-stone-100 break-words">{answer.guessed_region || '-'}</span>
                                <CorrectnessBadge value={regionCorrect} />
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-stone-100">{answer.guessed_age || '-'}</span>
                                <CorrectnessBadge value={ageCorrect} />
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-stone-100">{answer.guessed_abv || '-'}</span>
                                <CorrectnessBadge value={abvCorrect} />
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-stone-100 break-words max-w-[200px]">{answer.guessed_distillery || '-'}</span>
                                <CorrectnessBadge value={distilleryCorrect} />
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-[#C88A2B]">{answer.score}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* レーダーチャート（サンプル別） */}
              {(() => {
                const radar = sample_detail.radar;
                if (!radar?.tier1_counts || Object.keys(radar.tier1_counts).length === 0) {
                  return null;
                }
                const labels = Object.keys(radar.tier1_counts).filter(label => label !== 'その他');
                const data = labels.map(label => radar.tier1_counts[label] as number);
                const maxValue = Math.max(...data, 1);
                
                const chartData = {
                  labels,
                  datasets: [
                    {
                      label: '選択回数',
                      data,
                      backgroundColor: 'rgba(200, 138, 43, 0.15)',
                      borderColor: 'rgba(200, 138, 43, 0.8)',
                      borderWidth: 2,
                      pointBackgroundColor: 'rgba(200, 138, 43, 1)',
                      pointBorderColor: 'rgba(245, 245, 244, 1)',
                      pointHoverBackgroundColor: 'rgba(200, 138, 43, 1)',
                      pointHoverBorderColor: 'rgba(245, 245, 244, 1)',
                    },
                  ],
                };
                
                const chartOptions = {
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 1.2,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: maxValue,
                      ticks: {
                        stepSize: Math.ceil(maxValue / 5),
                        color: 'rgba(245, 245, 244, 0.6)',
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                      },
                      pointLabels: {
                        color: 'rgba(245, 245, 244, 0.9)',
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      backgroundColor: 'rgba(38, 38, 38, 0.95)',
                      titleColor: 'rgba(245, 245, 244, 1)',
                      bodyColor: 'rgba(245, 245, 244, 1)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: 1,
                      callbacks: {
                        label: (context: TooltipItem<'radar'>) => `${context.label}: ${context.parsed.r}回`,
                      },
                    },
                  },
                };
                
                return (
                  <div className="mt-6 space-y-6">
                    <div>
                      <h4 className="font-semibold text-stone-100 mb-4 tracking-tight">
                        フレーバーレーダーチャート（Sample {sample_detail.sample_label}）
                      </h4>
                      <div className="bg-neutral-900 rounded-xl p-6">
                        <div className="max-w-2xl mx-auto">
                          <Radar data={chartData} options={chartOptions} />
                        </div>
                      </div>
                    </div>
                    
                    {/* その他一覧 */}
                    {sample_detail.other_terms && sample_detail.other_terms.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-stone-100 mb-4 tracking-tight">
                          その他一覧（Sample {sample_detail.sample_label}）
                        </h4>
                        <div className="bg-neutral-800 rounded-xl p-6 border border-white/10">
                          <div className="space-y-2">
                            {sample_detail.other_terms.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-neutral-700 rounded-lg border border-white/10">
                                <span className="text-stone-100 break-words">{item.term}</span>
                                <span className="text-[#C88A2B] font-semibold ml-4 flex-shrink-0">{item.count}回</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 参加者タブ */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* 参加者選択 */}
            <div className="ui-card p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加者選択</h2>
              <div className="flex flex-wrap gap-2">
                {result.rankings.map((ranking) => (
                  <button
                    key={ranking.participant_id}
                    onClick={() => setSelectedParticipantId(ranking.participant_id)}
                    className={`px-4 py-2 rounded-full min-h-[44px] font-medium transition-all ${
                      selectedParticipantId === ranking.participant_id
                        ? 'bg-[#C88A2B] text-black/90'
                        : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                    }`}
                  >
                    {ranking.display_name}
                  </button>
                ))}
              </div>
            </div>

            {/* 選択された参加者の詳細 */}
            {selectedParticipantId && (() => {
              const participant = result.rankings.find((r) => r.participant_id === selectedParticipantId);
              const answer = sample_detail.participant_answers.find(
                (a) => a.participant_id === selectedParticipantId
              );
              const comment = sample_detail.comments?.find(
                (c) => c.participant_id === selectedParticipantId
              );

              if (!participant || !answer) return null;

              return (
                <div className="ui-card p-6">
                  <h3 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">
                    {participant.display_name} の回答
                  </h3>
                  
                  {/* 推測値 */}
                  <div className="mb-4 p-3 bg-neutral-700 rounded-lg">
                    <div className="text-sm font-medium text-stone-400 mb-2">推測</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-stone-400">カスク: </span>
                        <span className="text-stone-100 break-words">{answer.guessed_cask || '-'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">地域: </span>
                        <span className="text-stone-100 break-words">{answer.guessed_region || '-'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">年数: </span>
                        <span className="text-stone-100">{answer.guessed_age || '-'}年</span>
                      </div>
                      <div>
                        <span className="text-stone-400">度数: </span>
                        <span className="text-stone-100">{answer.guessed_abv || '-'}%</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-stone-400">蒸留所: </span>
                        <span className="text-stone-100 break-words">{answer.guessed_distillery || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-stone-400">点数: </span>
                        <span className="text-[#C88A2B] font-semibold">{answer.score}点</span>
                      </div>
                    </div>
                  </div>

                  {/* フレーバーコメント */}
                  {comment && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-stone-400">フレーバーコメント</div>
                      <FlavorChips label="Nose" flavor={comment.nose} />
                      <FlavorChips label="Palate" flavor={comment.palate} />
                      <FlavorChips label="Finish" flavor={comment.finish} />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 「次へ」ボタン */}
        <div className="ui-card p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-sm font-semibold text-stone-200">次へ</div>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              {typeof result.next_clicks?.total_count === 'number' && (
                <span>
                  進捗: {result.next_clicks.clicked_count}/{result.next_clicks.total_count}
                </span>
              )}
              {lastUpdatedAt && <span>更新: {formatTime(lastUpdatedAt)}</span>}
              <button
                type="button"
                onClick={() => loadResult({ manual: true })}
                disabled={isRefreshing}
                className={`px-3 py-2 rounded-lg border border-white/10 min-h-[36px] transition-all ${
                  isRefreshing
                    ? 'bg-neutral-800 text-stone-500 opacity-60 cursor-not-allowed'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-stone-200'
                }`}
              >
                {isRefreshing ? '更新中...' : '更新'}
              </button>
            </div>
          </div>

          {result.all_clicked_next ? (
            <div className="text-center">
              {/* 参加者（participantTokenあり）かつ次ラウンドのPresenterのみ、自分から次へ進める */}
              {/* #region agent log */}
              {(() => { fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'round-result/page.tsx:button-render',message:'Button display decision',data:{all_clicked_next:result.all_clicked_next,has_next_sample:result.has_next_sample,next_sample_id:result.next_sample?.id||null,next_sample_presenter_id:result.next_sample?.presenter_participant_id||null,participantId:participantId,participantToken_exists:!!participantToken,match:participantId&&result.next_sample?result.next_sample.presenter_participant_id===participantId:false,session_state:result.session?.state},timestamp:Date.now()})}).catch(()=>{}); return null; })()}
              {/* #endregion */}
              {participantToken ? (
                // 既に次ラウンドが開始されている場合（start-next済み）は、待機UIではなくセッションへ誘導
                result.active_sample && result.active_sample.id !== sampleId ? (
                  <>
                    <p className="text-stone-100 mb-2">次のラウンドが開始されました。</p>
                    <p className="text-stone-400 text-sm mb-4">
                      自動で遷移しない場合は、セッションページへ戻って続行してください。
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => router.push(`/session/${joinToken}?from=round-result`)}
                      className="w-full"
                    >
                      セッションページに戻る
                    </Button>
                  </>
                ) :
                result.has_next_sample &&
                result.next_sample &&
                participantId &&
                result.next_sample.presenter_participant_id === participantId ? (
                    <Button
                      variant="primary"
                      onClick={async () => {
                        if (isStartingNextRound) return;
                        const nextLabel = result.next_sample?.label ? `Sample ${result.next_sample.label}` : '次のラウンド';
                        if (typeof window !== 'undefined') {
                          const ok = window.confirm(`${nextLabel} を開始しますか？\n（参加者が回答入力画面に進みます）`);
                          if (!ok) return;
                        }
                        setIsStartingNextRound(true);
                        try {
                          // 次のラウンドを開始（次ラウンドのPresenter）
                          const response = await fetch('/api/round-result/start-next', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              participant_token: participantToken,
                              sample_id: sampleId,
                            }),
                          });

                          const resultData = await response.json();

                          if (!response.ok) {
                            showToast(resultData.error || '次のラウンド開始に失敗しました', 'error');
                            return;
                          }

                          // 次のラウンドページにリダイレクト
                          if (resultData.data.next_sample_id) {
                            // 次ラウンドのPresenter本人の場合はPresenterパネルへ遷移させる
                            router.push(`/session/${joinToken}/presenter/${resultData.data.next_sample_id}`);
                          } else {
                            // セッション完了
                            router.push(`/session/${joinToken}`);
                          }
                        } catch (error) {
                          console.error('Start next round error:', error);
                          showToast('ネットワークエラーが発生しました', 'error');
                        } finally {
                          setIsStartingNextRound(false);
                        }
                      }}
                      disabled={isStartingNextRound}
                      className="w-full"
                    >
                      {isStartingNextRound ? '開始中...' : '次のラウンドへ進む'}
                    </Button>
                  ) : result.has_next_sample ? (
                    <>
                      <p className="text-stone-100 mb-2">全員が「次へ」を押しました。</p>
                      <p className="text-stone-400 text-sm mb-4">
                        次のラウンドのPresenterが開始するまでお待ちください。
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => router.push(`/session/${joinToken}?from=round-result`)}
                        className="w-full"
                      >
                        セッションページに戻る
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-stone-100 mb-2">すべてのラウンドが完了しました。</p>
                      <p className="text-stone-400 text-sm mb-4">
                        セッションページに戻って結果の公開をお待ちください。
                      </p>
                      <Button
                        variant="primary"
                        onClick={async () => {
                          // 逐次モードでは最後のラウンド完了後も session.state が running のまま残り得るため、
                          // ここで check-complete を呼び、aggregating へ進めてからセッションページへ戻す。
                          try {
                            await fetch('/api/session/check-complete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ join_token: joinToken }),
                            }).catch(() => null);
                          } finally {
                            router.push(`/session/${joinToken}?from=round-result`);
                          }
                        }}
                        className="w-full"
                      >
                        セッションページに戻る
                      </Button>
                    </>
                  )
              ) : (
                <>
                  <p className="text-stone-100 mb-4">
                    全員が「次へ」を押しました。準備ができたら次のラウンドに進んでください。
                  </p>
                  {result.has_next_sample && result.next_sample ? (
                    <Button
                      variant="primary"
                      onClick={async () => {
                        if (isStartingNextRound) return;
                        const nextLabel = result.next_sample?.label ? `Sample ${result.next_sample.label}` : '次のラウンド';
                        if (typeof window !== 'undefined') {
                          const ok = window.confirm(`${nextLabel} を開始しますか？\n（参加者が回答入力画面に進みます）`);
                          if (!ok) return;
                        }
                        setIsStartingNextRound(true);
                        try {
                          // 次のラウンドを開始（オーナー／未登録ビューア想定）
                          const response = await fetch('/api/round-result/start-next', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              participant_token: participantToken || null,
                              sample_id: sampleId,
                            }),
                          });

                          const resultData = await response.json();

                          if (!response.ok) {
                            showToast(resultData.error || '次のラウンド開始に失敗しました', 'error');
                            return;
                          }

                          // 次のラウンドページにリダイレクト
                          if (resultData.data.next_sample_id) {
                            router.push(`/session/${joinToken}/round/${resultData.data.next_sample_id}`);
                          } else {
                            // セッション完了
                            router.push(`/session/${joinToken}`);
                          }
                        } catch (error) {
                          console.error('Start next round error:', error);
                          showToast('ネットワークエラーが発生しました', 'error');
                        } finally {
                          setIsStartingNextRound(false);
                        }
                      }}
                      disabled={isStartingNextRound}
                      className="w-full"
                    >
                      {isStartingNextRound ? '開始中...' : '次のラウンドへ進む'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={async () => {
                        // セッション完了の場合、check-complete APIを呼んでセッションをaggregating状態に遷移させる
                        try {
                          const response = await fetch('/api/session/check-complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              join_token: joinToken,
                            }),
                          });

                          const resultData = await response.json();

                          if (!response.ok) {
                            console.error('Check complete error:', resultData.error);
                          }

                          // 状態確認ループはやめて、そのままセッションページへ戻す
                          router.push(`/session/${joinToken}?from=round-result`);
                        } catch (error) {
                          console.error('Check complete error:', error);
                          router.push(`/session/${joinToken}?from=round-result`);
                        }
                      }}
                      className="w-full"
                    >
                      セッションページに戻る
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              {/* participantTokenがない場合でも結果は見られるが「次へ」は押せない */}
              {participantToken ? (
                <Button
                  variant="primary"
                  onClick={handleClickNext}
                  disabled={isClickingNext}
                  className="w-full"
                >
                  {isClickingNext ? '処理中...' : '次へ'}
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-stone-400 text-sm mb-2">
                    結果を確認しました。参加登録済みの参加者のみ「次へ」ボタンを押せます。
                  </p>
                </div>
              )}
              {participantToken && (
                <p className="text-stone-400 text-sm mt-2 text-center">
                  全員が「次へ」を押すと、次のラウンドに進みます。
                </p>
              )}
              {!result.all_clicked_next && result.next_clicks?.not_clicked_participants?.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-neutral-900/40 border border-white/10">
                  <div className="text-xs font-semibold text-stone-300 mb-2">
                    未押下 ({result.next_clicks.not_clicked_participants.length}名)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.next_clicks.not_clicked_participants.map((p) => (
                      <span
                        key={p.participant_id}
                        className="px-3 py-1 rounded-full bg-neutral-800 border border-white/10 text-xs text-stone-200"
                      >
                        {p.display_name || '（名称未設定）'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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


