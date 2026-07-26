// GET /api/round-result/get
// 逐次モードでラウンド終了時に表示する結果を取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { calculateScore } from '@/lib/score-calculator';
import {
  getAnswerSectionFlavor,
  tier1ListForSessionRadar,
  addAnswerMaxFlavorIntensitiesToTotals,
  mergeSubmittedAndPresenterDraftsForFlavorRadar,
  flavorCommentsFromAnswer,
  tier1CountsForAnswerFlavor,
  mergePresenterTastingTier2FromAnswers,
} from '@/lib/json-helpers';
import { resolvedTier1NightingaleColors } from '@/lib/flavor-chart-colors';
import type { ItemGradesMap } from '@/lib/scoring-schema';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const sampleId = searchParams.get('sample_id');

    if (!joinToken || !sampleId) {
      return errorResponse('join_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<
      {
        id: string;
        title: string;
        mode: string;
        state: string;
        flavor_chart_snapshot: unknown;
        scoring_snapshot: unknown;
        cask_options_snapshot: unknown;
        region_options_snapshot: unknown;
      }[]
    >`
      SELECT
        id, title, mode, state,
        flavor_chart_snapshot, scoring_snapshot,
        cask_options_snapshot, region_options_snapshot
      FROM sessions
      WHERE join_token = ${joinToken}
    `;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.mode !== 'sequential') {
      return errorResponse('逐次モードの時のみ使用できます', 'INVALID_MODE', 400);
    }

    const [sample] = await sql<
      {
        id: string;
        label: string;
        state: string;
        session_id: string;
        sort_order: number;
        presenter_participant_id: string | null;
      }[]
    >`
      SELECT id, label, state, session_id, sort_order, presenter_participant_id
      FROM samples
      WHERE id = ${sampleId}
        AND session_id = ${session.id}
    `;

    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    const hideFromParticipantUiId: string | null = sample.presenter_participant_id ?? null;

    if (sample.state !== 'revealed' && sample.state !== 'closed') {
      return errorResponse('このラウンドはまだ公開されていません', 'ROUND_NOT_FINISHED', 400);
    }

    const participants = await sql<{ id: string; display_name: string }[]>`
      SELECT id, display_name FROM participants
      WHERE session_id = ${session.id}
        AND is_attending = true
    `;

    const completedSamples = await sql<
      { id: string; label: string; presenter_participant_id: string | null }[]
    >`
      SELECT id, label, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id}
        AND state IN ('revealed', 'closed')
      ORDER BY sort_order
    `;

    const completedSampleIds = completedSamples.map((s) => s.id);

    type TruthRow = {
      sample_id: string;
      true_cask: string | null;
      true_region: string | null;
      true_age: number | null;
      true_abv: number | null;
      true_distillery: string | null;
      true_other1: string | null;
      true_other2: string | null;
      true_bottler_name: string | null;
      true_distillation_year: number | null;
      true_bottling_year: number | null;
      notes: string | null;
      bottle_image_url: string | null;
    };

    type AnswerRow = {
      sample_id: string;
      participant_id: string;
      guessed_cask: string | null;
      guessed_region: string | null;
      guessed_age: number | null;
      guessed_abv: number | null;
      guessed_distillery: string | null;
      guessed_other1: string | null;
      guessed_other2: string | null;
      nose: unknown;
      palate: unknown;
      finish: unknown;
      status?: string;
    };

    type GradeRow = {
      sample_id: string;
      participant_id: string;
      is_correct: boolean;
      item_grades: unknown;
    };

    let truths: TruthRow[] = [];
    let answers: AnswerRow[] = [];
    let draftAnswers: AnswerRow[] = [];
    let grades: GradeRow[] = [];

    if (completedSampleIds.length > 0) {
      truths = await sql<TruthRow[]>`
        SELECT
          sample_id, true_cask, true_region, true_age, true_abv, true_distillery,
          true_other1, true_other2, true_bottler_name,
          true_distillation_year, true_bottling_year, notes, bottle_image_url
        FROM truths
        WHERE session_id = ${session.id}
          AND sample_id = ANY(${completedSampleIds})
      `;

      answers = await sql<AnswerRow[]>`
        SELECT
          sample_id, participant_id,
          guessed_cask, guessed_region, guessed_age, guessed_abv, guessed_distillery,
          guessed_other1, guessed_other2, nose, palate, finish
        FROM answers
        WHERE session_id = ${session.id}
          AND status = 'submitted'
          AND sample_id = ANY(${completedSampleIds})
      `;

      try {
        draftAnswers = await sql<AnswerRow[]>`
          SELECT sample_id, participant_id, status, nose, palate, finish
          FROM answers
          WHERE session_id = ${session.id}
            AND status = 'draft'
            AND sample_id = ANY(${completedSampleIds})
        `;
      } catch (draftErr) {
        console.error('Draft answers fetch error (flavor radar):', draftErr);
      }

      grades = await sql<GradeRow[]>`
        SELECT sample_id, participant_id, is_correct, item_grades
        FROM distillery_grades
        WHERE session_id = ${session.id}
          AND sample_id = ANY(${completedSampleIds})
      `;
    }

    const answersForFlavorRadar = mergeSubmittedAndPresenterDraftsForFlavorRadar(
      answers,
      draftAnswers,
      completedSamples,
    );

    const participantScores = new Map<string, { total: number; samples: Map<string, number> }>();

    participants.forEach((p) => {
      participantScores.set(p.id, { total: 0, samples: new Map() });
    });

    const caskOpts = Array.isArray(session.cask_options_snapshot)
      ? (session.cask_options_snapshot as string[])
      : [];
    const regionOpts = Array.isArray(session.region_options_snapshot)
      ? (session.region_options_snapshot as string[])
      : [];

    completedSamples.forEach((completedSample) => {
      const truth = truths.find((t) => t.sample_id === completedSample.id);
      if (!truth) return;

      participants.forEach((participant) => {
        if (completedSample.presenter_participant_id === participant.id) {
          return;
        }
        const answer = answers.find(
          (a) => a.sample_id === completedSample.id && a.participant_id === participant.id
        );
        if (!answer) return;

        const grade = grades.find(
          (g) => g.sample_id === completedSample.id && g.participant_id === participant.id
        );

        const score = calculateScore(
          {
            guessed_cask: answer.guessed_cask,
            guessed_region: answer.guessed_region,
            guessed_age: answer.guessed_age,
            guessed_abv: answer.guessed_abv,
            guessed_distillery: answer.guessed_distillery,
            guessed_other1: answer.guessed_other1,
            guessed_other2: answer.guessed_other2,
          },
          {
            true_cask: truth.true_cask,
            true_region: truth.true_region,
            true_age: truth.true_age,
            true_abv: truth.true_abv,
            true_distillery: truth.true_distillery,
            true_other1: truth.true_other1,
            true_other2: truth.true_other2,
          },
          grade
            ? {
                is_correct: grade.is_correct,
                item_grades: (grade.item_grades || null) as ItemGradesMap | null,
              }
            : null,
          session.scoring_snapshot,
          caskOpts,
          regionOpts
        );

        const participantScore = participantScores.get(participant.id);
        if (participantScore) {
          participantScore.total += score;
          participantScore.samples.set(completedSample.id, score);
        }
      });
    });

    const ranking = Array.from(participantScores.entries())
      .map(([participantId, scores]) => {
        const participant = participants.find((p) => p.id === participantId);
        return {
          participant_id: participantId,
          display_name: participant?.display_name || '',
          total_score: scores.total,
        };
      })
      .sort((a, b) => b.total_score - a.total_score)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        sample_scores: completedSamples.map((s) => ({
          sample_id: s.id,
          sample_label: s.label,
          score: participantScores.get(item.participant_id)?.samples.get(s.id) || 0,
        })),
      }));

    const rankingsForClient = hideFromParticipantUiId
      ? ranking.filter((r) => r.participant_id !== hideFromParticipantUiId)
      : ranking;
    const rankingsRenumbered = rankingsForClient.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const presenter = sample.presenter_participant_id
      ? participants.find((p) => p.id === sample.presenter_participant_id)
      : null;

    const currentTruth = truths.find((t) => t.sample_id === sampleId);
    if (!currentTruth) {
      return errorResponse('このラウンドの正解情報が見つかりません', 'TRUTH_NOT_FOUND', 404);
    }

    const currentAnswers = answers.filter((a) => a.sample_id === sampleId);
    const participantAnswers = currentAnswers
      .filter((answer) => !hideFromParticipantUiId || answer.participant_id !== hideFromParticipantUiId)
      .map((answer) => {
        const participant = participants.find((p) => p.id === answer.participant_id);
        const grade = grades.find(
          (g) => g.sample_id === sampleId && g.participant_id === answer.participant_id,
        );
        const score = participantScores.get(answer.participant_id)?.samples.get(sampleId) || 0;
        return {
          participant_id: answer.participant_id,
          display_name: participant?.display_name || '',
          guessed_cask: answer.guessed_cask || '',
          guessed_region: answer.guessed_region || '',
          guessed_age: answer.guessed_age ?? null,
          guessed_abv: answer.guessed_abv ?? null,
          guessed_distillery: answer.guessed_distillery || '',
          guessed_other1: answer.guessed_other1 ?? null,
          guessed_other2: answer.guessed_other2 ?? null,
          is_correct_distillery: grade?.is_correct || false,
          is_correct: grade?.is_correct ?? null,
          item_grades: grade?.item_grades ?? null,
          score,
        };
      });

    const tier1List = tier1ListForSessionRadar(session.flavor_chart_snapshot);
    const currentAnswersForRadar = answersForFlavorRadar.filter((a) => a.sample_id === sampleId);
    const guesserAnswersForRadar = currentAnswersForRadar.filter(
      (a) => !hideFromParticipantUiId || a.participant_id !== hideFromParticipantUiId,
    );

    const comments = guesserAnswersForRadar.map((answer) => {
      const participant = participants.find((p) => p.id === answer.participant_id);
      return {
        participant_id: answer.participant_id,
        display_name: participant?.display_name || '',
        ...flavorCommentsFromAnswer(answer),
      };
    });

    const per_participant_radar = guesserAnswersForRadar.map((answer) => ({
      participant_id: answer.participant_id,
      tier1_counts: tier1CountsForAnswerFlavor(answer, tier1List),
    }));

    const sampleTier1Counts: Record<string, number> = {};
    tier1List.forEach((tier1) => {
      sampleTier1Counts[tier1] = 0;
    });

    const presenterIdForRadar = sample.presenter_participant_id;
    const presenterAnswersForSampleRadar =
      presenterIdForRadar != null
        ? currentAnswersForRadar.filter((a) => a.participant_id === presenterIdForRadar)
        : [];
    presenterAnswersForSampleRadar.forEach((answer) => {
      addAnswerMaxFlavorIntensitiesToTotals(answer, sampleTier1Counts, tier1List);
    });

    const presenter_tasting_tier2 = mergePresenterTastingTier2FromAnswers(presenterAnswersForSampleRadar);

    const otherTermsCount: Record<string, number> = {};
    guesserAnswersForRadar.forEach((answer) => {
      (['nose', 'palate', 'finish'] as const).forEach((section) => {
        const flavor = getAnswerSectionFlavor(answer, section);
        if (flavor?.tier1_tags && Array.isArray(flavor.tier1_tags)) {
          const hasOther = flavor.tier1_tags.includes('その他');
          if (hasOther && flavor.tier2_terms && Array.isArray(flavor.tier2_terms)) {
            flavor.tier2_terms.forEach((term) => {
              if (term && term.trim()) {
                otherTermsCount[term] = (otherTermsCount[term] || 0) + 1;
              }
            });
          }
        }
      });
    });

    const otherTerms = Object.entries(otherTermsCount)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count);

    const [activeSample] = await sql<
      {
        id: string;
        label: string;
        state: string;
        presenter_participant_id: string | null;
      }[]
    >`
      SELECT id, label, state, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id}
        AND state IN ('answering', 'grading')
      LIMIT 1
    `;

    const [nextSample] = await sql<
      {
        id: string;
        label: string;
        state: string;
        presenter_participant_id: string | null;
      }[]
    >`
      SELECT id, label, state, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id}
        AND id <> ${sample.id}
        AND state = 'pending'
      ORDER BY sort_order
      LIMIT 1
    `;

    const nextClicks = await sql<{ participant_id: string }[]>`
      SELECT participant_id FROM round_next_clicks
      WHERE sample_id = ${sampleId}
    `;

    const clickedParticipantIds = new Set(nextClicks.map((c) => c.participant_id));
    const allClicked =
      participants.length > 0 &&
      participants.every((p) => clickedParticipantIds.has(p.id));
    const totalCount = participants.length;
    const clickedCount = clickedParticipantIds.size;
    const notClickedParticipants = participants
      .filter((p) => !clickedParticipantIds.has(p.id))
      .map((p) => ({ participant_id: p.id, display_name: p.display_name }));
    const clickedParticipants = participants
      .filter((p) => clickedParticipantIds.has(p.id))
      .map((p) => ({ participant_id: p.id, display_name: p.display_name }));

    const responseData = {
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        state: session.state,
      },
      current_sample: {
        id: sample.id,
        label: sample.label,
      },
      rankings: rankingsRenumbered,
      sample_detail: {
        sample_id: sample.id,
        sample_label: sample.label,
        presenter_name: presenter?.display_name || null,
        truth: {
          true_cask: currentTruth.true_cask,
          true_region: currentTruth.true_region,
          true_age: currentTruth.true_age,
          true_abv: currentTruth.true_abv,
          true_distillery: currentTruth.true_distillery,
          true_other1: currentTruth.true_other1 ?? null,
          true_other2: currentTruth.true_other2 ?? null,
          true_bottler_name: currentTruth.true_bottler_name ?? null,
          true_distillation_year: currentTruth.true_distillation_year ?? null,
          true_bottling_year: currentTruth.true_bottling_year ?? null,
          notes: currentTruth.notes ?? null,
          bottle_image_url: currentTruth.bottle_image_url || null,
        },
        participant_answers: participantAnswers,
        scoring_snapshot: session.scoring_snapshot ?? null,
        comments,
        radar: {
          tier1_counts: sampleTier1Counts,
        },
        other_terms: otherTerms,
        presenter_tasting_tier2,
        per_participant_radar,
      },
      active_sample: activeSample
        ? {
            id: activeSample.id,
            label: activeSample.label ?? null,
            state: activeSample.state ?? null,
            presenter_participant_id: activeSample.presenter_participant_id ?? null,
          }
        : null,
      has_next_sample: !!nextSample,
      next_sample: nextSample
        ? {
            id: nextSample.id,
            label: nextSample.label,
            presenter_participant_id: nextSample.presenter_participant_id ?? null,
          }
        : null,
      all_clicked_next: allClicked,
      next_clicks: {
        clicked_count: clickedCount,
        total_count: totalCount,
        not_clicked_participants: notClickedParticipants,
        clicked_participants: clickedParticipants,
      },
      tier1_nightingale_colors: resolvedTier1NightingaleColors(session.flavor_chart_snapshot),
      flavor_chart_snapshot: session.flavor_chart_snapshot,
    };

    return successResponse(responseData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
