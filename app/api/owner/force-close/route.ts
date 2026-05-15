// POST /api/owner/force-close
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証とSession取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state')
      .eq('owner_token', owner_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 既にclosed状態の場合はエラー
    if (session.state === 'closed') {
      return errorResponse('Sessionは既に終了しています', 'ALREADY_CLOSED', 400);
    }

    // Session状態をclosedに強制変更（どの状態からでも可能）
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ state: 'closed' })
      .eq('id', session.id);

    if (updateError) {
      console.error('Session update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      session_id: session.id,
      state: 'closed',
      previous_state: session.state,
      message: 'Sessionを強制終了しました',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
