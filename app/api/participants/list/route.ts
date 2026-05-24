// GET /api/participants/list — 参加復帰用（join_token のみで参加者一覧を返す）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const joinToken = request.nextUrl.searchParams.get('join_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('join_token', joinToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, display_name, brought_count')
      .eq('session_id', session.id)
      .eq('is_attending', true)
      .order('created_at');

    if (participantsError) {
      console.error('Participants list error:', participantsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      participants: participants ?? [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
