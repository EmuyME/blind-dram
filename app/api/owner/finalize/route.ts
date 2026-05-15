// POST /api/owner/finalize
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

    // 状態チェック
    if (session.state !== 'running') {
      return errorResponse(
        'Session状態が不正です。running状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    // 全Round完了確認
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, state')
      .eq('session_id', session.id);

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!samples || samples.length === 0) {
      return errorResponse('Sampleが0個です', 'NO_SAMPLES', 400);
    }

    // すべてのRoundがclosedまたはrevealedか確認
    const allRoundsComplete = samples.every(
      (s) => s.state === 'closed' || s.state === 'revealed'
    );

    if (!allRoundsComplete) {
      return errorResponse(
        '全Roundが完了していません。すべてのRoundを終了してから実行してください',
        'ROUNDS_NOT_COMPLETE',
        400
      );
    }

    // Session状態をaggregatingに変更
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ state: 'aggregating' })
      .eq('id', session.id);

    if (updateError) {
      console.error('Session update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      session_id: session.id,
      state: 'aggregating',
      aggregation_complete: true,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
