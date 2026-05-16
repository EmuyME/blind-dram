// POST /api/round/start
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, sample_id } = body;

    if (!participant_token || !sample_id) {
      return errorResponse('participant_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, state, presenter_participant_id, session_id, sort_order')
      .eq('id', sample_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .eq('participant_token', participant_token)
      .eq('session_id', sample.session_id)
      .single();

    if (participantError || !participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (sample.presenter_participant_id !== participant.id) {
      return errorResponse(
        'Presenter権限がありません。このSampleの持ち込み主のみ実行できます',
        'NOT_PRESENTER',
        403
      );
    }

    // 状態チェック
    if (sample.state !== 'pending') {
      return errorResponse(
        'Round状態が不正です。pending状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    // Session取得（逐次モードチェック用）
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, mode')
      .eq('id', sample.session_id)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 逐次モードの場合、前のラウンドがrevealedまたはclosed状態で全員が「次へ」を押すまで開始できない
    if (session.mode === 'sequential') {
      // 前のサンプル（sort_orderが小さいもの）を取得
      const { data: previousSample } = await supabase
        .from('samples')
        .select('id, state')
        .eq('session_id', session.id)
        .lt('sort_order', sample.sort_order || 0)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 前のサンプルがある場合、revealedまたはclosed状態かチェック
      if (previousSample) {
        // 前のサンプルがpending、answering、grading状態の場合は開始不可
        if (previousSample.state === 'pending' || previousSample.state === 'answering' || previousSample.state === 'grading') {
          return errorResponse(
            '前のラウンドが完了していません。前のラウンドを終了してから開始してください',
            'PREVIOUS_ROUND_NOT_CLOSED',
            409
          );
        }

        // 前のサンプルがclosed状態の場合は開始可能（全員が「次へ」を押した後）
        if (previousSample.state === 'closed') {
          // closed状態の場合は既に全員が「次へ」を押しているとみなす
        } else if (previousSample.state === 'revealed') {
          // 前のサンプルがrevealed状態の場合、全員が「次へ」を押したかチェック
          const { data: allParticipants } = await supabase
            .from('participants')
            .select('id')
            .eq('session_id', session.id)
            .eq('is_attending', true);

          const { data: allClicks } = await supabase
            .from('round_next_clicks')
            .select('participant_id')
            .eq('sample_id', previousSample.id);

          const clickedParticipantIds = new Set((allClicks || []).map((c) => c.participant_id));
          const allClicked = (allParticipants || []).length > 0 && (allParticipants || []).every((p) => clickedParticipantIds.has(p.id));

          if (!allClicked) {
            return errorResponse(
              '前のラウンドの結果確認が完了していません。全員が「次へ」を押すまで開始できません',
              'PREVIOUS_ROUND_NOT_READY',
              409
            );
          }
        }
      }
    }

    // Round状態をansweringに変更
    const { error: updateError } = await supabase
      .from('samples')
      .update({ state: 'answering' })
      .eq('id', sample_id);

    if (updateError) {
      console.error('Sample update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      sample_id: sample_id,
      state: 'answering',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
