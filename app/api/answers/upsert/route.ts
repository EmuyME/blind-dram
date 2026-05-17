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
      guessed_other1,
      guessed_other2,
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

    // Sample取得と状態チェック（プレゼンター情報も取得）
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state, presenter_participant_id')
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

    const isPresenter =
      sample.presenter_participant_id != null &&
      sample.presenter_participant_id === participant.id;
    const sampleState = sample.state as string;
    const isPostRoundSample =
      sampleState === 'revealed' || sampleState === 'closed';
    // プレゼンターは参加者の回答画面からは提出しない。answers 行が無いまま採点〜公開に進むため、
    // Presenter パネルからの初回テイスティング保存で行を作れるようにする（draft 想定／結果のレーダーは merge が draft も読む）。
    const presenterMayCreateFirstAnswerRow =
      isPresenter &&
      !existingAnswer &&
      (sample.state === 'grading' || isPostRoundSample);
    // 通常は answering のみ。差し戻し後は grading + draft。
    // プレゼンターが Presenter パネルから提出済みのままテイスティングだけ後から足す場合は grading + submitted も許可。
    // Round 終了後（revealed / closed）もプレゼンターは提出済み回答のテイスティング更新のみ許可（結果チャート反映用）。
    const canUpsertInCurrentState =
      sample.state === 'answering' ||
      presenterMayCreateFirstAnswerRow ||
      (sample.state === 'grading' && existingAnswer?.status === 'draft') ||
      (sample.state === 'grading' && existingAnswer?.status === 'submitted' && isPresenter) ||
      (isPostRoundSample && isPresenter && existingAnswer?.status === 'submitted');
    if (!canUpsertInCurrentState) {
      return errorResponse(
        'Round状態が不正です。answering状態、または差し戻し後のみ回答できます（提出済みプレゼンターのテイスティング更新は grading または revealed/closed でも可）',
        'INVALID_STATE',
        400
      );
    }

    let preservedSubmittedRow: {
      version: number;
      guessed_cask: string | null;
      guessed_region: string | null;
      guessed_age: number | null;
      guessed_abv: number | null;
      guessed_distillery: string | null;
      guessed_other1: string | null;
      guessed_other2: string | null;
      score_0_100: number | null;
      bottle_image_url: string | null;
      submitted_at: string | null;
      nose: unknown;
      palate: unknown;
      finish: unknown;
    } | null = null;

    if (isPostRoundSample && isPresenter && existingAnswer?.status === 'submitted') {
      const { data: fullRow, error: fullErr } = await supabase
        .from('answers')
        .select(
          'version, guessed_cask, guessed_region, guessed_age, guessed_abv, guessed_distillery, guessed_other1, guessed_other2, score_0_100, bottle_image_url, submitted_at, nose, palate, finish',
        )
        .eq('session_id', sample.session_id)
        .eq('sample_id', sample_id)
        .eq('participant_id', participant.id)
        .single();

      if (fullErr || !fullRow) {
        return errorResponse('提出済み回答の取得に失敗しました', 'ANSWER_NOT_FOUND', 400);
      }
      preservedSubmittedRow = fullRow;
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
    const answerData: Record<string, unknown> = {
      session_id: sample.session_id,
      sample_id: sample_id,
      participant_id: participant.id,
      status,
      guessed_cask: guessed_cask || null,
      guessed_region: guessed_region || null,
      guessed_age: guessed_age || null,
      guessed_abv: guessedAbvNumeric,
      guessed_distillery: guessed_distillery || null,
      guessed_other1:
        typeof guessed_other1 === 'string' ? guessed_other1.trim() || null : guessed_other1 ?? null,
      guessed_other2:
        typeof guessed_other2 === 'string' ? guessed_other2.trim() || null : guessed_other2 ?? null,
      nose: nose || null,
      palate: palate || null,
      finish: finish || null,
      score_0_100: score_0_100 || null,
      version: newVersion,
      submitted_at: submittedAt,
      updated_at: new Date().toISOString(),
    };

    if (preservedSubmittedRow) {
      answerData.status = 'submitted';
      answerData.version = preservedSubmittedRow.version + 1;
      answerData.submitted_at = preservedSubmittedRow.submitted_at;
      answerData.guessed_cask = preservedSubmittedRow.guessed_cask;
      answerData.guessed_region = preservedSubmittedRow.guessed_region;
      answerData.guessed_age = preservedSubmittedRow.guessed_age;
      answerData.guessed_abv = preservedSubmittedRow.guessed_abv;
      answerData.guessed_distillery = preservedSubmittedRow.guessed_distillery;
      answerData.guessed_other1 = preservedSubmittedRow.guessed_other1;
      answerData.guessed_other2 = preservedSubmittedRow.guessed_other2;
      answerData.score_0_100 = preservedSubmittedRow.score_0_100;
      answerData.bottle_image_url = preservedSubmittedRow.bottle_image_url;
      answerData.nose = nose !== undefined ? nose : preservedSubmittedRow.nose;
      answerData.palate = palate !== undefined ? palate : preservedSubmittedRow.palate;
      answerData.finish = finish !== undefined ? finish : preservedSubmittedRow.finish;
    }

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
      // プレゼンター以外に出席者がいないときは、他人の提出待ちはない
      const allSubmitted =
        nonPresenterParticipants.length > 0
          ? nonPresenterParticipants.every((p) => submittedParticipantIds.has(p.id))
          : true;
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
