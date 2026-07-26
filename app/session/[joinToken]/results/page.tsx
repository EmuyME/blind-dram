"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
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
import { copyToClipboard, getOwnerToken, getParticipantToken } from '@/lib/utils';
import { formatRankingMatrixText, sanitizeDownloadBasename } from '@/lib/rankingMatrix';
import {
  captureElementToPngDataUrl,
  captureReportFromRoot,
  type ReportCaptureKind,
  withCaptureVisible,
} from '@/lib/capture-ranking-png';
import { buildResultsPageUrl } from '@/lib/results-share';
import { flavorCommentRowHasContent, preloadImagesInElement } from '@/lib/results-poster';
import { savePngDataUrl } from '@/lib/download-png';
import { ReportCaptureRoot } from '@/components/reports/ReportCaptureRoot';
import {
  ReportPreviewModal,
  type ReportPreviewPayload,
} from '@/components/reports/ReportPreviewModal';
import type { ResultsSnapshot } from '@/lib/report-data/results-snapshot';
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

interface Results {
  session: {
    id: string;
    title: string;
    mode: 'sequential' | 'simultaneous';
    state: string;
    created_at?: string | null;
    public_results?: boolean;
  };
  share?: {
    ranking_image_url: string | null;
    ranking_image_updated_at?: string | null;
  };
  scoring_snapshot?: unknown;
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
  sample_details: Array<{
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
    per_participant_radar?: Array<{
      participant_id: string;
      tier1_counts: Record<string, number>;
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
  }>;
  flavor_radar: {
    tier1_counts: Record<string, number>;
  };
  tier1_nightingale_colors: Record<string, { r: number; g: number; b: number }>;
  /** セッション開始時のフレーバーチャート（ナイチンゲール表示の tier1_nightingale_visible 等） */
  flavor_chart_snapshot: unknown;
}

function toResultsSnapshot(results: Results): ResultsSnapshot {
  return {
    session: {
      id: results.session.id,
      title: results.session.title,
      mode: results.session.mode,
      created_at: results.session.created_at,
    },
    scoring_snapshot: results.scoring_snapshot,
    rankings: results.rankings,
    sample_details: results.sample_details.map((s) => ({
      sample_id: s.sample_id,
      sample_label: s.sample_label,
      presenter_name: s.presenter_name,
      scoring_snapshot: s.scoring_snapshot,
      truth: s.truth,
      participant_answers: s.participant_answers,
    })),
  };
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [joinToken, setJoinToken] = useState<string>('');

  useEffect(() => {
    if (params && typeof params.joinToken === 'string') {
      setJoinToken(params.joinToken);
    }
  }, [params]);

  const { toast, showToast, hideToast } = useToast();
  const [results, setResults] = useState<Results | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ranking' | 'details' | 'participants'>('ranking');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const rankingCaptureRef = useRef<HTMLDivElement | null>(null);
  const posterCaptureWrapperRef = useRef<HTMLDivElement | null>(null);
  const posterCaptureRef = useRef<HTMLDivElement | null>(null);
  const [isTournamentReportBusy, setIsTournamentReportBusy] = useState(false);
  const [isOverallReportBusy, setIsOverallReportBusy] = useState(false);
  const [isPersonalReportBusy, setIsPersonalReportBusy] = useState(false);
  const isAnyReportBusy = isTournamentReportBusy || isOverallReportBusy || isPersonalReportBusy;
  const [isPublishingRankingUrl, setIsPublishingRankingUrl] = useState(false);
  const [rankingImageUrl, setRankingImageUrl] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<ReportPreviewPayload | null>(null);
  const [isSavingPreview, setIsSavingPreview] = useState(false);

  useEffect(() => {
    if (!joinToken) return;
    if (typeof window === 'undefined') return;
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'ranking' || tab === 'details' || tab === 'participants') {
      setActiveTab(tab);
    }
  }, [joinToken]);

  useEffect(() => {
    if (!joinToken) return;
    const token = getParticipantToken(joinToken);
    if (token) setParticipantToken(token);
  }, [joinToken]);

  useEffect(() => {
    if (!joinToken || !participantToken) return;
    const loadMe = async () => {
      try {
        const response = await fetch(
          `/api/participants/me?join_token=${joinToken}&participant_token=${participantToken}`
        );
        const result = await response.json();
        if (response.ok && result.data?.id) {
          setParticipantId(result.data.id);
        }
      } catch {
        // ignore
      }
    };
    loadMe();
  }, [joinToken, participantToken]);

