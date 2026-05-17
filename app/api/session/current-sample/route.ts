// GET /api/session/current-sample
// 現在のSessionで進行中のSample（answering状態）を取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state, mode')
      .eq('join_token', joinToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }


    if (session.state !== 'running') {
      return successResponse({ current_sample: null });
    }

    // 逐次モードの場合、結果確認（revealed/closed）を最優先で返す。
    // 逐次では「全員が次へを押すまで次ラウンドを開始しない」前提のため、
    // answering が存在しても revealed が残っているなら結果表示を優先する。
    const isSequential = session.mode === 'sequential';

    if (isSequential) {
      const { data: revealedSample } = await supabase
        .from('samples')
        .select('id, label, state, sort_order, presenter_participant_id')
        .eq('session_id', session.id)
        .eq('state', 'revealed')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();


      if (revealedSample) {
        return successResponse({
          current_sample: {
            id: revealedSample.id,
            label: revealedSample.label,
            state: revealedSample.state,
            presenter_participant_id: revealedSample.presenter_participant_id ?? null,
          },
          mode: session.mode,
        });
      }

      const { data: closedSample } = await supabase
        .from('samples')
        .select('id, label, state, sort_order, presenter_participant_id')
        .eq('session_id', session.id)
        .eq('state', 'closed')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();


      if (closedSample) {
        return successResponse({
          current_sample: {
            id: closedSample.id,
            label: closedSample.label,
            state: 'revealed',
            presenter_participant_id: closedSample.presenter_participant_id ?? null,
          },
          mode: session.mode,
        });
      }
    }

    // 現在のSampleを取得（優先順位: answering > grading > pending）
    const { data: answeringSample } = await supabase
      .from('samples')
      .select('id, label, state, sort_order, presenter_participant_id')
      .eq('session_id', session.id)
      .eq('state', 'answering')
      .order('sort_order')
      .limit(1)
      .maybeSingle();


    if (answeringSample) {
      return successResponse({
        current_sample: {
          id: answeringSample.id,
          label: answeringSample.label,
          state: answeringSample.state,
          presenter_participant_id: answeringSample.presenter_participant_id ?? null,
        },
        mode: session.mode,
      });
    }

    // grading状態のSampleを取得（採点中）
    const { data: gradingSample } = await supabase
      .from('samples')
      .select('id, label, state, sort_order, presenter_participant_id')
      .eq('session_id', session.id)
      .eq('state', 'grading')
      .order('sort_order')
      .limit(1)
      .maybeSingle();


    if (gradingSample) {
      return successResponse({
        current_sample: {
          id: gradingSample.id,
          label: gradingSample.label,
          state: gradingSample.state,
          presenter_participant_id: gradingSample.presenter_participant_id ?? null,
        },
        mode: session.mode,
      });
    }

    // 逐次モードの revealed/closed は冒頭で優先判定済み

    // answering状態（およびrevealed状態）のSampleがない場合、pending状態の最初のSampleを返す
    const { data: pendingSample } = await supabase
      .from('samples')
      .select('id, label, state, sort_order, presenter_participant_id')
      .eq('session_id', session.id)
      .eq('state', 'pending')
      .order('sort_order')
      .limit(1)
      .maybeSingle();


    if (pendingSample) {
      return successResponse({
        current_sample: {
          id: pendingSample.id,
          label: pendingSample.label,
          state: pendingSample.state,
          presenter_participant_id: pendingSample.presenter_participant_id ?? null,
        },
        mode: session.mode,
      });
    }

    // state が NULL / 想定外のとき .eq('state','pending') にマッチせず null になり、
    // クライアントが「全ラウンド完了」と誤表示するのを防ぐ
    const { data: allSamplesFallback, error: fallbackError } = await supabase
      .from('samples')
      .select('id, label, state, sort_order, presenter_participant_id')
      .eq('session_id', session.id)
      .order('sort_order', { ascending: true });

    if (!fallbackError && allSamplesFallback?.length) {
      const nonTerminal = allSamplesFallback.find(
        (s) => s.state !== 'revealed' && s.state !== 'closed',
      );
      if (nonTerminal) {
        const st = nonTerminal.state;
        const normalizedState =
          st === 'pending' || st === 'answering' || st === 'grading' ? st : 'pending';
        return successResponse({
          current_sample: {
            id: nonTerminal.id,
            label: nonTerminal.label,
            state: normalizedState,
            presenter_participant_id: nonTerminal.presenter_participant_id ?? null,
          },
          mode: session.mode,
        });
      }
    }

    // 進行中のSampleがない場合
    return successResponse({ current_sample: null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
