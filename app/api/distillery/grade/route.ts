// POST /api/distillery/grade（項目別手採点・従来の蒸留所○×を統合）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import {
  calculateScoreExtended,
  normalizeScoringConfig,
  type ItemGradesMap,
  type ScoringItemKey,
} from '@/lib/scoring-schema';

function mergeItemGrades(
  existing: Record<string, unknown> | null | undefined,
  patch: ItemGradesMap | null | undefined,
): ItemGradesMap {
  const base = { ...(existing || {}) } as ItemGradesMap;
  if (!patch) return base;
  for (const [k, v] of Object.entries(patch)) {
    if (!v || typeof v !== 'object' || !('verdict' in v)) continue;
    base[k as ScoringItemKey] = v as ItemGradesMap[ScoringItemKey];
  }
  return base;
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[DEBUG] Request body parse error:', parseError);
      return errorResponse('リクエストボディの解析に失敗しました', 'INVALID_REQUEST', 400);
    }

    const participant_token = body.participant_token as string | undefined;
    const sample_id = body.sample_id as string | undefined;
    const target_participant_id = body.target_participant_id as string | undefined;
    const is_correct = body.is_correct as boolean | undefined;
    const item_grades_patch = body.item_grades as ItemGradesMap | undefined;

    if (!participant_token || !sample_id || !target_participant_id) {
      return errorResponse(
        'participant_token、sample_id、target_participant_idが必要です',
        'MISSING_PARAMETER',
        400,
      );
    }

    if (typeof is_correct !== 'boolean' && (item_grades_patch === undefined || item_grades_patch === null)) {
      return errorResponse('is_correct または item_grades が必要です', 'MISSING_PARAMETER', 400);
    }

    const { data: presenter, error: presenterError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('participant_token', participant_token)
      .single();

    if (presenterError || !presenter) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state, presenter_participant_id')
      .eq('id', sample_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.presenter_participant_id !== presenter.id) {
      return errorResponse('Presenter権限がありません', 'NOT_PRESENTER', 403);
    }

    if (sample.state !== 'grading') {
      return errorResponse(
        `Round状態が不正です。grading状態の時のみ採点できます（現在: ${sample.state}）`,
        'INVALID_STATE',
        400,
      );
    }

    const { data: targetParticipant, error: targetError } = await supabase
      .from('participants')
      .select('id')
      .eq('id', target_participant_id)
      .eq('session_id', sample.session_id)
      .single();

    if (targetError || !targetParticipant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    const { data: existingRow } = await supabase
      .from('distillery_grades')
      .select('item_grades, is_correct')
      .eq('session_id', sample.session_id)
      .eq('sample_id', sample_id)
      .eq('participant_id', target_participant_id)
      .maybeSingle();

    let patch: ItemGradesMap = item_grades_patch ? { ...item_grades_patch } : {};
    if (typeof is_correct === 'boolean' && !patch.distillery) {
      patch = {
        ...patch,
        distillery: { verdict: is_correct ? 'correct' : 'wrong' },
      };
    }

    const mergedMap = mergeItemGrades(
      existingRow?.item_grades as Record<string, unknown> | undefined,
      patch,
    );

    const dv = mergedMap.distillery;
    let dbIsCorrect =
      dv?.verdict === 'correct'
        ? true
        : dv?.verdict === 'wrong'
          ? false
          : typeof is_correct === 'boolean'
            ? is_correct
            : (existingRow?.is_correct ?? false);

    if (dv?.verdict === 'partial') {
      dbIsCorrect = false;
    }

    const gradeData = {
      session_id: sample.session_id,
      sample_id: sample_id,
      participant_id: target_participant_id,
      is_correct: dbIsCorrect,
      item_grades: mergedMap,
      graded_by_participant_id: presenter.id,
      graded_at: new Date().toISOString(),
    };

    const { data: grade, error: upsertError } = await supabase
      .from('distillery_grades')
      .upsert(gradeData, {
        onConflict: 'session_id,sample_id,participant_id',
      })
      .select('id, sample_id, participant_id, is_correct, item_grades')
      .single();

    if (upsertError) {
      console.error('[DEBUG] Grade upsert error:', upsertError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const { data: sessionRow } = await supabase
      .from('sessions')
      .select('scoring_snapshot, cask_options_snapshot, region_options_snapshot')
      .eq('id', sample.session_id)
      .single();

    const { data: answerRow } = await supabase
      .from('answers')
      .select(
        'guessed_cask, guessed_region, guessed_age, guessed_abv, guessed_distillery, guessed_other1, guessed_other2',
      )
      .eq('session_id', sample.session_id)
      .eq('sample_id', sample_id)
      .eq('participant_id', target_participant_id)
      .maybeSingle();

    const { data: truthRow } = await supabase
      .from('truths')
      .select(
        'true_cask, true_region, true_age, true_abv, true_distillery, true_other1, true_other2',
      )
      .eq('session_id', sample.session_id)
      .eq('sample_id', sample_id)
      .maybeSingle();

    const caskOpts = (sessionRow?.cask_options_snapshot as string[] | null) || [];
    const regionOpts = (sessionRow?.region_options_snapshot as string[] | null) || [];

    let previewScore = 0;
    if (answerRow && truthRow) {
      previewScore = calculateScoreExtended(
        {
          guessed_cask: answerRow.guessed_cask,
          guessed_region: answerRow.guessed_region,
          guessed_age: answerRow.guessed_age,
          guessed_abv: answerRow.guessed_abv,
          guessed_distillery: answerRow.guessed_distillery,
          guessed_other1: answerRow.guessed_other1,
          guessed_other2: answerRow.guessed_other2,
        },
        {
          true_cask: truthRow.true_cask,
          true_region: truthRow.true_region,
          true_age: truthRow.true_age,
          true_abv: truthRow.true_abv,
          true_distillery: truthRow.true_distillery,
          true_other1: truthRow.true_other1,
          true_other2: truthRow.true_other2,
        },
        {
          is_correct: grade.is_correct,
          item_grades: (grade.item_grades || {}) as ItemGradesMap,
        },
        sessionRow?.scoring_snapshot ?? normalizeScoringConfig(null),
        Array.isArray(caskOpts) ? caskOpts : [],
        Array.isArray(regionOpts) ? regionOpts : [],
      );
    }

    return successResponse({
      grade_id: grade.id,
      sample_id: grade.sample_id,
      participant_id: grade.participant_id,
      is_correct: grade.is_correct,
      item_grades: grade.item_grades,
      score_preview: previewScore,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
