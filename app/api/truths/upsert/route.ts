// POST /api/truths/upsert
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { writeLog, writeErrorLog } from '@/lib/logger';

type TruthRow = Record<string, unknown>;

/** PostgREST / Supabase: リクエストに含まれる列が DB に無い（マイグレーション未適用） */
function isMissingColumnSchemaError(err: { message?: string } | null | undefined): boolean {
  const m = err?.message ?? '';
  return m.includes('schema cache') && m.includes('Could not find');
}

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

    // Participant認証
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('participant_token', participant_token)
      .single();

    if (participantError || !participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // Sample取得とPresenter権限チェック
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, presenter_participant_id')
      .eq('id', sample_id)
      .single();

    if (sampleError || !sample) {
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

    // true_abvを数値に変換（%記号を削除）
    let trueAbvNumeric: number | null = null;
    if (true_abv) {
      if (typeof true_abv === 'string') {
        // %記号を削除して数値に変換
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

    const baseCore: TruthRow = {
      session_id: sample.session_id,
      sample_id: sample_id,
      presenter_participant_id: participant.id,
      true_cask: trueCaskNorm,
      true_region: trueRegionNorm,
      true_age: trueAgeParsed,
      true_abv: trueAbvNumeric,
      true_distillery: trueDistilleryNorm,
      notes: notesNorm,
      bottle_image_url: bottleImageNorm,
      updated_at: new Date().toISOString(),
    };

    const withOtherItems: TruthRow = {
      ...baseCore,
      true_other1: other1Norm,
      true_other2: other2Norm,
    };

    const fullRow: TruthRow = {
      ...withOtherItems,
      true_bottler_name: trueBottlerName,
      true_distillation_year: distillationYear,
      true_bottling_year: bottlingYear,
    };

    async function tryUpsert(row: TruthRow) {
      return supabase
        .from('truths')
        .upsert(row, { onConflict: 'session_id,sample_id' })
        .select('id, sample_id, updated_at')
        .single();
    }

    let schemaFallback: 'omit_bottle_metadata' | 'legacy_core_only' | null = null;
    let truth: { id: string; sample_id: string; updated_at: string } | null = null;
    let { data: truthData, error: upsertError } = await tryUpsert(fullRow);
    truth = truthData;

    if (upsertError && isMissingColumnSchemaError(upsertError)) {
      writeLog('TRUTH_UPSERT_RETRY', {
        step: 'omit_bottle_metadata',
        message: upsertError.message,
      });
      ({ data: truthData, error: upsertError } = await tryUpsert(withOtherItems));
      truth = truthData;
      if (!upsertError) schemaFallback = 'omit_bottle_metadata';
    }

    if (upsertError && isMissingColumnSchemaError(upsertError)) {
      writeLog('TRUTH_UPSERT_RETRY', {
        step: 'legacy_core_only',
        message: upsertError.message,
      });
      ({ data: truthData, error: upsertError } = await tryUpsert(baseCore));
      truth = truthData;
      if (!upsertError) schemaFallback = 'legacy_core_only';
    }

    if (upsertError || !truth) {
      writeErrorLog('TRUTH_UPSERT', upsertError ?? new Error('truth row null'));
      if (isMissingColumnSchemaError(upsertError)) {
        return errorResponse(
          'truths テーブルが古い形式です。Supabase の SQL で supabase/migrations/add_truths_bottle_metadata.sql と add_scoring_extras_columns.sql を適用してください。',
          'SCHEMA_MISMATCH',
          500,
        );
      }
      return errorResponse(
        process.env.NODE_ENV === 'development' && upsertError?.message
          ? `Truth 保存エラー: ${upsertError.message}`
          : 'サーバーエラーが発生しました',
        'SERVER_ERROR',
        500,
      );
    }

    // 全員提出済み + Truth入力済みの場合、自動的にgradingに遷移
    // 状態遷移を試みる前に、現在の状態を確認
    // 注意: この時点で既にanswers/upsertが状態を変更している可能性があるため、
    // 状態が'answering'でない場合はスキップ（既に遷移済みの可能性）
    const { data: currentSample, error: currentSampleError } = await supabase
      .from('samples')
      .select('state')
      .eq('id', sample_id)
      .single();

    if (currentSampleError) {
      console.error('[DEBUG] Truth upsert - Failed to get current sample state:', currentSampleError);
    }

    console.log('[DEBUG] Truth upsert - Current sample state after truth save:', {
      sample_id,
      state: currentSample?.state,
      state_error: currentSampleError?.message,
    });

    // 状態が'answering'の場合のみ、状態遷移を試みる
    // 既に'grading'や他の状態に遷移している場合はスキップ
    if (currentSample?.state === 'answering') {
      // 参加者全員取得
      const { data: allParticipants } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', sample.session_id)
        .eq('is_attending', true);

      // プレゼンター以外の参加者を取得
      const nonPresenterParticipants = allParticipants?.filter((p) => p.id !== sample.presenter_participant_id) || [];

      // 提出済み回答取得
      const { data: submittedAnswers } = await supabase
        .from('answers')
        .select('participant_id')
        .eq('sample_id', sample_id)
        .eq('status', 'submitted');

      const submittedParticipantIds = new Set(submittedAnswers?.map((a) => a.participant_id) || []);
      
      const allSubmitted =
        nonPresenterParticipants.length > 0
          ? nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id))
          : true; // プレゼンター以外に出席者がいない → 回答待ちなし

      console.log('[DEBUG] Truth upsert - State transition check:', {
        sample_id: sample_id,
        current_state: currentSample?.state,
        presenter_id: sample.presenter_participant_id,
        all_participants_count: allParticipants?.length || 0,
        non_presenter_count: nonPresenterParticipants.length,
        submitted_count: submittedAnswers?.length || 0,
        all_submitted: allSubmitted,
        submitted_participant_ids: Array.from(submittedParticipantIds),
        non_presenter_ids: nonPresenterParticipants.map((p) => p.id),
      });

      // 全員提出済み + Truth入力済み（今保存したばかり）の場合、gradingに遷移
      if (allSubmitted) {
        console.log('[DEBUG] Truth upsert - All participants submitted, attempting state transition to grading');
        
        // 状態遷移を試みる（競合を避けるため、状態が'answering'のままの場合のみ更新）
        const { data: updatedSample, error: stateUpdateError } = await supabase
          .from('samples')
          .update({ state: 'grading' })
          .eq('id', sample_id)
          .eq('state', 'answering') // 状態が'answering'のままの場合のみ更新
          .select('state')
          .single();

        if (stateUpdateError) {
          console.error('[DEBUG] Truth upsert - State update error:', stateUpdateError);
          // エラーをログに記録するが、Truth保存は成功しているので続行
        } else if (updatedSample) {
          console.log('[DEBUG] Truth upsert - State transitioned successfully to grading');
          // 状態遷移が成功したことをレスポンスに含める
          return successResponse({
            truth_id: truth.id,
            sample_id: truth.sample_id,
            updated_at: truth.updated_at,
            state_transitioned: true,
            new_state: 'grading',
            schema_fallback: schemaFallback,
          });
        } else {
          // 状態が既に変更されていた場合（競合状態）
          console.log('[DEBUG] Truth upsert - State was already changed by another request (likely answers/upsert)');
        }
      } else {
        console.log('[DEBUG] Truth upsert - Not all participants submitted yet:', {
          all_submitted: allSubmitted,
          non_presenter_count: nonPresenterParticipants.length,
          submitted_count: submittedAnswers?.length || 0,
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
      schema_fallback: schemaFallback,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
