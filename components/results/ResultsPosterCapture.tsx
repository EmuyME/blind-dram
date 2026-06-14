'use client';

import { DynamicScoringResultsTable, DynamicTruthSummary } from '@/components/scoring/ScoringResultsViews';
import { formatSampleHeadingLabel } from '@/lib/json-helpers';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import { buildResultsPageUrl } from '@/lib/results-share';
import {
  buildPosterPagePlan,
  chunkArray,
  samplesPerPosterPage,
} from '@/lib/results-poster-layout';
import {
  flavorCommentRowHasContent,
  flavorSectionHasContent,
  resultsHaveAnyFlavorComments,
  sessionModeLabel,
  type ResultsPosterData,
  type ResultsPosterFlavorSection,
} from '@/lib/results-poster';

const POSTER_WIDTH_PX = 1080;

function PosterPage({
  pageIndex,
  totalPages,
  title,
  children,
}: {
  pageIndex: number;
  totalPages: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-poster-capture-page
      className="bg-neutral-900 text-stone-100"
      style={{ width: POSTER_WIDTH_PX, fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-bd-accent tracking-wide">Blind Dram 結果レポート</p>
          <p className="text-sm font-semibold text-stone-200 mt-0.5">{title}</p>
        </div>
        <p className="text-xs text-stone-500 whitespace-nowrap">
          {pageIndex}/{totalPages}
        </p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function PosterSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full bg-bd-accent flex-shrink-0" />
      <h2 className="text-lg font-semibold text-stone-100">{children}</h2>
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
    <div className="flex items-end justify-center gap-3 mb-5">
      {slots.map((entry) => {
        const isFirst = entry.rank === 1;
        return (
          <div
            key={entry.participant_id}
            className={`flex flex-col items-center text-center ${isFirst ? 'order-2' : entry.rank === 2 ? 'order-1' : 'order-3'}`}
          >
            <div
              className={`rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 ${
                isFirst ? 'min-w-[120px] border-bd-accent/40' : 'min-w-[100px]'
              }`}
            >
              <div className={`font-bold text-bd-accent ${isFirst ? 'text-xl' : 'text-lg'}`}>
                {entry.rank}位
              </div>
              <div className={`font-semibold text-stone-100 mt-0.5 text-sm`}>
                {disambiguatedDisplayName(entry.display_name, entry.participant_id, peers)}
              </div>
              <div className="text-bd-accent font-semibold text-sm mt-0.5">{entry.total_score}点</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BottlePhoto({ url, alt, size = 56 }: { url?: string | null; alt: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className="rounded-md object-cover border border-white/10 flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-md border border-white/10 bg-neutral-800 flex items-center justify-center text-stone-500 text-[9px] flex-shrink-0"
      style={{ width: size, height: size }}
    >
      写真なし
    </div>
  );
}

function formatFlavorCompact(section: ResultsPosterFlavorSection | undefined | null): string {
  if (!flavorSectionHasContent(section)) return '—';
  const tier1 = (section?.tier1_tags ?? []).join('、');
  const tier2 = (section?.tier2_terms ?? []).join('、');
  const text = (section?.text ?? '').trim();
  const parts = [tier1, tier2, text].filter(Boolean);
  return parts.join(' / ') || '—';
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

  const pagePlan = buildPosterPagePlan(sampleCount);
  const sampleChunks = chunkArray(results.sample_details, samplesPerPosterPage());
  let pageNo = 0;

  return (
    <div data-poster-capture-root>
      {/* ページ1: 順位表 */}
      <PosterPage
        pageIndex={++pageNo}
        totalPages={pagePlan.totalPages}
        title={results.session.title}
      >
        <p className="text-xs text-stone-400 mb-4">
          {sessionModeLabel(results.session.mode)} · {capturedDate} · 参加者{participantCount}名 / サンプル
          {sampleCount}本
        </p>
        <PosterSectionHeading>総合順位</PosterSectionHeading>
        <PosterPodium rankings={results.rankings} peers={peers} />
        <div className="rounded-lg border border-white/10 bg-neutral-800/60 p-3 overflow-x-auto [&_table]:text-xs [&_td]:py-1.5 [&_th]:py-1.5">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-2 text-stone-300 font-semibold">順位</th>
                <th className="text-left px-2 text-stone-300 font-semibold">参加者</th>
                <th className="text-right px-2 text-stone-300 font-semibold">合計</th>
                {results.rankings[0]?.sample_scores?.map((s) => (
                  <th key={s.sample_id} className="text-right px-2 text-stone-300 font-semibold">
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
                  <td className="px-2 font-semibold">{ranking.rank}</td>
                  <td className="px-2 break-words max-w-[140px]">
                    {disambiguatedDisplayName(ranking.display_name, ranking.participant_id, peers)}
                  </td>
                  <td className="px-2 text-right font-semibold text-bd-accent">{ranking.total_score}</td>
                  {ranking.sample_scores?.map((s) => (
                    <td key={s.sample_id} className="px-2 text-right">
                      {s.score}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-stone-500 mt-4 break-all">{footerUrl}</p>
      </PosterPage>

      {/* ページ2〜: サンプル詳細（数本ずつ） */}
      {sampleChunks.map((chunk, chunkIndex) => (
        <PosterPage
          key={`samples-${chunkIndex}`}
          pageIndex={++pageNo}
          totalPages={pagePlan.totalPages}
          title={`${results.session.title} — サンプル詳細`}
        >
          <PosterSectionHeading>
            サンプル詳細 ({chunkIndex * samplesPerPosterPage() + 1}〜
            {chunkIndex * samplesPerPosterPage() + chunk.length})
          </PosterSectionHeading>
          <div className="space-y-4">
            {chunk.map((sample) => {
              const snap = sample.scoring_snapshot ?? results.scoring_snapshot;
              const truth = sample.truth;
              return (
                <div
                  key={sample.sample_id}
                  className="rounded-lg border border-white/10 bg-neutral-800/60 p-3"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <BottlePhoto url={truth.bottle_image_url} alt={sample.sample_label} size={48} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-stone-100">
                        {formatSampleHeadingLabel(sample.sample_label)}
                      </h3>
                      {sample.presenter_name && (
                        <p className="text-xs text-stone-400">持込: {sample.presenter_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="mb-2 p-2 rounded-md border border-white/10 bg-neutral-700/80 text-xs [&_*]:text-xs">
                    <p className="font-semibold text-stone-300 mb-1">正解</p>
                    <DynamicTruthSummary scoringSnapshot={snap} truth={truth} />
                  </div>
                  {(truth.notes ?? '').trim().length > 0 && (
                    <p className="text-xs text-stone-400 mb-2 line-clamp-2">
                      <span className="text-stone-500">メモ: </span>
                      {truth.notes}
                    </p>
                  )}
                  <div className="[&_table]:text-[11px] [&_td]:py-1 [&_th]:py-1 [&_td]:px-1.5 [&_th]:px-1.5">
                    <DynamicScoringResultsTable
                      scoringSnapshot={snap}
                      truth={truth}
                      answers={sample.participant_answers}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </PosterPage>
      ))}

      {/* 最終ページ: 参加者サマリー（マトリクス） */}
      <PosterPage
        pageIndex={++pageNo}
        totalPages={pagePlan.totalPages}
        title={`${results.session.title} — 参加者`}
      >
        <PosterSectionHeading>参加者別得点</PosterSectionHeading>
        <div className="rounded-lg border border-white/10 bg-neutral-800/60 p-3 overflow-x-auto mb-5">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-1.5 px-2 text-stone-300">参加者</th>
                <th className="text-right py-1.5 px-2 text-stone-300">順位</th>
                <th className="text-right py-1.5 px-2 text-stone-300">合計</th>
                {results.sample_details.map((s) => (
                  <th key={s.sample_id} className="text-right py-1.5 px-2 text-stone-300">
                    {s.sample_label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.rankings.map((p) => (
                <tr key={p.participant_id} className="border-b border-white/5">
                  <td className="py-1.5 px-2 text-stone-100">
                    {disambiguatedDisplayName(p.display_name, p.participant_id, peers)}
                  </td>
                  <td className="py-1.5 px-2 text-right">{p.rank}</td>
                  <td className="py-1.5 px-2 text-right font-semibold text-bd-accent">{p.total_score}</td>
                  {results.sample_details.map((s) => {
                    const ans = s.participant_answers.find((a) => a.participant_id === p.participant_id);
                    return (
                      <td key={s.sample_id} className="py-1.5 px-2 text-right">
                        {ans?.score ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {includeFlavors && (
          <>
            <PosterSectionHeading>フレーバーコメント</PosterSectionHeading>
            <div className="rounded-lg border border-white/10 bg-neutral-800/60 p-3 overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-1 px-2 text-stone-300">参加者</th>
                    <th className="text-left py-1 px-2 text-stone-300">Sample</th>
                    <th className="text-left py-1 px-2 text-stone-300">Nose</th>
                    <th className="text-left py-1 px-2 text-stone-300">Palate</th>
                    <th className="text-left py-1 px-2 text-stone-300">Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {results.rankings.flatMap((p) =>
                    results.sample_details
                      .map((s) => {
                        const comment = s.comments?.find((c) => c.participant_id === p.participant_id);
                        if (!comment || !flavorCommentRowHasContent(comment)) return null;
                        return (
                          <tr key={`${p.participant_id}-${s.sample_id}`} className="border-b border-white/5 align-top">
                            <td className="py-1 px-2 text-stone-200 whitespace-nowrap">
                              {disambiguatedDisplayName(p.display_name, p.participant_id, peers)}
                            </td>
                            <td className="py-1 px-2 text-stone-300 whitespace-nowrap">{s.sample_label}</td>
                            <td className="py-1 px-2 text-stone-300 max-w-[180px]">{formatFlavorCompact(comment.nose)}</td>
                            <td className="py-1 px-2 text-stone-300 max-w-[180px]">{formatFlavorCompact(comment.palate)}</td>
                            <td className="py-1 px-2 text-stone-300 max-w-[180px]">{formatFlavorCompact(comment.finish)}</td>
                          </tr>
                        );
                      })
                      .filter(Boolean),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-[10px] text-stone-500 mt-4 break-all">{footerUrl}</p>
      </PosterPage>
    </div>
  );
}

export const RESULTS_POSTER_WIDTH_PX = POSTER_WIDTH_PX;
