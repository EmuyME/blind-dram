// POST /api/answers/upsert
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { writeLog, writeErrorLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:7',message:'Answers upsert API entry',data:{request_body_keys:Object.keys(body),has_participant_token:!!body.participant_token,has_sample_id:!!body.sample_id,status:body.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
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

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:106',message:'Before answer upsert',data:{answer_data_keys:Object.keys(answerData),sample_id,participant_id:participant.id,status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    const { data: answer, error: upsertError } = await supabase
      .from('answers')
      .upsert(answerData, {
        onConflict: 'session_id,sample_id,participant_id',
      })
      .select('id, status, version, submitted_at')
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:114',message:'After answer upsert',data:{has_answer:!!answer,answer_id:answer?.id,has_error:!!upsertError,error_code:upsertError?.code,error_message:upsertError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

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
      const allSubmitted =
        nonPresenterParticipants.length === 0
          ? true
          : nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id));
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/01e2fc3d-3da6-4ac5-b2d7-55efdca98905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:208',message:'State transition check - BEFORE update',data:{sample_id,current_state:sample.state,all_submitted:allSubmitted,truth_entered:truthEntered,non_presenter_count:nonPresenterParticipants.length,submitted_count:submittedAnswers?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/01e2fc3d-3da6-4ac5-b2d7-55efdca98905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:199',message:'State transition ERROR',data:{sample_id,error:stateUpdateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          // エラーをログに記録するが、回答保存は成功しているので続行
        } else if (updatedSample) {
          console.log('[DEBUG] Answer upsert - State transitioned successfully to grading');
          writeLog('ANSWER_UPSERT_STATE_TRANSITION_SUCCESS', { sample_id, new_state: 'grading' });
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/01e2fc3d-3da6-4ac5-b2d7-55efdca98905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:204',message:'State transition SUCCESS',data:{sample_id,new_state:'grading'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
        } else {
          // 状態が既に変更されていた場合（競合状態、おそらくtruths/upsertが先に実行された）
          console.log('[DEBUG] Answer upsert - State was already changed by another request (likely truths/upsert)');
          writeLog('ANSWER_UPSERT_STATE_ALREADY_CHANGED', { sample_id, expected_state: 'answering' });
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/01e2fc3d-3da6-4ac5-b2d7-55efdca98905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:230',message:'State transition NOT triggered',data:{sample_id,current_state:sample.state,all_submitted:allSubmitted,truth_entered:truthEntered,non_presenter_count:nonPresenterParticipants.length,submitted_count:submittedAnswers?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      }
    }

    return successResponse({
      answer_id: answer.id,
      status: answer.status,
      version: answer.version,
      submitted_at: answer.submitted_at,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/answers/upsert/route.ts:230',message:'Unexpected error in answers upsert',data:{error:String(error),error_stack:error instanceof Error?error.stack:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
