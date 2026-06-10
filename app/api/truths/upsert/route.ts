// POST /api/truths/upsert
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { writeErrorLog } from '@/lib/logger';

function parseTrueAge(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = parseInt(v.trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      participant_token,
      sample_id,
      true_cask,
      true_region,
      true_age,
      true_abv,
      true_distillery,
      true_other1,
      true_other2,
      true_bottler_name,
      true_distillation_year,
      true_bottling_year,
      notes,
      bottle_image_url,
    } = body;

    if (!participant_token || !sample_id) {
      return errorResponse('participant_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const participants = await sql`
      SELECT id, session_id FROM participants
      WHERE participant_token = ${participant_token}
      LIMIT 1
    `;
    const participant = participants[0];
    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const samples = await sql`
      SELECT id, session_id, presenter_participant_id FROM samples
      WHERE id = ${sample_id}
      LIMIT 1
    `;
    const sample = samples[0];
    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.presenter_participant_id !== participant.id) {
      return errorResponse('Presenter権限がありません', 'NOT_PRESENTER', 403);
    }

    const parseOptionalYear = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
      if (typeof v === 'string') {
        const n = parseInt(v.trim(), 10);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };

    const trueBottlerName =
      typeof true_bottler_name === 'string' ? true_bottler_name.trim() || null : null;
    const distillationYear = parseOptionalYear(true_distillation_year);
    const bottlingYear = parseOptionalYear(true_bottling_year);

    const trueCaskNorm = typeof true_cask === 'string' ? true_cask.trim() || null : true_cask || null;
    const trueRegionNorm =
      typeof true_region === 'string' ? true_region.trim() || null : true_region || null;
    const trueDistilleryNorm =
      typeof true_distillery === 'string'
        ? true_distillery.trim() || null
        : true_distillery || null;
    const notesNorm = typeof notes === 'string' ? notes.trim() || null : notes || null;
    const bottleImageNorm =
      typeof bottle_image_url === 'string'
        ? bottle_image_url.trim() || null
        : bottle_image_url ?? null;

    let trueAbvNumeric: number | null = null;
    if (true_abv) {
      if (typeof true_abv === 'string') {
        const cleaned = true_abv.replace(/%/g, '').trim();
        const parsed = parseFloat(cleaned);
        trueAbvNumeric = isNaN(parsed) ? null : parsed;
      } else if (typeof true_abv === 'number') {
        trueAbvNumeric = true_abv;
      }
    }

    const trueAgeParsed = parseTrueAge(true_age);
    const other1Norm =
      typeof true_other1 === 'string' ? true_other1.trim() || null : true_other1 ?? null;
    const other2Norm =
      typeof true_other2 === 'string' ? true_other2.trim() || null : true_other2 ?? null;

    const updatedAt = new Date().toISOString();

    let truthRows;
    try {
      truthRows = await sql`
        INSERT INTO truths (
          session_id, sample_id, presenter_participant_id,
          true_cask, true_region, true_age, true_abv, true_distillery,
          true_other1, true_other2, true_bottler_name,
          true_distillation_year, true_bottling_year,
          notes, bottle_image_url, updated_at
        ) VALUES (
          ${sample.session_id}, ${sample_id}, ${participant.id},
          ${trueCaskNorm}, ${trueRegionNorm}, ${trueAgeParsed}, ${trueAbvNumeric}, ${trueDistilleryNorm},
          ${other1Norm}, ${other2Norm}, ${trueBottlerName},
          ${distillationYear}, ${bottlingYear},
          ${notesNorm}, ${bottleImageNorm}, ${updatedAt}
        )
        ON CONFLICT (session_id, sample_id)
        DO UPDATE SET
          presenter_participant_id = EXCLUDED.presenter_participant_id,
          true_cask = EXCLUDED.true_cask,
          true_region = EXCLUDED.true_region,
          true_age = EXCLUDED.true_age,
          true_abv = EXCLUDED.true_abv,
          true_distillery = EXCLUDED.true_distillery,
          true_other1 = EXCLUDED.true_other1,
          true_other2 = EXCLUDED.true_other2,
          true_bottler_name = EXCLUDED.true_bottler_name,
          true_distillation_year = EXCLUDED.true_distillation_year,
          true_bottling_year = EXCLUDED.true_bottling_year,
          notes = EXCLUDED.notes,
          bottle_image_url = EXCLUDED.bottle_image_url,
          updated_at = EXCLUDED.updated_at
        RETURNING id, sample_id, updated_at
      `;
    } catch (upsertError) {
      writeErrorLog('TRUTH_UPSERT', upsertError);
      const message = upsertError instanceof Error ? upsertError.message : String(upsertError);
      return errorResponse(
        process.env.NODE_ENV === 'development' ? `Truth 保存エラー: ${message}` : 'サーバーエラーが発生しました',
        'SERVER_ERROR',
        500,
      );
    }

    const truth = truthRows[0];
    if (!truth) {
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const currentSampleRows = await sql`
      SELECT state FROM samples WHERE id = ${sample_id} LIMIT 1
    `;
    const currentSample = currentSampleRows[0];

    console.log('[DEBUG] Truth upsert - Current sample state after truth save:', {
      sample_id,
      state: currentSample?.state,
    });

    if (currentSample?.state === 'answering') {
      const allParticipants = await sql`
        SELECT id FROM participants
        WHERE session_id = ${sample.session_id} AND is_attending = true
      `;

      const nonPresenterParticipants = allParticipants.filter(
        (p) => p.id !== sample.presenter_participant_id,
      );

      const submittedAnswers = await sql`
        SELECT participant_id FROM answers
        WHERE sample_id = ${sample_id} AND status = 'submitted'
      `;

      const submittedParticipantIds = new Set(submittedAnswers.map((a) => a.participant_id));
      const allSubmitted =
        nonPresenterParticipants.length > 0
          ? nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id))
          : true;

      console.log('[DEBUG] Truth upsert - State transition check:', {
        sample_id: sample_id,
        current_state: currentSample?.state,
        presenter_id: sample.presenter_participant_id,
        all_participants_count: allParticipants.length,
        non_presenter_count: nonPresenterParticipants.length,
        submitted_count: submittedAnswers.length,
        all_submitted: allSubmitted,
        submitted_participant_ids: Array.from(submittedParticipantIds),
        non_presenter_ids: nonPresenterParticipants.map((p) => p.id),
      });

      if (allSubmitted) {
        console.log('[DEBUG] Truth upsert - All participants submitted, attempting state transition to grading');

        try {
          const updatedSamples = await sql`
            UPDATE samples SET state = 'grading'
            WHERE id = ${sample_id} AND state = 'answering'
            RETURNING state
          `;

          if (updatedSamples.length > 0) {
            console.log('[DEBUG] Truth upsert - State transitioned successfully to grading');
            return successResponse({
              truth_id: truth.id,
              sample_id: truth.sample_id,
              updated_at: truth.updated_at,
              state_transitioned: true,
              new_state: 'grading',
              schema_fallback: null,
            });
          }
          console.log('[DEBUG] Truth upsert - State was already changed by another request (likely answers/upsert)');
        } catch (stateUpdateError) {
          console.error('[DEBUG] Truth upsert - State update error:', stateUpdateError);
        }
      } else {
        console.log('[DEBUG] Truth upsert - Not all participants submitted yet:', {
          all_submitted: allSubmitted,
          non_presenter_count: nonPresenterParticipants.length,
          submitted_count: submittedAnswers.length,
        });
      }
    } else {
      console.log('[DEBUG] Truth upsert - Sample state is not "answering", skipping state transition:', {
        sample_id,
        current_state: currentSample?.state,
      });
    }

    return successResponse({
      truth_id: truth.id,
      sample_id: truth.sample_id,
      updated_at: truth.updated_at,
      state_transitioned: false,
      schema_fallback: null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
