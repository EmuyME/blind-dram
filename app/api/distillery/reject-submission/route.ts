// POST /api/distillery/reject-submission
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, sample_id, target_participant_id } = body;

    if (!participant_token || !sample_id || !target_participant_id) {
      return errorResponse('participant_token、sample_id、target_participant_idが必要です', 'MISSING_PARAMETER', 400);
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
      .select('id, session_id, presenter_participant_id, state')
      .eq('id', sample_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.presenter_participant_id !== presenter.id) {
      return errorResponse('Presenter権限がありません', 'NOT_PRESENTER', 403);
    }

    // すでに結果公開済み/終了済みの場合は差し戻し不可（状態が破綻しやすい）
    if (sample.state === 'revealed' || sample.state === 'closed') {
      return errorResponse('このRoundは終了しているため差し戻しできません', 'INVALID_STATE', 409);
    }

    // 回答取得
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select('id, version')
      .eq('session_id', sample.session_id)
      .eq('sample_id', sample_id)
      .eq('participant_id', target_participant_id)
      .single();

    if (answerError || !answer) {
      return errorResponse('回答が見つかりません', 'ANSWER_NOT_FOUND', 404);
    }

    // 回答をdraftに戻す
    const { error: updateError } = await supabase
      .from('answers')
      .update({
        status: 'draft',
        submitted_at: null,
        version: (answer.version || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', answer.id);

    if (updateError) {
      console.error('Answer update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 採点済みだった場合は採点も無効化（回答が変わるため）
    const { error: gradeDeleteError } = await supabase
      .from('distillery_grades')
      .delete()
      .eq('session_id', sample.session_id)
      .eq('sample_id', sample_id)
      .eq('participant_id', target_participant_id);

    if (gradeDeleteError) {
      console.error('Grade delete error:', gradeDeleteError);
      // 差し戻し自体は成功しているため続行
    }

    return successResponse({
      answer_id: answer.id,
      status: 'draft',
      sample_state: sample.state,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
