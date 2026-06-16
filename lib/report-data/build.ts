import type {
  OverallReportData,
  PersonalReportData,
  TournamentReportData,
} from '@/lib/report-data/types';
import { REPORT_ITEM_KEYS } from '@/lib/report-data/types';
import type { ResultsSnapshot } from '@/lib/report-data/results-snapshot';
import {
  buildCategoryScoresForParticipant,
  buildRoundItem,
  activeScoringItemKeys,
  getItemMaxScores,
  maxTotalScorePerRound,
  truthToReportFields,
} from '@/lib/report-data/item-scoring';
import {
  collectAllRoundScores,
  collectScoreCells,
  formatReportDate,
  median,
  pickExtremeRoundScores,
  pickExtremeScoreCells,
  populationStdDev,
  round1,
} from '@/lib/report-data/stats';

export function buildTournamentReportData(results: ResultsSnapshot): TournamentReportData {
  const allScores = collectAllRoundScores(results.rankings);
  const sum = allScores.reduce((a, b) => a + b, 0);
  const rankings = [...results.rankings]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({
      rank: r.rank,
      participantId: r.participant_id,
      name: r.display_name,
      totalScore: r.total_score,
    }));

  const bottles = results.sample_details.map((s, i) => ({
    roundNo: i + 1,
    sampleId: s.sample_id,
    sampleName: s.sample_label,
    presenterName: s.presenter_name ?? '—',
    truth: truthToReportFields(s.truth),
  }));

  const bottleScores = results.sample_details.map((s, i) => {
    const participantScores = rankings.map((p) => {
      const ranking = results.rankings.find((r) => r.participant_id === p.participantId);
      const cell = ranking?.sample_scores.find((sc) => sc.sample_id === s.sample_id);
      return {
        participantId: p.participantId,
        name: p.name,
        score: cell?.score ?? 0,
      };
    });
    const totalScore = participantScores.reduce((a, b) => a + b.score, 0);
    return {
      roundNo: i + 1,
      sampleId: s.sample_id,
      sampleName: s.sample_label,
      presenterName: s.presenter_name ?? '—',
      participantScores,
      totalScore,
    };
  });

  return {
    sessionTitle: results.session.title,
    basic: {
      date: formatReportDate(results.session.created_at),
      participantCount: results.rankings.length,
      sampleCount: results.sample_details.length,
    },
    rankings,
    scoreSummary: {
      totalScore: sum,
      averageScore: allScores.length > 0 ? round1(sum / allScores.length) : 0,
      maxScore: allScores.length > 0 ? Math.max(...allScores) : 0,
      minScore: allScores.length > 0 ? Math.min(...allScores) : 0,
      medianScore: round1(median(allScores)),
    },
    bottles,
    bottleScores,
  };
}

export function buildOverallReportData(results: ResultsSnapshot): OverallReportData {
  const allScores = collectAllRoundScores(results.rankings);
  const sum = allScores.reduce((a, b) => a + b, 0);
  const cells = collectScoreCells(results.rankings);
  const winner = [...results.rankings].sort((a, b) => a.rank - b.rank)[0];
  const highest = pickExtremeScoreCells(cells, 'max');
  const lowest = pickExtremeScoreCells(cells, 'min');

  const bottleStats = results.sample_details.map((s, i) => {
    const scores = results.rankings.map((r) => {
      const cell = r.sample_scores.find((sc) => sc.sample_id === s.sample_id);
      return cell?.score ?? 0;
    });
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = scores.length > 0 ? total / scores.length : 0;
    return {
      roundNo: i + 1,
      sampleId: s.sample_id,
      sampleName: s.sample_label,
      presenterName: s.presenter_name ?? '—',
      totalScore: total,
      averageScore: round1(avg),
      stdDev: populationStdDev(scores),
    };
  });

  const hardest = [...bottleStats].sort((a, b) => a.totalScore - b.totalScore)[0];
  const best = [...bottleStats].sort((a, b) => b.totalScore - a.totalScore)[0];
  const divisive = [...bottleStats].sort((a, b) => b.stdDev - a.stdDev)[0];

  const difficultySorted = [...bottleStats].sort((a, b) => a.averageScore - b.averageScore);
  const bottleDifficulty = difficultySorted.map((b, idx) => ({
    rank: idx + 1,
    roundNo: b.roundNo,
    sampleId: b.sampleId,
    sampleName: b.sampleName,
    presenterName: b.presenterName,
    totalScore: b.totalScore,
    averageScore: b.averageScore,
  }));

  const cumulativeScores = results.sample_details.map((_, roundIdx) => {
    const scores = results.rankings.map((r) => {
      let cumulative = 0;
      for (let i = 0; i <= roundIdx; i++) {
        const sampleId = results.sample_details[i].sample_id;
        const cell = r.sample_scores.find((sc) => sc.sample_id === sampleId);
        cumulative += cell?.score ?? 0;
      }
      return {
        participantId: r.participant_id,
        participantName: r.display_name,
        cumulativeScore: cumulative,
      };
    });
    return { roundNo: roundIdx + 1, scores };
  });

  return {
    sessionTitle: results.session.title,
    basic: {
      date: formatReportDate(results.session.created_at),
      participantCount: results.rankings.length,
      sampleCount: results.sample_details.length,
      totalScore: sum,
      averageScore: allScores.length > 0 ? round1(sum / allScores.length) : 0,
    },
    highlights: {
      winner: {
        participantId: winner?.participant_id ?? '',
        name: winner?.display_name ?? '—',
        totalScore: winner?.total_score ?? 0,
      },
      highestScore: {
        participantId: highest?.primary.participantId ?? '',
        participantName: highest?.primary.participantName ?? '—',
        sampleId: highest?.primary.sampleId ?? '',
        sampleName: highest?.primary.sampleName ?? '—',
        score: highest?.primary.score ?? 0,
        othersCount: highest?.othersCount ?? 0,
      },
      lowestScore: {
        participantId: lowest?.primary.participantId ?? '',
        participantName: lowest?.primary.participantName ?? '—',
        sampleId: lowest?.primary.sampleId ?? '',
        sampleName: lowest?.primary.sampleName ?? '—',
        score: lowest?.primary.score ?? 0,
        othersCount: lowest?.othersCount ?? 0,
      },
      hardestBottle: {
        sampleId: hardest?.sampleId ?? '',
        sampleName: hardest?.sampleName ?? '—',
        presenterName: hardest?.presenterName ?? '—',
        totalScore: hardest?.totalScore ?? 0,
        averageScore: hardest?.averageScore ?? 0,
      },
      bestPerformedBottle: {
        sampleId: best?.sampleId ?? '',
        sampleName: best?.sampleName ?? '—',
        presenterName: best?.presenterName ?? '—',
        totalScore: best?.totalScore ?? 0,
        averageScore: best?.averageScore ?? 0,
      },
      mostDivisiveBottle: {
        sampleId: divisive?.sampleId ?? '',
        sampleName: divisive?.sampleName ?? '—',
        presenterName: divisive?.presenterName ?? '—',
        standardDeviation: round1(divisive?.stdDev ?? 0),
      },
    },
    bottleDifficulty,
    cumulativeScores,
  };
}

