// GET /api/answers/get
// 既存の回答を取得する
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sampleId = searchParams.get('sample_id');
    const participantToken = searchParams.get('participant_token');

    if (!sampleId || !participantToken) {
      return errorResponse('sample_idとparticipant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Participant認証
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('participant_token', participantToken)
      .single();

    if (participantError || !participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // Sample取得と状態チェック
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state')
      .eq('id', sampleId)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.session_id !== participant.session_id) {
      return errorResponse('Sessionが一致しません', 'UNAUTHORIZED', 401);
    }

    // 既存回答取得
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select('*')
      .eq('session_id', sample.session_id)
      .eq('sample_id', sampleId)
      .eq('participant_id', participant.id)
      .single();

    if (answerError && answerError.code !== 'PGRST116') {
      // PGRST116は「行が見つからない」エラー（正常）
      console.error('Answer fetch error:', answerError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!answer) {
      // 回答がない場合は空の回答を返す
      return successResponse({
        answer: null,
      });
    }

    return successResponse({
      answer: {
        id: answer.id,
        status: answer.status,
        guessed_cask: answer.guessed_cask,
        guessed_region: answer.guessed_region,
        guessed_age: answer.guessed_age,
        guessed_abv: answer.guessed_abv,
        guessed_distillery: answer.guessed_distillery,
        nose: answer.nose,
        palate: answer.palate,
        finish: answer.finish,
        score_0_100: answer.score_0_100,
        bottle_image_url: answer.bottle_image_url,
        version: answer.version,
        submitted_at: answer.submitted_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
