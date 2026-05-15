// GET /api/participants/me
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

    // Session存在確認
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('join_token', joinToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 参加者情報取得
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, display_name, is_attending, brought_count, session_id, created_at, updated_at')
      .eq('participant_token', participantToken)
      .eq('session_id', session.id)
      .single();

    if (participantError || !participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    return successResponse({
      id: participant.id,
      display_name: participant.display_name,
      is_attending: participant.is_attending,
      brought_count: participant.brought_count,
      session_id: participant.session_id,
      created_at: participant.created_at,
      updated_at: participant.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