export function buildPersonalReportData(
  results: ResultsSnapshot,
  participantId: string,
): PersonalReportData | null {
  const ranking = results.rankings.find((r) => r.participant_id === participantId);
  if (!ranking) return null;

  const allScores = collectAllRoundScores(results.rankings);
  const overallAvg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const roundCount = Math.max(1, ranking.sample_scores.length);
  const participantAvg = ranking.total_score / roundCount;

  const itemMaxScores = getItemMaxScores(results.scoring_snapshot);
  const activeItemKeys = activeScoringItemKeys(results.scoring_snapshot);
  const maxTotalScorePerRoundVal = maxTotalScorePerRound(results.scoring_snapshot);

  const participantRounds = results.sample_details.map((s, i) => {
    const snap = s.scoring_snapshot ?? results.scoring_snapshot;
    const answer = s.participant_answers.find((a) => a.participant_id === participantId) ?? null;
    const items = {} as PersonalReportData['rounds'][0]['items'];
    for (const key of REPORT_ITEM_KEYS) {
      items[key] = buildRoundItem(key, snap, s.truth, answer);
    }
    return {
      roundNo: i + 1,
      sampleId: s.sample_id,
      sampleName: s.sample_label,
      presenterName: s.presenter_name ?? '—',
      totalScore: answer?.score ?? 0,
      maxTotalScore: maxTotalScorePerRound(snap),
      items,
    };
  });

  const roundScoresForExtremes = participantRounds
    .filter((r) =>
      results.sample_details
        .find((s) => s.sample_id === r.sampleId)
        ?.participant_answers.some((a) => a.participant_id === participantId),
    )
    .map((r) => ({
      sampleId: r.sampleId,
      sampleName: r.sampleName,
      presenterName: r.presenterName,
      score: r.totalScore,
    }));
  const highest = pickExtremeRoundScores(roundScoresForExtremes, 'max');
  const lowest = pickExtremeRoundScores(roundScoresForExtremes, 'min');

  return {
    sessionTitle: results.session.title,
    participant: {
      participantId,
      name: ranking.display_name,
      rank: ranking.rank,
      totalScore: ranking.total_score,
      averageScore: round1(participantAvg),
      diffFromOverallAverage: round1(participantAvg - overallAvg),
    },
    analysis: {
      categoryScores: buildCategoryScoresForParticipant(results, participantId),
      highestBottle: {
        sampleId: highest?.primary.sampleId ?? '',
        sampleName: highest?.primary.sampleName ?? '—',
        presenterName: highest?.primary.presenterName ?? '—',
        score: highest?.primary.score ?? 0,
        othersCount: highest?.othersCount ?? 0,
      },
      lowestBottle: {
        sampleId: lowest?.primary.sampleId ?? '',
        sampleName: lowest?.primary.sampleName ?? '—',
        presenterName: lowest?.primary.presenterName ?? '—',
        score: lowest?.primary.score ?? 0,
        othersCount: lowest?.othersCount ?? 0,
      },
    },
    rounds: participantRounds,
    itemMaxScores,
    activeItemKeys,
    maxTotalScorePerRound: maxTotalScorePerRoundVal,
  };
}