  useEffect(() => {
    if (participantId && !selectedParticipantId) {
      setSelectedParticipantId(participantId);
    }
  }, [participantId, selectedParticipantId]);

  const loadResults = useCallback(async () => {
    if (!joinToken) {
      setIsLoading(false);
      return;
    }

    try {
      const ownerQs = (() => {
        const ot = getOwnerToken(joinToken);
        return ot ? `&owner_token=${encodeURIComponent(ot)}` : '';
      })();
      const response = await fetch(`/api/results/get?join_token=${joinToken}${ownerQs}`);
      const result = await response.json();


      if (!response.ok) {
        showToast(result.error || '結果取得に失敗しました', 'error');
        setIsLoading(false);
        return;
      }

      if (result.data) {
        setResults(result.data);
        setRankingImageUrl(result.data.share?.ranking_image_url ?? null);
      } else {
        showToast('結果データが見つかりません', 'error');
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [joinToken, showToast]);

  useEffect(() => {
    if (joinToken) {
      loadResults();
    } else {
      setIsLoading(false);
    }
  }, [joinToken, loadResults]);

  const rankingPeers = useMemo(() => {
    if (!results?.rankings?.length) return [];
    return results.rankings.map((r) => ({
      participant_id: r.participant_id,
      display_name: r.display_name,
    }));
  }, [results?.rankings]);

  const handleCopyRankingText = async () => {
    if (!results) return;
    const text = formatRankingMatrixText(`【${results.session.title}】最終結果`, results.rankings);
    const ok = await copyToClipboard(text);
    showToast(ok ? '順位表をコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
  };

  const handleCopyResultsPageUrl = async () => {
    if (typeof window === 'undefined' || !joinToken) return;
    const ownerToken = getOwnerToken(joinToken);
    const publicResults = results?.session.public_results !== false;
    const url = buildResultsPageUrl(window.location.origin, joinToken, ownerToken, publicResults);
    const ok = await copyToClipboard(url);
    showToast(ok ? '結果ページのURLをコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
  };

  const handleCopyRankingImageUrl = async () => {
    if (!rankingImageUrl) return;
    const ok = await copyToClipboard(rankingImageUrl);
    showToast(ok ? '順位表画像のURLをコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
  };

  const captureReport = async (
    kind: ReportCaptureKind,
    participantIdForPersonal?: string,
  ): Promise<string | null> => {
    if (!results?.rankings?.length) {
      showToast('順位データがありません', 'error');
      return null;
    }
    if (kind === 'personal' && !participantIdForPersonal) {
      showToast('参加者を選択してください', 'error');
      return null;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise<void>((r) => setTimeout(r, 120));
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined);
    }

    const wrapper = posterCaptureWrapperRef.current;
    const el = posterCaptureRef.current;
    if (!wrapper || !el) {
      showToast('画像を撮影できませんでした。しばらくして再度お試しください。', 'error');
      return null;
    }

    return withCaptureVisible(wrapper, async () => {
      await preloadImagesInElement(el);
      await new Promise<void>((r) => setTimeout(r, 150));
      return captureReportFromRoot(el, kind, participantIdForPersonal);
    });
  };

  const buildReportFilename = (title: string, kind: string, suffix?: string) => {
    const base = sanitizeDownloadBasename(title, 'report');
    const day = new Date().toISOString().split('T')[0];
    const extra = suffix ? `_${suffix}` : '';
    return `${base}_${kind}${extra}_${day}.png`;
  };

  const saveReportPng = async (filename: string, pngDataUrl: string) => {
    const saveResult = await savePngDataUrl(filename, pngDataUrl);
    if (saveResult === 'share') {
      showToast('共有シートから画像を保存できます', 'success');
    } else if (saveResult === 'open') {
      showToast('画像を開きました。長押しして保存できます', 'success');
    } else {
      showToast('レポート画像をダウンロードしました', 'success');
    }
  };

  const openReportPreview = async (
    kind: ReportCaptureKind,
    participantIdForPersonal?: string,
  ) => {
    if (!results) return;
    if (kind === 'personal' && !participantIdForPersonal) {
      showToast('参加者を選択してください', 'error');
      return;
    }

    const setBusy =
      kind === 'tournament'
        ? setIsTournamentReportBusy
        : kind === 'overall'
          ? setIsOverallReportBusy
          : setIsPersonalReportBusy;

    setBusy(true);
    try {
      const pngDataUrl = await captureReport(kind, participantIdForPersonal);
      if (!pngDataUrl) return;

      let filename: string;
      let participantName: string | undefined;
      if (kind === 'personal' && participantIdForPersonal) {
        const participant = results.rankings.find((r) => r.participant_id === participantIdForPersonal);
        participantName = participant
          ? disambiguatedDisplayName(participant.display_name, participant.participant_id, rankingPeers)
          : undefined;
        const nameSuffix = participant
          ? sanitizeDownloadBasename(participant.display_name, 'participant')
          : 'personal';
        filename = buildReportFilename(results.session.title, 'personal', nameSuffix);
      } else {
        filename = buildReportFilename(results.session.title, kind);
      }

      setReportPreview({
        kind,
        title: results.session.title,
        filename,
        pngDataUrl,
        participantName,
      });
    } catch (e) {
      console.error(e);
      if ((e as Error)?.name === 'AbortError') return;
      showToast('画像の作成に失敗しました', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewTournamentReport = () => openReportPreview('tournament');
  const handlePreviewOverallReport = () => openReportPreview('overall');
  const handlePreviewPersonalReport = () => {
    if (!selectedParticipantId) {
      showToast('参加者を選択してください', 'error');
      return;
    }
    void openReportPreview('personal', selectedParticipantId);
  };

  const handleSavePreviewedReport = async () => {
    if (!reportPreview) return;
    setIsSavingPreview(true);
    try {
      await saveReportPng(reportPreview.filename, reportPreview.pngDataUrl);
      setReportPreview(null);
    } catch (e) {
      console.error(e);
      if ((e as Error)?.name === 'AbortError') return;
      showToast('画像の保存に失敗しました', 'error');
    } finally {
      setIsSavingPreview(false);
    }
  };

  const captureRankingPng = async (): Promise<string | null> => {
    if (!results?.rankings?.length) {
      showToast('順位データがありません', 'error');
      return null;
    }

    if (activeTab !== 'ranking') {
      flushSync(() => setActiveTab('ranking'));
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await new Promise<void>((r) => setTimeout(r, 80));
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined);
    }

    const el = rankingCaptureRef.current;
    if (!el) {
      showToast('順位表を撮影できませんでした。しばらくして再度お試しください。', 'error');
      return null;
    }
    return captureElementToPngDataUrl(el);
  };

  const handlePublishRankingImageUrl = async () => {
    const ownerToken = getOwnerToken(joinToken);
    if (!ownerToken) {
      showToast('オーナー画面から開くと順位表画像の公開URLを発行できます', 'error');
      return;
    }

    setIsPublishingRankingUrl(true);
    try {
      const pngDataUrl = await captureRankingPng();
      if (!pngDataUrl) return;

      const blob = await fetch(pngDataUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append('owner_token', ownerToken);
      formData.append('file', blob, 'ranking.png');

      const response = await fetch('/api/owner/publish-ranking-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        showToast(result.error || '公開URLの発行に失敗しました', 'error');
        return;
      }

      const url = result.data?.public_url as string | undefined;
      if (!url) {
        showToast('公開URLの取得に失敗しました', 'error');
        return;
      }
      setRankingImageUrl(url);
      showToast('順位表画像の公開URLを発行しました', 'success');
    } catch (e) {
      console.error(e);
      showToast('公開URLの発行に失敗しました', 'error');
    } finally {
      setIsPublishingRankingUrl(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const ownerQs = (() => {
        const ot = getOwnerToken(joinToken);
        return ot ? `&owner_token=${encodeURIComponent(ot)}` : '';
      })();
      const response = await fetch(`/api/export/csv?join_token=${joinToken}${ownerQs}`);

      if (!response.ok) {
        const error = await response.json();
        showToast(error.error || 'CSV出力に失敗しました', 'error');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blind_dram_${results?.session.title || 'results'}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      showToast('CSVをダウンロードしました', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('ネットワークエラーが発生しました', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <p className="text-center text-stone-400">読み込み中...</p>
      </div>
    );
  }

  if (!results || !results.session) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
        <PhaseBanner sessionState="published" mode="sequential" />
        <div className="max-w-md mx-auto mt-8">
          <p className="text-center text-stone-400">結果が見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4">
      <PhaseBanner
        sessionState="published"
        mode={results.session.mode}
      />

      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        {/* デバッグパネル（開発用） */}
        {process.env.NODE_ENV !== 'production' &&
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('debug_ui') === '1' && (
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-2xl shadow-xl shadow-black/40 p-4 text-xs">
              <h3 className="text-red-300 font-bold mb-2">[DEBUG] ResultsPage - 現在の状態</h3>
              <div className="space-y-1 text-red-200 font-mono">
                <div>session.state: {results.session.state || 'null'}</div>
                <div>session.mode: {results.session.mode || 'null'}</div>
                <div>session.id: {results.session.id || 'null'}</div>
                <div>session.title: {results.session.title || 'null'}</div>
                <div>rankings_count: {results.rankings?.length || 0}</div>
                <div>sample_details_count: {results.sample_details?.length || 0}</div>
              </div>
            </div>
          )}

        <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">{results.session.title}</h1>

        <div className="ui-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="ui-h3">共有</h2>
              <p className="text-sm ui-muted mt-1">
                大会・全体・個人のレポートをプレビューしてから画像保存できます。
              </p>
              {results.session.public_results === false && (
                <p className="text-xs text-amber-200/80 mt-2">
                  限定公開中です。共有URLにはオーナー権限が含まれます。全員に公開する場合はオーナー画面から変更してください。
                </p>
              )}
            </div>
            {participantId && (
              <div className="text-xs text-stone-400">
                <span className="px-2 py-1 rounded-full border border-white/10 bg-neutral-900/30">
                  自分の列をハイライト中
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={handleCopyResultsPageUrl} className="w-full">
              結果ページのURLをコピー
            </Button>
            <Button variant="secondary" onClick={handleCopyRankingText} className="w-full">
              順位表をテキストでコピー
            </Button>
            <Button
              variant="primary"
              onClick={handlePreviewTournamentReport}
              disabled={isAnyReportBusy || isPublishingRankingUrl}
              className="w-full"
            >
              {isTournamentReportBusy ? '画像を作成中…' : '大会レポートをプレビュー'}
            </Button>
            <Button
              variant="primary"
              onClick={handlePreviewOverallReport}
              disabled={isAnyReportBusy || isPublishingRankingUrl}
              className="w-full"
            >
              {isOverallReportBusy ? '画像を作成中…' : '全体レポートをプレビュー'}
            </Button>
            <Button
              variant="primary"
              onClick={handlePublishRankingImageUrl}
              disabled={isAnyReportBusy || isPublishingRankingUrl}
              className="w-full sm:col-span-2"
            >
              {isPublishingRankingUrl ? '公開URLを発行中…' : '順位表画像の公開URLを発行'}
            </Button>
          </div>

          {rankingImageUrl && (
            <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4 space-y-3">
              <p className="text-sm font-medium text-stone-200">順位表画像（公開URL）</p>
              <a
                href={rankingImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-sky-300 break-all hover:underline"
              >
                {rankingImageUrl}
              </a>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleCopyRankingImageUrl} className="text-sm">
                  画像URLをコピー
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open(rankingImageUrl, '_blank', 'noopener,noreferrer')}
                  className="text-sm"
                >
                  画像を開く
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* タブ */}
        <div className="flex gap-2 border-b border-white/10">
          <button
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
            <div ref={rankingCaptureRef} className="ui-card p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">順位表</h2>
              <div className="overflow-x-auto">
                <table className="ui-table">
                  <thead>
                    <tr className="ui-thead">
                      <th className="ui-th px-4">順位</th>
                      <th className="ui-th px-4">参加者</th>
                      <th className="ui-th px-4 text-right">合計点数</th>
                      {results.rankings[0]?.sample_scores && results.rankings[0].sample_scores.length > 0 && results.rankings[0].sample_scores.map((sample) => (
                        <th key={sample.sample_id} className="ui-th px-4 text-right">
                          {sample.sample_label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rankings.map((ranking) => (
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
                        {ranking.sample_scores && ranking.sample_scores.length > 0 && ranking.sample_scores.map((sample) => (
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
            {results.sample_details.map((sample) => {
              const truth = sample.truth;
              const snap = sample.scoring_snapshot ?? results.scoring_snapshot;
              return (
                <div key={sample.sample_id} className="ui-card p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-stone-100 tracking-tight">
                        {formatSampleHeadingLabel(sample.sample_label)}
                      </h3>
                      {sample.presenter_name && (
                        <p className="text-sm text-stone-400 mt-1">
                          持ち込み: {sample.presenter_name}
                        </p>
                      )}
                    </div>
                    {truth.bottle_image_url && (
                      <TapEnlargeImage
                        src={truth.bottle_image_url}
                        alt={`Sample ${sample.sample_label} ボトル画像`}
                      />
                    )}
                  </div>

                  <div className="mb-6 p-4 bg-neutral-700 rounded-xl border border-white/10">
                    <h4 className="font-semibold text-stone-100 mb-3">正解</h4>
                    <DynamicTruthSummary scoringSnapshot={snap} truth={truth} />
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
                      scoringSnapshot={snap}
                      truth={truth}
                      answers={sample.participant_answers}
                      highlightParticipantId={participantId}
                    />
                  </div>

                  {/* フレーバー・ナイチンゲール・ローズ・チャート（Presenter パネルの入力のみ） */}
                  {(() => {
                    const radar = sample.radar;
                    const presenterTier2 = sample.presenter_tasting_tier2 ?? {
                      nose: [],
                      palate: [],
                      finish: [],
                    };
                    const snapForChart = results.flavor_chart_snapshot;
                    const chartTier1 = tier1CountsForNightingaleChartDisplay(radar?.tier1_counts, snapForChart);
                    const hasRadar = hasNonZeroTier1CountsForNightingaleChart(radar?.tier1_counts, snapForChart);
                    const hasPresenterTier2 = hasAnyPresenterTastingTier2(presenterTier2);
                    const hasOtherList = (sample.other_terms?.length ?? 0) > 0;
                    if (!hasRadar && !hasPresenterTier2 && !hasOtherList) {
                      return null;
                    }
                    const labels = hasRadar && Object.keys(chartTier1).length ? flavorRadarChartLabels(chartTier1) : [];
                    const values = hasRadar ? labels.map((l) => chartTier1[l] as number) : [];

                    return (
                      <div className="mt-6 space-y-6">
                        <div>
                          <h4 className="font-semibold text-stone-100 mb-2 tracking-tight">
                            フレーバー・ナイチンゲール・ローズ・チャート（{formatSampleHeadingLabel(sample.sample_label)}）
                          </h4>
                          <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            プレゼンターが Presenter パネルで入力したテイスティングのみを表示しています。
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
                              tier1NightingaleColors={results.tier1_nightingale_colors}
                            />
                          ) : null}
                          {hasPresenterTier2 ? (
                            <PresenterTastingTier2Summary data={presenterTier2} />
                          ) : null}
                        </div>

                        {/* その他一覧 */}
                        {sample.other_terms && sample.other_terms.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-stone-100 mb-4 tracking-tight">
                              その他一覧（{formatSampleHeadingLabel(sample.sample_label)}）
                            </h4>
                            <div className="bg-neutral-800 rounded-xl p-6 border border-white/10">
                              <div className="space-y-2">
                                {sample.other_terms.map((item, idx) => (
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
              );
            })}

          </div>
        )}

        {/* 参加者タブ */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* 参加者選択 */}
            <div className="ui-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-stone-100 tracking-tight">参加者選択</h2>
                <Button
                  variant="primary"
                  onClick={handlePreviewPersonalReport}
                  disabled={!selectedParticipantId || isAnyReportBusy}
                  className="shrink-0"
                >
                  {isPersonalReportBusy ? '画像を作成中…' : '個人レポートをプレビュー'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.rankings.map((ranking) => (
                  <button
                    key={ranking.participant_id}
                    onClick={() => setSelectedParticipantId(ranking.participant_id)}
                    className={`px-4 py-2 rounded-full min-h-[44px] font-medium transition-all ${
                      selectedParticipantId === ranking.participant_id
                        ? 'bg-bd-ink text-bd-paper'
                        : ranking.participant_id === participantId
                          ? 'bg-neutral-700 text-stone-200 border border-bd-accent/40 hover:bg-neutral-600'
                          : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                    }`}
                  >
                    {disambiguatedDisplayName(ranking.display_name, ranking.participant_id, rankingPeers)}
                    {ranking.participant_id === participantId && (
                      <span className="ml-2 text-xs font-semibold">(自分)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 選択された参加者の詳細 */}
            {selectedParticipantId && (() => {
              const participant = results.rankings.find((r) => r.participant_id === selectedParticipantId);
              if (!participant) return null;

              const sessionSnap = results.scoring_snapshot;
              const snapForChart = results.flavor_chart_snapshot;

              return (
                <div className="space-y-6">
                  <div className="ui-card p-6">
                    <h3 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">
                      {disambiguatedDisplayName(participant.display_name, participant.participant_id, rankingPeers)} の回答
                    </h3>
                    <div className="mb-4 p-4 bg-neutral-700 rounded-xl">
                      <div className="text-stone-400 mb-1">総合順位</div>
                      <div className="text-3xl font-semibold text-bd-accent">{participant.rank}位</div>
                      <div className="text-stone-400 mt-1">合計点数: {participant.total_score}点</div>
                    </div>

                    {/* 各Sampleの回答 */}
                    <div className="space-y-4">
                      {results.sample_details.map((sample) => {
                        const answer = sample.participant_answers.find(
                          (a) => a.participant_id === selectedParticipantId
                        );
                        const comment = sample.comments?.find(
                          (c) => c.participant_id === selectedParticipantId
                        );
                        const radarEntry = sample.per_participant_radar?.find(
                          (r) => r.participant_id === selectedParticipantId
                        );
                        const chartTier1 = tier1CountsForNightingaleChartDisplay(
                          radarEntry?.tier1_counts,
                          snapForChart,
                        );
                        const showParticipantRadar = hasNonZeroTier1CountsForNightingaleChart(
                          radarEntry?.tier1_counts,
                          snapForChart,
                        );
                        const showFlavorText = flavorCommentRowHasContent(comment);
                        if (!answer && !showParticipantRadar && !showFlavorText) return null;

                        const snap = sample.scoring_snapshot ?? sessionSnap;

                        const radarLabels =
                          showParticipantRadar && Object.keys(chartTier1).length
                            ? flavorRadarChartLabels(chartTier1)
                            : undefined;
                        const radarValues = radarLabels?.map((l) => chartTier1[l] as number) ?? [];

                        return (
                          <div key={sample.sample_id} className="bg-neutral-700 rounded-xl p-4 border border-white/10">
                            <div className="mb-3">
                              <h4 className="text-lg font-semibold text-stone-100">
                                {formatSampleHeadingLabel(sample.sample_label)}
                              </h4>
                              {sample.presenter_name && (
                                <p className="text-sm text-stone-400 mt-1">
                                  持ち込み: {sample.presenter_name}
                                </p>
                              )}
                            </div>

                            {answer ? (
                              <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
                                <div className="text-sm font-medium text-stone-400 mb-2">推測</div>
                                <DynamicParticipantGuessGrid scoringSnapshot={snap} answer={answer} />
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
                                  tier1NightingaleColors={results.tier1_nightingale_colors}
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
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* CSV出力ボタン */}
        <div className="ui-card p-6 space-y-4">
          <Button variant="primary" onClick={handleExportCSV} className="w-full">
            CSVをダウンロード
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => router.push('/create')} 
            className="w-full"
          >
            新たに始める
          </Button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <ReportPreviewModal
        preview={reportPreview}
        isSaving={isSavingPreview}
        onClose={() => {
          if (!isSavingPreview) setReportPreview(null);
        }}
        onSave={handleSavePreviewedReport}
      />

      {/* 結果ポスター（画面外レンダリング・画像キャプチャ用） */}
      {results && joinToken && (
        <div
          ref={posterCaptureWrapperRef}
          aria-hidden
          className="fixed left-0 top-0 -z-10 opacity-0 pointer-events-none overflow-visible"
        >
          <div ref={posterCaptureRef}>
            <ReportCaptureRoot results={toResultsSnapshot(results)} />
          </div>
        </div>
      )}
    </div>
  );
}


