"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TapEnlargeImage } from '@/components/common/TapEnlargeImage';
import { PhaseBanner } from '@/components/common/PhaseBanner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { Toast } from '@/components/common/Toast';
import { FlavorChips } from '@/components/common/FlavorChips';
import {
  DynamicParticipantGuessGrid,
  DynamicScoringResultsTable,
  DynamicTruthSummary,
} from '@/components/scoring/ScoringResultsViews';
import { BottleTruthMetaSummary } from '@/components/common/BottleTruthMeta';
import type { ItemGradesMap } from '@/lib/scoring-schema';
import { copyToClipboard, getParticipantToken, setParticipantToken as persistParticipantToken } from '@/lib/utils';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import { FlavorIntensityRadarChart } from '@/components/flavor/FlavorIntensityRadarChart';
import { PresenterTastingTier2Summary } from '@/components/flavor/PresenterTastingTier2Summary';
import {
  flavorRadarChartLabels,
  formatSampleHeadingLabel,
  hasAnyPresenterTastingTier2,
  hasNonZeroTier1CountsForNightingaleChart,
  tier1CountsForNightingaleChartDisplay,
} from '@/lib/json-helpers';
import {
  FLAVOR_NIGHTINGALE_PRESENTER_DETAIL_CAPTION,
  PARTICIPANT_SAMPLE_RADAR_CAPTION,
} from '@/lib/nightingale-chart-captions';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { NextClickProgress } from '@/components/common/NextClickProgress';
import { formatSampleLabel } from '@/lib/ui-labels';

