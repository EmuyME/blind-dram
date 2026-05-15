// GET /api/session/get-by-code
// 参加コードからjoin_tokenを取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinCode = searchParams.get('join_code');

    if (!joinCode) {
      return errorResponse('join_codeが必要です', 'MISSING_PARAMETER', 400);
    }

    // 参加コードからセッションを取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, mode, state, join_token')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return errorResponse('参加コードが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // registering状態でない場合はエラー
    if (session.state !== 'registering') {
      return errorResponse('このイベントの参加登録は既に締め切られています', 'REGISTRATION_CLOSED', 400);
    }

    return successResponse({
      join_token: session.join_token,
      title: session.title,
      mode: session.mode,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
