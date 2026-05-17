"use client";

import React, { forwardRef, useMemo } from 'react';
import {
  buildRankingMatrix,
  type RankingMatrixParticipant,
} from '@/lib/rankingMatrix';
import { disambiguatedDisplayName } from '@/lib/participant-display';

type Props = {
  caption: string;
  rankings: RankingMatrixParticipant[];
  highlightParticipantId: string | null;
};

export const RankingMatrixTable = forwardRef<HTMLDivElement, Props>(
  function RankingMatrixTable({ caption, rankings, highlightParticipantId }, ref) {
    const { participants, samples, getScore } = useMemo(
      () => buildRankingMatrix(rankings),
      [rankings],
    );

    const peerList = useMemo(
      () => participants.map((p) => ({ participant_id: p.participant_id, display_name: p.display_name })),
      [participants],
    );

    const colHighlight = (participantId: string) =>
      highlightParticipantId && participantId === highlightParticipantId
        ? 'bg-[#C88A2B]/12 border-x border-[#C88A2B]/35'
        : '';

    if (participants.length === 0) {
      return (
        <div ref={ref} className="rounded-2xl border border-white/10 bg-neutral-800 p-6">
          <p className="text-sm text-stone-400">順位データがありません。</p>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="rounded-2xl border border-white/10 bg-neutral-800 p-6 shadow-xl shadow-black/30"
      >
        <div className="mb-4 text-center text-sm font-semibold tracking-tight text-stone-100 md:text-base">
          {caption}
        </div>
        <div className="overflow-x-auto">
          <table className="ui-table min-w-full text-sm">
            <thead>
              <tr className="ui-thead">
                <th
                  scope="col"
                  className="ui-th sticky left-0 z-10 bg-neutral-900/95 px-3 py-3 text-left backdrop-blur-sm"
                >
                  ラウンド
                </th>
                {participants.map((p) => (
                  <th
                    key={p.participant_id}
                    scope="col"
                    className={`ui-th px-3 py-3 text-center font-semibold text-stone-100 ${colHighlight(p.participant_id)}`}
                  >
                    <span className="inline-block max-w-[140px] break-words leading-snug">
                      {disambiguatedDisplayName(p.display_name, p.participant_id, peerList)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.sample_id} className="ui-tr">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-neutral-900/90 px-3 py-3 text-left font-medium text-stone-200 backdrop-blur-sm"
                  >
                    {s.sample_label}
                  </th>
                  {participants.map((p) => {
                    const v = getScore(p.participant_id, s.sample_id);
                    return (
                      <td
                        key={`${p.participant_id}-${s.sample_id}`}
                        className={`px-3 py-3 text-center tabular-nums text-stone-100 ${colHighlight(p.participant_id)}`}
                      >
                        {v === null || v === undefined ? '–' : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="ui-tr border-t-2 border-[#C88A2B]/40 bg-neutral-900/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-neutral-900/95 px-3 py-3 text-left text-sm font-bold text-[#E7C27B] backdrop-blur-sm"
                >
                  総得点
                </th>
                {participants.map((p) => (
                  <td
                    key={`total-${p.participant_id}`}
                    className={`px-3 py-3 text-center text-base font-bold tabular-nums text-[#C88A2B] ${colHighlight(p.participant_id)}`}
                  >
                    {p.total_score}
                  </td>
                ))}
              </tr>
              <tr className="ui-tr border-t border-white/10 bg-neutral-900/25">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-neutral-900/90 px-3 py-3 text-left text-sm font-semibold text-stone-200 backdrop-blur-sm"
                >
                  順位
                </th>
                {participants.map((p) => (
                  <td
                    key={`rank-${p.participant_id}`}
                    className={`px-3 py-3 text-center text-sm font-semibold tabular-nums text-stone-100 ${colHighlight(p.participant_id)}`}
                  >
                    {p.rank}位
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  },
);
