// POST /api/distillery/grade
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[DEBUG] Request body parse error:', parseError);
      return errorResponse('リクエストボディの解析に失敗しました', 'INVALID_REQUEST', 400);
    }

    const { participant_token, sample_id, target_participant_id, is_correct } = body;

    console.log('[DEBUG] Grade API called:', {
      has_participant_token: !!participant_token,
      sample_id,
      target_participant_id,
      is_correct,
      is_correct_type: typeof is_correct,
    });

    if (!participant_token || !sample_id || !target_participant_id || typeof is_correct !== 'boolean') {
      console.error('[DEBUG] Missing parameters:', {
        participant_token: !!participant_token,
        sample_id: !!sample_id,
        target_participant_id: !!target_participant_id,
        is_correct: typeof is_correct,
      });
      return errorResponse('participant_token、sample_id、target_participant_id、is_correctが必要です', 'MISSING_PARAMETER', 400);
    }

    // Participant認証（Presenter）
    const { data: presenter, error: presenterError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('participant_token', participant_token)
      .single();

    if (presenterError || !presenter) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // Sample取得とPresenter権限チェック
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

    // 状態チェック（grading状態でのみ採点可能）
    if (sample.state !== 'grading') {
      console.log('[DEBUG] Invalid state for grading:', {
        sample_id: sample_id,
        current_state: sample.state,
        expected_state: 'grading',
      });
      return errorResponse(
        `Round状態が不正です。grading状態の時のみ採点できます（現在: ${sample.state}）`,
        'INVALID_STATE',
        400
      );
    }

    // 採点対象の参加者存在確認
    const { data: targetParticipant, error: targetError } = await supabase
      .from('participants')
      .select('id')
      .eq('id', target_participant_id)
      .eq('session_id', sample.session_id)
      .single();

    if (targetError || !targetParticipant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    // 採点結果upsert
    const score = is_correct ? 6 : 0;
    const gradeData = {
      session_id: sample.session_id,
      sample_id: sample_id,
      participant_id: target_participant_id,
      is_correct,
      graded_by_participant_id: presenter.id,
      graded_at: new Date().toISOString(),
    };
    
    console.log('[DEBUG] Grade upsert data:', gradeData);

    const { data: grade, error: upsertError } = await supabase
      .from('distillery_grades')
      .upsert(gradeData, {
        onConflict: 'session_id,sample_id,participant_id',
      })
      .select('id, sample_id, participant_id, is_correct')
      .single();

    if (upsertError) {
      console.error('[DEBUG] Grade upsert error:', upsertError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    console.log('[DEBUG] Grade saved successfully:', grade);

    return successResponse({
      grade_id: grade.id,
      sample_id: grade.sample_id,
      participant_id: grade.participant_id,
      is_correct: grade.is_correct,
      score,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