function flavorCommentRowHasContent(
  comment:
    | {
        nose?: { tier1_tags?: string[]; tier2_terms?: string[]; text?: string | null };
        palate?: { tier1_tags?: string[]; tier2_terms?: string[]; text?: string | null };
        finish?: { tier1_tags?: string[]; tier2_terms?: string[]; text?: string | null };
      }
    | undefined,
): boolean {
  if (!comment) return false;
  const sec = (x: { tier1_tags?: string[]; tier2_terms?: string[]; text?: string | null } | undefined) =>
    (x?.tier1_tags?.length ?? 0) > 0 ||
    (x?.tier2_terms?.length ?? 0) > 0 ||
    !!((x?.text ?? '').trim().length > 0);
  return sec(comment.nose) || sec(comment.palate) || sec(comment.finish);
}

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
            scoring_snapshot?: unknown;
            truth: {
              true_cask: string;
              true_region: string;
              true_age: number | null;
              true_abv: number | null;
              true_distillery: string;
              true_other1?: string | null;
              true_other2?: string | null;
              true_bottler_name?: string | null;
              true_distillation_year?: number | null;
              true_bottling_year?: number | null;
              notes?: string | null;
              bottle_image_url?: string | null;
            };
    participant_answers: Array<{
      participant_id: string;
      display_name: string;
      guessed_cask: string;
      guessed_region: string;
      guessed_age: number | null;
      guessed_abv: number | null;
      guessed_distillery: string;
      guessed_other1?: string | null;
      guessed_other2?: string | null;
      is_correct_distillery: boolean;
      is_correct?: boolean | null;
      item_grades?: ItemGradesMap | null;
      score: number;
    }>;
    comments?: Array<{
      participant_id: string;
      display_name: string;
      nose: {
        tier1_tags: string[];
        tier2_terms: string[];
        text: string | null;
        tier1_intensity?: Record<string, number>;
      };
      palate: {
        tier1_tags: string[];
        tier2_terms: string[];
        text: string | null;
        tier1_intensity?: Record<string, number>;
      };
      finish: {
        tier1_tags: string[];
        tier2_terms: string[];
        text: string | null;
        tier1_intensity?: Record<string, number>;
      };
    }>;
    radar?: {
      tier1_counts: Record<string, number>;
    };
    other_terms?: Array<{
      term: string;
      count: number;
    }>;
    presenter_tasting_tier2?: {
      nose: string[];
      palate: string[];
      finish: string[];
    };
    per_participant_radar?: Array<{
      participant_id: string;
      tier1_counts: Record<string, number>;
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
    clicked_participants?: Array<{ participant_id: string; display_name: string }>;
  };
  tier1_nightingale_colors: Record<string, { r: number; g: number; b: number }>;
  flavor_chart_snapshot: unknown;
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
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const debugTok = sp.get('debug_participant_token');
        if (debugTok) {
          persistParticipantToken(joinToken, debugTok);
          const url = new URL(window.location.href);
          url.searchParams.delete('debug_participant_token');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          setParticipantToken(debugTok);
          return true;
        }
      }
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
    if (!result?.rankings) return;

    if (
      selectedParticipantId &&
      !result.rankings.some((r) => r.participant_id === selectedParticipantId)
    ) {
      setSelectedParticipantId(null);
      return;
    }

    if (!selectedParticipantId && participantId) {
      if (result.rankings.some((r) => r.participant_id === participantId)) {
        setSelectedParticipantId(participantId);
      }
    }
  }, [participantId, selectedParticipantId, result?.rankings]);

  const rankingPeers = useMemo(() => {
    if (!result?.rankings?.length) return [];
    return result.rankings.map((r) => ({
      participant_id: r.participant_id,
      display_name: r.display_name,
    }));
  }, [result?.rankings]);

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

  // aggregating: 集計待ちの案内はセッションホーム。published: 結果ページへ直接（ホームに留まると自動遷移が無い）
  useEffect(() => {
    if (!joinToken || !result) return;
    const sessionState = result.session?.state;
    if (sessionState === 'published') {
      router.push(`/session/${joinToken}/results`);
      return;
    }
    if (sessionState === 'aggregating') {
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
      `【${result.session.title}】${formatSampleLabel(result.sample_detail.sample_label)} の結果`,
      '',
      ...result.rankings.map(
        (r) =>
          `${r.rank}位 ${disambiguatedDisplayName(r.display_name, r.participant_id, rankingPeers)} - ${r.total_score}点`,
      ),
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

    // 参加トークンがあるのに participant_id 未取得の間は待つ（未取得で誤ってセッションへ飛ばし、結果ページに届かないのを防ぐ）
    if (participantToken && !participantId) return;

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
  }, [result?.active_sample?.id, result?.active_sample?.presenter_participant_id, joinToken, sampleId, participantId, participantToken, router]);

  // participantTokenからparticipant_idを取得（次ラウンドPresenter判定用）
  useEffect(() => {
    if (!joinToken || !participantToken) return;

    const loadParticipant = async () => {
      try {
        const response = await fetch(
          `/api/participants/me?join_token=${joinToken}&participant_token=${participantToken}`,
        );
        const result = await response.json();
        if (response.ok && result.data?.id) {
          setParticipantId(result.data.id);
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
      const response = await fetch('/api/round-result/click-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          sample_id: sampleId,
        }),
      });

      const resultData = await response.json();


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
    return <PageSkeleton rows={4} />;
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
          {result.session.title} - {formatSampleLabel(sample_detail.sample_label)} の結果
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
                ? 'border-b-2 border-bd-accent text-bd-accent'
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
                ? 'border-b-2 border-bd-accent text-bd-accent'
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
                ? 'border-b-2 border-bd-accent text-bd-accent'
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
                        className={`ui-tr ${participantId && ranking.participant_id === participantId ? 'bg-bd-accent/10' : ''}`}
                      >
                        <td className="py-3 px-4 font-semibold text-stone-100">{ranking.rank}</td>
                        <td className="py-3 px-4 text-stone-100 break-words max-w-[200px]">
                          {disambiguatedDisplayName(ranking.display_name, ranking.participant_id, rankingPeers)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-lg text-bd-accent">
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
                  <h3 className="text-xl font-semibold text-stone-100 tracking-tight">
                    {formatSampleHeadingLabel(sample_detail.sample_label)}
                  </h3>
                  {sample_detail.presenter_name && (
                    <p className="text-sm text-stone-400 mt-1">
                      持ち込み: {sample_detail.presenter_name}
                    </p>
                  )}
                </div>
                {truth.bottle_image_url && (
                  <TapEnlargeImage
                    src={truth.bottle_image_url}
                    alt={`${formatSampleLabel(sample_detail.sample_label)} ボトル画像`}
                  />
                )}
              </div>

              <div className="mb-6 p-4 bg-neutral-700 rounded-xl border border-white/10">
                <h4 className="font-semibold text-stone-100 mb-3">正解</h4>
                <DynamicTruthSummary
                  scoringSnapshot={sample_detail.scoring_snapshot ?? null}
                  truth={truth}
                />
                <BottleTruthMetaSummary
                  true_bottler_name={truth.true_bottler_name ?? undefined}
                  true_distillation_year={truth.true_distillation_year ?? null}
                  true_bottling_year={truth.true_bottling_year ?? null}
                  alwaysShow
                />
              </div>

              <div className="mb-6 p-4 bg-neutral-800/80 rounded-xl border border-bd-accent/25">
                <h4 className="font-semibold text-stone-100 mb-2 tracking-tight">メモ</h4>
                <p className="text-stone-300 whitespace-pre-wrap text-sm leading-relaxed min-h-[1.25rem]">
                  {(truth.notes ?? '').length > 0 ? truth.notes : (
                    <span className="text-stone-500">—</span>
                  )}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-stone-100 mb-4">参加者の回答</h4>
                <DynamicScoringResultsTable
                  scoringSnapshot={sample_detail.scoring_snapshot ?? null}
                  truth={truth}
                  answers={sample_detail.participant_answers}
                  highlightParticipantId={participantId}
                />
              </div>

              {/* フレーバー・ナイチンゲール・ローズ・チャート（Presenter パネルの入力のみ） */}
              {(() => {
                const radar = sample_detail.radar;
                const presenterTier2 = sample_detail.presenter_tasting_tier2 ?? {
                  nose: [],
                  palate: [],
                  finish: [],
                };
                const snapForChart = result.flavor_chart_snapshot;
                const chartTier1 = tier1CountsForNightingaleChartDisplay(radar?.tier1_counts, snapForChart);
                const hasRadar = hasNonZeroTier1CountsForNightingaleChart(radar?.tier1_counts, snapForChart);
                const hasPresenterTier2 = hasAnyPresenterTastingTier2(presenterTier2);
                const hasOtherList = (sample_detail.other_terms?.length ?? 0) > 0;
                if (!hasRadar && !hasPresenterTier2 && !hasOtherList) {
                  return null;
                }
                const labels = hasRadar && Object.keys(chartTier1).length ? flavorRadarChartLabels(chartTier1) : [];
                const values = hasRadar ? labels.map((l) => chartTier1[l] as number) : [];

                return (
                  <div className="mt-6 space-y-6">
                    <div>
                      <h4 className="font-semibold text-stone-100 mb-2 tracking-tight">
                        フレーバー・ナイチンゲール・ローズ・チャート（{formatSampleHeadingLabel(sample_detail.sample_label)}）
                      </h4>
                      <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                        プレゼンター画面で入力したテイスティングのみを表示しています。
                      </p>
                      {hasOtherList ? (
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed -mt-2">
                          「その他一覧」は回答者全員のうち Tier1 で「その他」を選んだ回答の Tier2 集計です。
                        </p>
                      ) : null}
                      {hasRadar ? (
                        <FlavorIntensityRadarChart
                          labels={labels}
                          values={values}
                          caption={FLAVOR_NIGHTINGALE_PRESENTER_DETAIL_CAPTION}
                          tier1NightingaleColors={result.tier1_nightingale_colors}
                        />
                      ) : null}
                      {hasPresenterTier2 ? (
                        <PresenterTastingTier2Summary data={presenterTier2} />
                      ) : null}
                    </div>

                    {/* その他一覧 */}
                    {sample_detail.other_terms && sample_detail.other_terms.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-stone-100 mb-4 tracking-tight">
                          その他一覧（{formatSampleHeadingLabel(sample_detail.sample_label)}）
                        </h4>
                        <div className="bg-neutral-800 rounded-xl p-6 border border-white/10">
                          <div className="space-y-2">
                            {sample_detail.other_terms.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-neutral-700 rounded-lg border border-white/10">
                                <span className="text-stone-100 break-words">{item.term}</span>
                                <span className="text-bd-accent font-semibold ml-4 flex-shrink-0">{item.count}回</span>
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
                        ? 'bg-bd-ink text-bd-paper'
                        : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                    }`}
                  >
                    {disambiguatedDisplayName(ranking.display_name, ranking.participant_id, rankingPeers)}
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
              const radarEntry = sample_detail.per_participant_radar?.find(
                (r) => r.participant_id === selectedParticipantId
              );
              const snapForChart = result.flavor_chart_snapshot;
              const chartTier1 = tier1CountsForNightingaleChartDisplay(radarEntry?.tier1_counts, snapForChart);
              const showParticipantRadar = hasNonZeroTier1CountsForNightingaleChart(
                radarEntry?.tier1_counts,
                snapForChart,
              );
              const showFlavorText = flavorCommentRowHasContent(comment);

              if (!participant || (!answer && !showParticipantRadar && !showFlavorText)) return null;

              const radarLabels =
                showParticipantRadar && Object.keys(chartTier1).length
                  ? flavorRadarChartLabels(chartTier1)
                  : undefined;
              const radarValues = radarLabels?.map((l) => chartTier1[l] as number) ?? [];

              return (
                <div className="ui-card p-6">
                  <h3 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">
                      {disambiguatedDisplayName(participant.display_name, participant.participant_id, rankingPeers)} の回答
                  </h3>
                  
                  {answer ? (
                    <div className="mb-4 p-3 bg-neutral-700 rounded-lg">
                      <div className="text-sm font-medium text-stone-400 mb-2">推測</div>
                      <DynamicParticipantGuessGrid
                        scoringSnapshot={sample_detail.scoring_snapshot ?? null}
                        answer={answer}
                      />
                    </div>
                  ) : null}

                  {showParticipantRadar && radarLabels && radarLabels.length > 0 ? (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-stone-400 mb-1">
                        フレーバー・ナイチンゲール・ローズ・チャート（この参加者）
                      </div>
                      <p className="text-xs text-stone-500 mb-3 leading-relaxed">
                        当該参加者が回答画面で入力したテイスティングです。
                      </p>
                      <FlavorIntensityRadarChart
                        labels={radarLabels}
                        values={radarValues}
                        caption={PARTICIPANT_SAMPLE_RADAR_CAPTION}
                        tier1NightingaleColors={result.tier1_nightingale_colors}
                      />
                    </div>
                  ) : null}

                  {showFlavorText && comment ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-stone-400">フレーバーコメント</div>
                      <FlavorChips label="Nose" flavor={comment.nose} />
                      <FlavorChips label="Palate" flavor={comment.palate} />
                      <FlavorChips label="Finish" flavor={comment.finish} />
                    </div>
                  ) : null}
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
              {lastUpdatedAt && <span>更新: {formatTime(lastUpdatedAt)}</span>}
              <button
                type="button"
                onClick={() => loadResult({ manual: true })}
                disabled={isRefreshing}
                className={`px-3 py-2 rounded-lg border border-white/10 min-h-[44px] transition-all ${
                  isRefreshing
                    ? 'bg-neutral-800 text-stone-500 opacity-60 cursor-not-allowed'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-stone-200'
                }`}
              >
                {isRefreshing ? '更新中...' : '更新'}
              </button>
            </div>
          </div>

          {!result.all_clicked_next && typeof result.next_clicks?.total_count === 'number' && (
            <div className="mb-4">
              <NextClickProgress
                clickedCount={result.next_clicks.clicked_count}
                totalCount={result.next_clicks.total_count}
                notClicked={result.next_clicks.not_clicked_participants ?? []}
                clicked={result.next_clicks.clicked_participants}
                peers={rankingPeers}
              />
            </div>
          )}

          {result.all_clicked_next ? (
            <div className="text-center">
              {/* 参加者（participantTokenあり）かつ次ラウンドのPresenterのみ、自分から次へ進める */}
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
                        const nextLabel = result.next_sample?.label
                          ? formatSampleLabel(result.next_sample.label)
                          : '次のラウンド';
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
                        次のラウンドのプレゼンターが開始するまでお待ちください。
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
                          // 逐次最終ラウンド: revealed のまま check-complete では aggregating にならない。
                          // 先に start-next（次サンプル無し）で集計フェーズへ進める。
                          try {
                            if (participantToken) {
                              await fetch('/api/round-result/start-next', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  participant_token: participantToken,
                                  sample_id: sampleId,
                                }),
                              }).catch(() => null);
                            }
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
                        const nextLabel = result.next_sample?.label
                          ? formatSampleLabel(result.next_sample.label)
                          : '次のラウンド';
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
                        try {
                          if (participantToken) {
                            await fetch('/api/round-result/start-next', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                participant_token: participantToken,
                                sample_id: sampleId,
                              }),
                            }).catch(() => null);
                          }
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


