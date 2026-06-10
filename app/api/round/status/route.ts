// GET /api/round/status
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { writeErrorLog } from '@/lib/logger';
import {
  isParticipantManualGradingComplete,
  type ItemGradesMap,
} from '@/lib/scoring-schema';

type AnswerRow = {
  participant_id: string;
  status: string | null;
  submitted_at: string | null;
  guessed_cask?: string | null;
  guessed_region?: string | null;
  guessed_age?: number | null;
  guessed_abv?: number | null;
  guessed_distillery?: string | null;
  guessed_other1?: string | null;
  guessed_other2?: string | null;
  nose?: unknown;
  palate?: unknown;
  finish?: unknown;
  bottle_image_url?: string | null;
};

type TruthRow = {
  id: string;
  true_cask?: string | null;
  true_region?: string | null;
  true_age?: number | null;
  true_abv?: number | null;
  true_distillery?: string | null;
  true_other1?: string | null;
  true_other2?: string | null;
  true_bottler_name?: string | null;
  true_distillation_year?: number | null;
  true_bottling_year?: number | null;
  notes?: string | null;
  bottle_image_url?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sampleId = searchParams.get('sample_id');
    const participantToken = searchParams.get('participant_token');

    if (!sampleId) {
      return errorResponse('sample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const [sample] = await sql<
      {
        id: string;
        state: string;
        session_id: string;
        presenter_participant_id: string | null;
        label: string;
      }[]
    >`
      SELECT id, state, session_id, presenter_participant_id, label
      FROM samples
      WHERE id = ${sampleId}
    `;

    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    const [sessionRow] = await sql<
      {
        mode: string;
        scoring_snapshot: unknown;
        cask_options_snapshot: unknown;
        region_options_snapshot: unknown;
      }[]
    >`
      SELECT mode, scoring_snapshot, cask_options_snapshot, region_options_snapshot
      FROM sessions
      WHERE id = ${sample.session_id}
    `;

    const sessionMode =
      sessionRow?.mode === 'sequential' || sessionRow?.mode === 'simultaneous'
        ? sessionRow.mode
        : null;

    let isPresenter = false;
    let participant: { id: string } | null = null;
    if (participantToken) {
      const [participantData] = await sql<{ id: string }[]>`
        SELECT id FROM participants
        WHERE participant_token = ${participantToken}
          AND session_id = ${sample.session_id}
      `;

      if (participantData) {
        participant = participantData;
        if (sample.presenter_participant_id === participant.id) {
          isPresenter = true;
        }
      }
    }

    const participants = await sql<{ id: string; display_name: string }[]>`
      SELECT id, display_name FROM participants
      WHERE session_id = ${sample.session_id}
        AND is_attending = true
    `;

    const isRevealed = sample.state === 'revealed';
    const includeAnswerDetails = isPresenter || isRevealed;

    const answers: AnswerRow[] = includeAnswerDetails
      ? await sql<AnswerRow[]>`
          SELECT
            participant_id, status, submitted_at,
            guessed_cask, guessed_region, guessed_age, guessed_abv,
            guessed_distillery, guessed_other1, guessed_other2,
            nose, palate, finish, bottle_image_url
          FROM answers
          WHERE sample_id = ${sampleId}
        `
      : await sql<AnswerRow[]>`
          SELECT participant_id, status, submitted_at
          FROM answers
          WHERE sample_id = ${sampleId}
        `;

    let grades: Array<{
      participant_id: string;
      is_correct: boolean;
      item_grades: ItemGradesMap | null;
    }> = [];

    if (isPresenter) {
      grades = await sql<
        {
          participant_id: string;
          is_correct: boolean;
          item_grades: ItemGradesMap | null;
        }[]
      >`
        SELECT participant_id, is_correct, item_grades
        FROM distillery_grades
        WHERE sample_id = ${sampleId}
      `;
    }

    const [truth] = includeAnswerDetails
      ? await sql<TruthRow[]>`
          SELECT
            id, true_cask, true_region, true_age, true_abv, true_distillery,
            true_other1, true_other2, true_bottler_name,
            true_distillation_year, true_bottling_year, notes, bottle_image_url
          FROM truths
          WHERE sample_id = ${sampleId}
        `
      : await sql<TruthRow[]>`
          SELECT id FROM truths WHERE sample_id = ${sampleId}
        `;

    const participantProgress = participants.map((p) => {
      const answer = answers.find((a) => a.participant_id === p.id);
      const answerStatus = answer ? answer.status : 'draft';

      const base = {
        participant_id: p.id,
        display_name: p.display_name,
        status: answerStatus,
        submitted_at: answer?.submitted_at || null,
      };

      const isMyAnswer = !isPresenter && participant && p.id === participant.id;
      const shouldIncludeAnswerDetails = isPresenter || (isRevealed && isMyAnswer);

      if (shouldIncludeAnswerDetails) {
        const gradeForParticipant = grades.find((g) => g.participant_id === p.id);
        if (answer) {
          return {
            ...base,
            guessed_cask: answer.guessed_cask || null,
            guessed_region: answer.guessed_region || null,
            guessed_age: answer.guessed_age || null,
            guessed_abv: answer.guessed_abv || null,
            guessed_distillery: answer.guessed_distillery || null,
            guessed_other1: answer.guessed_other1 ?? null,
            guessed_other2: answer.guessed_other2 ?? null,
            nose: answer.nose || null,
            palate: answer.palate || null,
            finish: answer.finish || null,
            bottle_image_url: answer.bottle_image_url || null,
            is_correct: gradeForParticipant?.is_correct ?? undefined,
            item_grades: gradeForParticipant?.item_grades ?? undefined,
          };
        }

        return {
          ...base,
          guessed_cask: null,
          guessed_region: null,
          guessed_age: null,
          guessed_abv: null,
          guessed_distillery: null,
          guessed_other1: null,
          guessed_other2: null,
          nose: null,
          palate: null,
          finish: null,
          bottle_image_url: null,
          is_correct: gradeForParticipant?.is_correct ?? undefined,
          item_grades: gradeForParticipant?.item_grades ?? undefined,
        };
      }

      return base;
    });

    const nonPresenterProgress = participantProgress.filter(
      (p) => p.participant_id !== sample.presenter_participant_id,
    );
    const allSubmitted =
      nonPresenterProgress.length > 0
        ? nonPresenterProgress.every((p) => p.status === 'submitted' || p.status === 'graded')
        : true;

    const truthEntered = !!truth;

    let allGraded = false;
    if (isPresenter) {
      const gradeByPid = new Map(grades.map((g) => [g.participant_id, g]));
      const submittedForGrading = participantProgress.filter(
        (p) => p.status === 'submitted' || p.status === 'graded',
      );
      const noNonPresenterAttendees = nonPresenterProgress.length === 0;
      if (noNonPresenterAttendees && submittedForGrading.length === 0) {
        allGraded = allSubmitted && truthEntered;
      } else {
        allGraded =
          allSubmitted &&
          submittedForGrading.length > 0 &&
          submittedForGrading.every((p) => {
            const g = gradeByPid.get(p.participant_id);
            return isParticipantManualGradingComplete(
              sessionRow?.scoring_snapshot ?? null,
              g
                ? { is_correct: g.is_correct, item_grades: g.item_grades }
                : null,
            );
          });
      }
    }

    const response: {
      sample_id: string;
      state: string;
      session_mode: typeof sessionMode;
      participant_progress: typeof participantProgress;
      truth_entered: boolean;
      all_submitted: boolean;
      all_graded: boolean;
      presenter_participant_id: string | null;
      label: string | null;
      truth?: {
        true_cask: string | null | undefined;
        true_region: string | null | undefined;
        true_age: number | null | undefined;
        true_abv: number | null | undefined;
        true_distillery: string | null | undefined;
        true_other1: string | null | undefined;
        true_other2: string | null | undefined;
        true_bottler_name: string | null | undefined;
        true_distillation_year: number | null | undefined;
        true_bottling_year: number | null | undefined;
        notes: string | null | undefined;
        bottle_image_url: string | null;
      };
      scoring_snapshot?: unknown;
      cask_options_snapshot?: unknown;
      region_options_snapshot?: unknown;
    } = {
      sample_id: sampleId,
      state: sample.state,
      session_mode: sessionMode,
      participant_progress: participantProgress,
      truth_entered: truthEntered,
      all_submitted: allSubmitted,
      all_graded: allGraded,
      presenter_participant_id: sample.presenter_participant_id,
      label: sample.label,
    };

    if ((isPresenter || isRevealed) && truth) {
      response.truth = {
        true_cask: truth.true_cask,
        true_region: truth.true_region,
        true_age: truth.true_age,
        true_abv: truth.true_abv,
        true_distillery: truth.true_distillery,
        true_other1: truth.true_other1,
        true_other2: truth.true_other2,
        true_bottler_name: truth.true_bottler_name,
        true_distillation_year: truth.true_distillation_year,
        true_bottling_year: truth.true_bottling_year,
        notes: truth.notes,
        bottle_image_url: truth.bottle_image_url || null,
      };
    }

    if (isPresenter) {
      response.scoring_snapshot = sessionRow?.scoring_snapshot ?? null;
      response.cask_options_snapshot = sessionRow?.cask_options_snapshot ?? null;
      response.region_options_snapshot = sessionRow?.region_options_snapshot ?? null;
    }

    return successResponse(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    writeErrorLog('ROUND_STATUS_ERROR', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
