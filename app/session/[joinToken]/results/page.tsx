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
import { copyToClipboard, getOwnerToken, getParticipantToken } from '@/lib/utils';
import { formatRankingMatrixText, sanitizeDownloadBasename } from '@/lib/rankingMatrix';
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

interface Results {
  session: {
    id: string;
    title: string;
    mode: 'sequential' | 'simultaneous';
    state: string;
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
  sample_details: Array<{
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
  }>;
  flavor_radar: {
    tier1_counts: Record<string, number>;
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
  const [isRankingImageBusy, setIsRankingImageBusy] = useState(false);

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

  const handleCopyRankingText = async () => {
    if (!results) return;
    const text = formatRankingMatrixText(`【${results.session.title}】最終結果`, results.rankings);
    const ok = await copyToClipboard(text);
    showToast(ok ? '順位表をコピーしました' : 'コピーに失敗しました', ok ? 'success' : 'error');
  };

  const handleDownloadRankingImage = async () => {
    if (!rankingCaptureRef.current || !results) return;
    setIsRankingImageBusy(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(rankingCaptureRef.current, {
        backgroundColor: '#262626',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      const base = sanitizeDownloadBasename(results.session.title, 'ranking');
      const day = new Date().toISOString().split('T')[0];
      a.download = `${base}_ranking_${day}.png`;
      a.click();
      showToast('順位表の画像をダウンロードしました', 'success');
    } catch (e) {
      console.error(e);
      showToast('画像の作成に失敗しました', 'error');
    } finally {
      setIsRankingImageBusy(false);
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
                順位表のみをテキストまたは画像で共有できます。
              </p>
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
            <Button variant="secondary" onClick={handleCopyRankingText} className="w-full">
              順位表をテキストでコピー
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadRankingImage}
              disabled={isRankingImageBusy}
              className="w-full"
            >
              {isRankingImageBusy ? '画像を作成中…' : '順位表の画像をダウンロード'}
            </Button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-2 border-b border-white/10">
          <button
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
                        className={`ui-tr ${participantId && ranking.participant_id === participantId ? 'bg-[#C88A2B]/10' : ''}`}
                      >
                        <td className="py-3 px-4 font-semibold text-stone-100">{ranking.rank}</td>
                        <td className="py-3 px-4 text-stone-100 break-words max-w-[200px]">{ranking.display_name}</td>
                        <td className="py-3 px-4 text-right font-semibold text-lg text-[#C88A2B]">
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

            {/* 総合レーダーチャート（順位表タブにも表示） */}
            {results.flavor_radar && results.flavor_radar.tier1_counts && Object.keys(results.flavor_radar.tier1_counts).length > 0 && (() => {
              const labels = Object.keys(results.flavor_radar.tier1_counts).filter(label => label !== 'その他');
              const data = labels.map(label => results.flavor_radar.tier1_counts[label] as number);
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
                <div className="ui-card p-6">
                  <h3 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">総合フレーバーレーダーチャート</h3>
                  <div className="bg-neutral-900 rounded-xl p-6">
                    <div className="max-w-2xl mx-auto">
                      <Radar data={chartData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 詳細 */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {results.sample_details.map((sample) => {
              const truth = sample.truth;
              return (
                <div key={sample.sample_id} className="ui-card p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-stone-100 tracking-tight">Sample {sample.sample_label}</h3>
                      {sample.presenter_name && (
                        <p className="text-sm text-stone-400 mt-1">
                          持ち込み: {sample.presenter_name}
                        </p>
                      )}
                    </div>
                    {truth.bottle_image_url && (
                      <Image
                        src={truth.bottle_image_url}
                        alt={`Sample ${sample.sample_label} ボトル画像`}
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
                          {sample.participant_answers.map((answer) => {
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
                    const radar = sample.radar;
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
                            フレーバーレーダーチャート（Sample {sample.sample_label}）
                          </h4>
                          <div className="bg-neutral-900 rounded-xl p-6">
                            <div className="max-w-2xl mx-auto">
                              <Radar data={chartData} options={chartOptions} />
                            </div>
                          </div>
                        </div>
                        
                        {/* その他一覧 */}
                        {sample.other_terms && sample.other_terms.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-stone-100 mb-4 tracking-tight">
                              その他一覧（Sample {sample.sample_label}）
                            </h4>
                            <div className="bg-neutral-800 rounded-xl p-6 border border-white/10">
                              <div className="space-y-2">
                                {sample.other_terms.map((item, idx) => (
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
              );
            })}

          </div>
        )}

        {/* 参加者タブ */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            {/* 参加者選択 */}
            <div className="ui-card p-6">
              <h2 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">参加者選択</h2>
              <div className="flex flex-wrap gap-2">
                {results.rankings.map((ranking) => (
                  <button
                    key={ranking.participant_id}
                    onClick={() => setSelectedParticipantId(ranking.participant_id)}
                    className={`px-4 py-2 rounded-full min-h-[44px] font-medium transition-all ${
                      selectedParticipantId === ranking.participant_id
                        ? 'bg-[#C88A2B] text-black/90'
                        : ranking.participant_id === participantId
                          ? 'bg-neutral-700 text-stone-200 border border-[#C88A2B]/40 hover:bg-neutral-600'
                          : 'bg-neutral-700 text-stone-200 border border-white/10 hover:bg-neutral-600'
                    }`}
                  >
                    {ranking.display_name}
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

              return (
                <div className="space-y-6">
                  <div className="ui-card p-6">
                    <h3 className="text-xl font-semibold text-stone-100 mb-4 tracking-tight">
                      {participant.display_name} の回答
                    </h3>
                    <div className="mb-4 p-4 bg-neutral-700 rounded-xl">
                      <div className="text-stone-400 mb-1">総合順位</div>
                      <div className="text-3xl font-semibold text-[#C88A2B]">{participant.rank}位</div>
                      <div className="text-stone-400 mt-1">合計点数: {participant.total_score}点</div>
                    </div>

                    {/* 各Sampleの回答 */}
                    <div className="space-y-4">
                      {results.sample_details.map((sample) => {
                        const answer = sample.participant_answers.find(
                          (a) => a.participant_id === selectedParticipantId
                        );
                        if (!answer) return null;

                        const comment = sample.comments?.find(
                          (c) => c.participant_id === selectedParticipantId
                        );

                        return (
                          <div key={sample.sample_id} className="bg-neutral-700 rounded-xl p-4 border border-white/10">
                            <div className="mb-3">
                              <h4 className="text-lg font-semibold text-stone-100">Sample {sample.sample_label}</h4>
                              {sample.presenter_name && (
                                <p className="text-sm text-stone-400 mt-1">
                                  持ち込み: {sample.presenter_name}
                                </p>
                              )}
                            </div>
                            
                            {/* 推測値 */}
                            <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
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
    </div>
  );
}


