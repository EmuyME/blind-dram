'use client';

import {
  DynamicParticipantGuessGrid,
  DynamicScoringResultsTable,
  DynamicTruthSummary,
} from '@/components/scoring/ScoringResultsViews';
import { BottleTruthMetaSummary } from '@/components/common/BottleTruthMeta';
import { formatSampleHeadingLabel, clampTier1Intensity } from '@/lib/json-helpers';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import { buildResultsPageUrl } from '@/lib/results-share';
import {
  flavorCommentRowHasContent,
  flavorSectionHasContent,
  resultsHaveAnyFlavorComments,
  sessionModeLabel,
  type ResultsPosterData,
  type ResultsPosterFlavorSection,
} from '@/lib/results-poster';

const POSTER_WIDTH_PX = 1080;

function PosterSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-7 rounded-full bg-bd-accent flex-shrink-0" />
      <h2 className="text-xl font-semibold text-stone-100 tracking-tight">{children}</h2>
    </div>
  );
}

function PosterFlavorChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent';
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-bd-accent/15 text-bd-accent-dim border-bd-accent/30'
      : 'bg-neutral-800 text-stone-200 border-white/10';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function PosterFlavorSection({
  label,
  flavor,
}: {
  label: string;
  flavor: ResultsPosterFlavorSection | null | undefined;
}) {
  const tier1 = (flavor?.tier1_tags || []).filter(Boolean);
  const tier1Int = flavor?.tier1_intensity || {};
  const tier2 = (flavor?.tier2_terms || []).filter(Boolean);
  const text = (flavor?.text || '').trim();
  if (!flavorSectionHasContent(flavor)) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/40 p-2.5">
      <p className="text-xs font-semibold text-stone-300 mb-2">{label}</p>
      <div className="space-y-2">
        {tier1.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tier1.map((t) => {
              const raw = tier1Int[t];
              const lv = raw != null && Number.isFinite(raw) ? clampTier1Intensity(raw) : null;
              return (
                <PosterFlavorChip key={`t1-${label}-${t}`} tone="accent">
                  {lv != null ? `${t}（${lv}）` : t}
                </PosterFlavorChip>
              );
            })}
          </div>
        )}
        {tier2.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tier2.map((t) => (
              <PosterFlavorChip key={`t2-${label}-${t}`}>{t}</PosterFlavorChip>
            ))}
          </div>
        )}
        {!!text && <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">{text}</p>}
      </div>
    </div>
  );
}

