// POST /api/session/check-complete
// すべてのサンプルが完了している場合、セッションをaggregating状態に遷移させる
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_token } = body;

    if (!join_token) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state, mode')
      .eq('join_token', join_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 状態チェック
    if (session.state !== 'running') {
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
      });
    }

    // すべてのサンプルがrevealedまたはclosed状態かチェック
    const { data: allSamples, error: samplesError } = await supabase
      .from('samples')
      .select('id, state')
      .eq('session_id', session.id);

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!allSamples || allSamples.length === 0) {
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
        reason: 'no_samples',
      });
    }


    if (session.mode === 'sequential') {
      // 逐次モード: revealed は結果ページで全員が「次へ」を押すまで未完了（aggregating は start-next 側で遷移）
      const hasIncompleteSamples = allSamples.some(
        (s) =>
          s.state === 'pending' ||
          s.state === 'answering' ||
          s.state === 'grading' ||
          s.state === 'revealed',
      );
      if (hasIncompleteSamples) {
        return successResponse({
          session_id: session.id,
          state: session.state,
          updated: false,
          reason: 'incomplete_samples_pending',
        });
      }
    }

    const allCompleted = allSamples.every(
      (s) => s.state === 'revealed' || s.state === 'closed'
    );


    if (!allCompleted) {
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
        reason: 'samples_not_completed',
      });
    }

    // セッションをaggregating状態に遷移
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
      updated: true,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
