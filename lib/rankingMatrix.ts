import { disambiguatedDisplayName } from '@/lib/participant-display';

export type RankingSampleScore = {
  sample_id: string;
  sample_label: string;
  score: number;
};

export type RankingMatrixParticipant = {
  rank: number;
  participant_id: string;
  display_name: string;
  total_score: number;
  sample_scores: RankingSampleScore[];
};

export type RankingMatrixSample = {
  sample_id: string;
  sample_label: string;
};

export function buildRankingMatrix(rankings: RankingMatrixParticipant[]) {
  const participants = [...rankings].sort((a, b) => a.rank - b.rank);
  const first = participants[0];
  const samples: RankingMatrixSample[] =
    first?.sample_scores?.map((s) => ({
      sample_id: s.sample_id,
      sample_label: s.sample_label,
    })) ?? [];

  const getScore = (participantId: string, sampleId: string): number | null => {
    const p = participants.find((x) => x.participant_id === participantId);
    const row = p?.sample_scores?.find((s) => s.sample_id === sampleId);
    return row !== undefined ? row.score : null;
  };

  return { participants, samples, getScore };
}

/** Tab-separated text for spreadsheets */
export function formatRankingMatrixText(captionLine: string, rankings: RankingMatrixParticipant[]): string {
  const { participants, samples, getScore } = buildRankingMatrix(rankings);
  const sep = '\t';
  const lines: string[] = [];
  lines.push(captionLine);
  lines.push('');
  const peerList = participants.map((p) => ({
    participant_id: p.participant_id,
    display_name: p.display_name,
  }));
  lines.push([
    'ラウンド',
    ...participants.map((p) => disambiguatedDisplayName(p.display_name, p.participant_id, peerList)),
  ].join(sep));
  for (const s of samples) {
    lines.push(
      [
        s.sample_label,
        ...participants.map((p) => {
          const v = getScore(p.participant_id, s.sample_id);
          return v === null || v === undefined ? '–' : String(v);
        }),
      ].join(sep),
    );
  }
  lines.push(['総得点', ...participants.map((p) => String(p.total_score))].join(sep));
  lines.push(['順位', ...participants.map((p) => `${p.rank}位`)].join(sep));
  return lines.join('\n');
}

export function sanitizeDownloadBasename(raw: string, fallback: string): string {
  const s = (raw || fallback).replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').trim();
  return s.slice(0, 80) || fallback;
}
