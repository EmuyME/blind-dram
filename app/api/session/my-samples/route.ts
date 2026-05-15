// GET /api/session/my-samples
// 参加者が持ち込んだサンプル（presenter_participant_idが一致するもの）を取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const participantToken = searchParams.get('participant_token');

    if (!joinToken || !participantToken) {
      return errorResponse('join_tokenとparticipant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('join_token', joinToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // Participant取得
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .eq('participant_token', participantToken)
      .eq('session_id', session.id)
      .single();

    if (participantError || !participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    // この参加者が持ち込んだサンプルを取得
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, label, state, sort_order')
      .eq('session_id', session.id)
      .eq('presenter_participant_id', participant.id)
      .order('sort_order');

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse(samples || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
