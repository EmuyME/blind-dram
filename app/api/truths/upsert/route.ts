// POST /api/truths/upsert
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

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


    // Truth upsert
    const { data: truth, error: upsertError } = await supabase
      .from('truths')
      .upsert(
        {
          session_id: sample.session_id,
          sample_id: sample_id,
          presenter_participant_id: participant.id,
          true_cask: true_cask || null,
          true_region: true_region || null,
          true_age: true_age || null,
          true_abv: trueAbvNumeric,
          true_distillery: true_distillery || null,
          notes: notes || null,
          bottle_image_url: bottle_image_url || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,sample_id',
        }
      )
      .select('id, sample_id, updated_at')
      .single();


    if (upsertError) {
      console.error('Truth upsert error:', upsertError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
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
      
      // プレゼンター以外の全参加者が提出済みかチェック
      // 回答者ゼロのときは「全員提出」とみなさない（Truth だけで grading に進めない）
      const allSubmitted =
        nonPresenterParticipants.length > 0 &&
        nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id));

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
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
