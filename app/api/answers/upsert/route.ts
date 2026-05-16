// POST /api/answers/upsert
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { writeLog, writeErrorLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    
    const {
      participant_token,
      sample_id,
      status,
      guessed_cask,
      guessed_region,
      guessed_age,
      guessed_abv,
      guessed_distillery,
      nose,
      palate,
      finish,
      score_0_100,
    } = body;

    if (!participant_token || !sample_id || !status) {
      return errorResponse('participant_token、sample_id、statusが必要です', 'MISSING_PARAMETER', 400);
    }

    if (status !== 'draft' && status !== 'submitted') {
      return errorResponse('ステータスが不正です。draft または submitted を指定してください', 'INVALID_STATUS', 400);
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

    // Sample取得と状態チェック
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state')
      .eq('id', sample_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    // 既存回答取得（version・状態確認用）
    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('version, status')
      .eq('session_id', sample.session_id)
      .eq('sample_id', sample_id)
      .eq('participant_id', participant.id)
      .single();

    // 通常はansweringのみ回答可能。
    // ただし「差し戻し」で draft に戻された回答は grading 中でも再編集・再提出を許可する。
    const canUpsertInCurrentState =
      sample.state === 'answering' || (sample.state === 'grading' && existingAnswer?.status === 'draft');
    if (!canUpsertInCurrentState) {
      return errorResponse(
        'Round状態が不正です。answering状態、または差し戻し後のみ回答できます',
        'INVALID_STATE',
        400
      );
    }

    const newVersion = existingAnswer ? existingAnswer.version + 1 : 1;
    const submittedAt = status === 'submitted' ? new Date().toISOString() : null;

    // guessed_abvを数値に変換（%記号を削除）
    let guessedAbvNumeric: number | null = null;
    if (guessed_abv) {
      if (typeof guessed_abv === 'string') {
        // %記号を削除して数値に変換
        const cleaned = guessed_abv.replace(/%/g, '').trim();
        const parsed = parseFloat(cleaned);
        guessedAbvNumeric = isNaN(parsed) ? null : parsed;
      } else if (typeof guessed_abv === 'number') {
        guessedAbvNumeric = guessed_abv;
      }
    }

    // Answer upsert
    const answerData = {
      session_id: sample.session_id,
      sample_id: sample_id,
      participant_id: participant.id,
      status,
      guessed_cask: guessed_cask || null,
      guessed_region: guessed_region || null,
      guessed_age: guessed_age || null,
      guessed_abv: guessedAbvNumeric,
      guessed_distillery: guessed_distillery || null,
      nose: nose || null,
      palate: palate || null,
      finish: finish || null,
      score_0_100: score_0_100 || null,
      version: newVersion,
      submitted_at: submittedAt,
      updated_at: new Date().toISOString(),
    };

    const saveLogData = {
      participant_id: participant.id,
      sample_id: sample_id,
      status: status,
      has_guessed_distillery: !!guessed_distillery,
    };
    console.log('[DEBUG] Answer upsert - Saving answer:', saveLogData);
    writeLog('ANSWER_UPSERT_SAVE', saveLogData);


    const { data: answer, error: upsertError } = await supabase
      .from('answers')
      .upsert(answerData, {
        onConflict: 'session_id,sample_id,participant_id',
      })
      .select('id, status, version, submitted_at')
      .single();


    if (upsertError) {
      console.error('Answer upsert error:', upsertError);
      writeErrorLog('ANSWER_UPSERT_ERROR', upsertError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const successLogData = {
      answer_id: answer.id,
      status: answer.status,
      submitted_at: answer.submitted_at,
    };
    console.log('[DEBUG] Answer upsert - Saved successfully:', successLogData);
    writeLog('ANSWER_UPSERT_SUCCESS', successLogData);

    // 全員提出済み + Truth入力済みの場合、自動的にgradingに遷移
    if (status === 'submitted' && sample.state === 'answering') {
      // Sampleのpresenter_participant_idを取得
      const { data: sampleWithPresenter } = await supabase
        .from('samples')
        .select('presenter_participant_id')
        .eq('id', sample_id)
        .single();

      // 参加者全員取得
      const { data: allParticipants } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', sample.session_id)
        .eq('is_attending', true);

      // プレゼンター以外の参加者を取得
      const nonPresenterParticipants = 
        sampleWithPresenter?.presenter_participant_id
          ? allParticipants?.filter((p) => p.id !== sampleWithPresenter.presenter_participant_id) || []
          : allParticipants || [];

      // 提出済み回答取得
      const { data: submittedAnswers } = await supabase
        .from('answers')
        .select('participant_id')
        .eq('sample_id', sample_id)
        .eq('status', 'submitted');

      // Truth入力確認
      const { data: truth } = await supabase
        .from('truths')
        .select('id')
        .eq('sample_id', sample_id)
        .single();

      const submittedParticipantIds = new Set(submittedAnswers?.map((a) => a.participant_id) || []);
      
      // プレゼンター以外の全参加者が提出済みかチェック
      // 回答者ゼロ（プレゼンターのみ等）のときは「全員提出」とみなさない。
      // さもないと Truth 保存だけで answering → grading に進み、ラウンドが一瞬で終わって見える。
      const allSubmitted =
        nonPresenterParticipants.length > 0 &&
        nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id));
      const truthEntered = !!truth;

      const transitionLogData = {
        sample_id: sample_id,
        current_state: sample.state,
        presenter_id: sampleWithPresenter?.presenter_participant_id,
        all_participants_count: allParticipants?.length || 0,
        non_presenter_count: nonPresenterParticipants.length,
        submitted_count: submittedAnswers?.length || 0,
        all_submitted: allSubmitted,
        truth_entered: truthEntered,
        submitted_participant_ids: Array.from(submittedParticipantIds),
        non_presenter_ids: nonPresenterParticipants.map((p) => p.id),
      };
      console.log('[DEBUG] Answer upsert - State transition check:', transitionLogData);
      writeLog('ANSWER_UPSERT_STATE_CHECK', transitionLogData);

      // 全員提出済み + Truth入力済みの場合、gradingに遷移
      if (allSubmitted && truthEntered) {
        console.log('[DEBUG] Answer upsert - All participants submitted and truth entered, attempting state transition to grading');
        writeLog('ANSWER_UPSERT_STATE_TRANSITION', { 
          sample_id, 
          from: 'answering', 
          to: 'grading',
          reason: 'all_submitted_and_truth_entered'
        });
        
        // 状態遷移を試みる（競合を避けるため、状態が'answering'のままの場合のみ更新）
        const { data: updatedSample, error: stateUpdateError } = await supabase
          .from('samples')
          .update({ state: 'grading' })
          .eq('id', sample_id)
          .eq('state', 'answering') // 状態が'answering'のままの場合のみ更新
          .select('state')
          .single();

        if (stateUpdateError) {
          console.error('[DEBUG] Answer upsert - State update error:', stateUpdateError);
          writeErrorLog('ANSWER_UPSERT_STATE_UPDATE_ERROR', stateUpdateError);
          // エラーをログに記録するが、回答保存は成功しているので続行
        } else if (updatedSample) {
          console.log('[DEBUG] Answer upsert - State transitioned successfully to grading');
          writeLog('ANSWER_UPSERT_STATE_TRANSITION_SUCCESS', { sample_id, new_state: 'grading' });
        } else {
          // 状態が既に変更されていた場合（競合状態、おそらくtruths/upsertが先に実行された）
          console.log('[DEBUG] Answer upsert - State was already changed by another request (likely truths/upsert)');
          writeLog('ANSWER_UPSERT_STATE_ALREADY_CHANGED', { sample_id, expected_state: 'answering' });
        }
      } else {
      }
    }

    return successResponse({
      answer_id: answer.id,
      status: answer.status,
      version: answer.version,
      submitted_at: answer.submitted_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