function PosterPodium({
  rankings,
  peers,
}: {
  rankings: ResultsPosterData['rankings'];
  peers: Array<{ participant_id: string; display_name: string }>;
}) {
  const byRank = new Map(rankings.map((r) => [r.rank, r]));
  const slots = [2, 1, 3]
    .map((rank) => byRank.get(rank))
    .filter((r): r is NonNullable<typeof r> => !!r);
  if (slots.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-4 mb-6">
      {slots.map((entry) => {
        const isFirst = entry.rank === 1;
        return (
          <div
            key={entry.participant_id}
            className={`flex flex-col items-center text-center ${isFirst ? 'order-2' : entry.rank === 2 ? 'order-1' : 'order-3'}`}
          >
            <div
              className={`rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 ${
                isFirst ? 'min-w-[140px] border-bd-accent/40' : 'min-w-[120px]'
              }`}
            >
              <div className={`font-bold text-bd-accent ${isFirst ? 'text-2xl' : 'text-xl'}`}>
                {entry.rank}位
              </div>
              <div className={`font-semibold text-stone-100 mt-1 ${isFirst ? 'text-base' : 'text-sm'}`}>
                {disambiguatedDisplayName(entry.display_name, entry.participant_id, peers)}
              </div>
              <div className={`text-bd-accent font-semibold mt-1 ${isFirst ? 'text-lg' : 'text-base'}`}>
                {entry.total_score}点
              </div>
            </div>
            <div
              className={`mt-1 rounded-t-lg bg-bd-accent/20 w-full ${isFirst ? 'h-16' : entry.rank === 2 ? 'h-10' : 'h-8'}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function BottlePhoto({ url, alt }: { url?: string | null; alt: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className="w-20 h-20 rounded-lg object-cover border border-white/10 flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-20 h-20 rounded-lg border border-white/10 bg-neutral-800 flex items-center justify-center text-stone-500 text-[10px] flex-shrink-0">
      写真なし
    </div>
  );
}

export type ResultsPosterCaptureProps = {
  results: ResultsPosterData;
  joinToken: string;
  ownerToken?: string | null;
  resultsPageUrl?: string;
};

export function ResultsPosterCapture({ results, joinToken, ownerToken, resultsPageUrl }: ResultsPosterCaptureProps) {
  const peers = results.rankings.map((r) => ({
    participant_id: r.participant_id,
    display_name: r.display_name,
  }));
  const includeFlavors = resultsHaveAnyFlavorComments(results);
  const participantCount = results.rankings.length;
  const sampleCount = results.sample_details.length;
  const capturedDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const footerUrl =
    resultsPageUrl ??
    (typeof window !== 'undefined'
      ? buildResultsPageUrl(
          window.location.origin,
          joinToken,
          ownerToken,
          results.session.public_results !== false,
        )
      : '');

  return (
    <div
      className="bg-neutral-900 text-stone-100"
      style={{ width: POSTER_WIDTH_PX, fontFamily: 'system-ui, sans-serif' }}
      data-poster-capture-root
    >
      {/* Header */}
      <div
        data-poster-capture-chunk
        className="px-8 pt-8 pb-6 border-b border-white/10 bg-neutral-900"
      >
        <p className="text-sm font-semibold text-bd-accent tracking-wide uppercase">Blind Dram 結果レポート</p>
        <h1 className="text-3xl font-semibold text-stone-100 mt-2 tracking-tight">{results.session.title}</h1>
        <p className="text-sm text-stone-400 mt-2">
          {sessionModeLabel(results.session.mode)} · {capturedDate} · 参加者{participantCount}名 / サンプル
          {sampleCount}本
        </p>
      </div>

      {/* §1 Ranking */}
      <div data-poster-capture-chunk className="px-8 py-6 bg-neutral-900">
        <section>
          <PosterSectionHeading>§1 総合順位</PosterSectionHeading>
          <PosterPodium rankings={results.rankings} peers={peers} />
          <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-stone-300 font-semibold">順位</th>
                  <th className="text-left py-2 px-3 text-stone-300 font-semibold">参加者</th>
                  <th className="text-right py-2 px-3 text-stone-300 font-semibold">合計</th>
                  {results.rankings[0]?.sample_scores?.map((s) => (
                    <th key={s.sample_id} className="text-right py-2 px-3 text-stone-300 font-semibold">
                      {s.sample_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rankings.map((ranking) => (
                  <tr
                    key={ranking.participant_id}
                    className={`border-b border-white/5 ${ranking.rank === 1 ? 'bg-bd-accent/10' : ''}`}
                  >
                    <td className="py-2 px-3 font-semibold">{ranking.rank}</td>
                    <td className="py-2 px-3 break-words max-w-[160px]">
                      {disambiguatedDisplayName(ranking.display_name, ranking.participant_id, peers)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-bd-accent text-base">
                      {ranking.total_score}
                    </td>
                    {ranking.sample_scores?.map((s) => (
                      <td key={s.sample_id} className="py-2 px-3 text-right">
                        {s.score}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* §2 Sample details */}
      <div data-poster-capture-chunk className="px-8 pt-6 pb-2 bg-neutral-900">
        <PosterSectionHeading>§2 サンプル別詳細</PosterSectionHeading>
      </div>
      {results.sample_details.map((sample) => {
        const snap = sample.scoring_snapshot ?? results.scoring_snapshot;
        const truth = sample.truth;
        return (
          <div
            key={sample.sample_id}
            data-poster-capture-chunk
            className="px-8 py-3 bg-neutral-900"
          >
            <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-stone-100">
                        {formatSampleHeadingLabel(sample.sample_label)}
                      </h3>
                      {sample.presenter_name && (
                        <p className="text-sm text-stone-400 mt-1">持ち込み: {sample.presenter_name}</p>
                      )}
                    </div>
                    <BottlePhoto
                      url={truth.bottle_image_url}
                      alt={`${sample.sample_label} ボトル画像`}
                    />
                  </div>

                  <div className="mb-4 p-3 rounded-lg border border-white/10 bg-neutral-700/80">
                    <p className="text-sm font-semibold text-stone-200 mb-2">正解</p>
                    <DynamicTruthSummary scoringSnapshot={snap} truth={truth} />
                    <BottleTruthMetaSummary
                      true_bottler_name={truth.true_bottler_name ?? undefined}
                      true_distillation_year={truth.true_distillation_year ?? null}
                      true_bottling_year={truth.true_bottling_year ?? null}
                      alwaysShow
                    />
                  </div>

                  {(truth.notes ?? '').trim().length > 0 && (
                    <div className="mb-4 p-3 rounded-lg border border-bd-accent/25 bg-neutral-800/80">
                      <p className="text-sm font-semibold text-stone-200 mb-1">メモ</p>
                      <p className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">{truth.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-stone-200 mb-3">参加者の回答</p>
                    <DynamicScoringResultsTable
                      scoringSnapshot={snap}
                      truth={truth}
                      answers={sample.participant_answers}
                    />
                  </div>
                </div>
          </div>
        );
      })}

      {/* §3 Participants */}
      <div data-poster-capture-chunk className="px-8 pt-6 pb-2 bg-neutral-900">
        <PosterSectionHeading>§3 参加者別サマリー</PosterSectionHeading>
      </div>
      {results.rankings.map((participant) => (
        <div
          key={participant.participant_id}
          data-poster-capture-chunk
          className="px-8 py-3 bg-neutral-900"
        >
          <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-5">
                <div className="mb-4 p-3 rounded-lg bg-neutral-700/80 border border-white/10">
                  <p className="text-lg font-semibold text-stone-100">
                    {disambiguatedDisplayName(participant.display_name, participant.participant_id, peers)}
                  </p>
                  <p className="text-sm text-stone-400 mt-1">
                    {participant.rank}位 · 合計 {participant.total_score}点
                  </p>
                </div>

                <div className="space-y-4">
                  {results.sample_details.map((sample) => {
                    const answer = sample.participant_answers.find(
                      (a) => a.participant_id === participant.participant_id,
                    );
                    const comment = sample.comments?.find(
                      (c) => c.participant_id === participant.participant_id,
                    );
                    const snap = sample.scoring_snapshot ?? results.scoring_snapshot;
                    const hasFlavor =
                      includeFlavors && comment && flavorCommentRowHasContent(comment);

                    if (!answer && !hasFlavor) return null;

                    return (
                      <div
                        key={sample.sample_id}
                        className="rounded-lg border border-white/10 bg-neutral-700/60 p-3"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <BottlePhoto
                            url={sample.truth.bottle_image_url}
                            alt={`${sample.sample_label} ボトル`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-100">
                              {formatSampleHeadingLabel(sample.sample_label)}
                            </p>
                            {sample.presenter_name && (
                              <p className="text-xs text-stone-400">持ち込み: {sample.presenter_name}</p>
                            )}
                          </div>
                        </div>

                        {answer && (
                          <div className="p-2.5 rounded-lg bg-neutral-800/80 mb-2">
                            <p className="text-xs font-medium text-stone-400 mb-1.5">推測</p>
                            <DynamicParticipantGuessGrid scoringSnapshot={snap} answer={answer} />
                          </div>
                        )}

                        {hasFlavor && comment && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-stone-400">フレーバーコメント</p>
                            <PosterFlavorSection label="Nose" flavor={comment.nose} />
                            <PosterFlavorSection label="Palate" flavor={comment.palate} />
                            <PosterFlavorSection label="Finish" flavor={comment.finish} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
          </div>
        </div>
      ))}

      {/* Footer */}
      <div
        data-poster-capture-chunk
        className="px-8 py-5 border-t border-white/10 text-center bg-neutral-900"
      >
        <p className="text-xs text-stone-500 break-all">{footerUrl}</p>
        <p className="text-xs text-stone-600 mt-1">© Blind Dram</p>
      </div>
    </div>
  );
}

export const RESULTS_POSTER_WIDTH_PX = POSTER_WIDTH_PX;
