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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:23',message:'Session not found',data:{join_token:joinToken,error:sessionError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:27',message:'Session found',data:{session_id:session.id,session_state:session.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (session.state !== 'running') {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:30',message:'Session state not running',data:{session_state:session.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return successResponse({ current_sample: null });
    }

    // 逐次モードの場合、結果確認（revealed/closed）を最優先で返す。
    // 逐次では「全員が次へを押すまで次ラウンドを開始しない」前提のため、
    // answering が存在しても revealed が残っているなら結果表示を優先する。
    const isSequential = session.mode === 'sequential';

    if (isSequential) {
      const { data: revealedSample, error: revealedError } = await supabase
        .from('samples')
        .select('id, label, state, sort_order')
        .eq('session_id', session.id)
        .eq('state', 'revealed')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:sequential-prefer-revealed',message:'Sequential prefer revealed sample query result',data:{has_revealed_sample:!!revealedSample,revealed_sample_id:revealedSample?.id,revealed_sample_state:revealedSample?.state,error:revealedError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (revealedSample) {
        return successResponse({
          current_sample: {
            id: revealedSample.id,
            label: revealedSample.label,
            state: revealedSample.state,
          },
          mode: session.mode,
        });
      }

      const { data: closedSample, error: closedError } = await supabase
        .from('samples')
        .select('id, label, state, sort_order')
        .eq('session_id', session.id)
        .eq('state', 'closed')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:sequential-prefer-closed',message:'Sequential prefer closed sample query result',data:{has_closed_sample:!!closedSample,closed_sample_id:closedSample?.id,closed_sample_state:closedSample?.state,error:closedError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (closedSample) {
        return successResponse({
          current_sample: {
            id: closedSample.id,
            label: closedSample.label,
            state: 'revealed',
          },
          mode: session.mode,
        });
      }
    }

    // 現在のSampleを取得（優先順位: answering > grading > pending）
    const { data: answeringSample, error: answeringError } = await supabase
      .from('samples')
      .select('id, label, state, sort_order')
      .eq('session_id', session.id)
      .eq('state', 'answering')
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:answering',message:'Answering sample query result',data:{has_answering_sample:!!answeringSample,answering_sample_id:answeringSample?.id,answering_sample_state:answeringSample?.state,error:answeringError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (answeringSample) {
      return successResponse({
        current_sample: {
          id: answeringSample.id,
          label: answeringSample.label,
          state: answeringSample.state,
        },
        mode: session.mode,
      });
    }

    // grading状態のSampleを取得（採点中）
    const { data: gradingSample, error: gradingError } = await supabase
      .from('samples')
      .select('id, label, state, sort_order')
      .eq('session_id', session.id)
      .eq('state', 'grading')
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:grading',message:'Grading sample query result',data:{has_grading_sample:!!gradingSample,grading_sample_id:gradingSample?.id,grading_sample_state:gradingSample?.state,error:gradingError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (gradingSample) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:grading-return',message:'Returning grading sample',data:{sample_id:gradingSample.id,sample_state:gradingSample.state,sample_label:gradingSample.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return successResponse({
        current_sample: {
          id: gradingSample.id,
          label: gradingSample.label,
          state: gradingSample.state,
        },
        mode: session.mode,
      });
    }

    // 逐次モードの revealed/closed は冒頭で優先判定済み

    // answering状態（およびrevealed状態）のSampleがない場合、pending状態の最初のSampleを返す
    const { data: pendingSample, error: pendingError } = await supabase
      .from('samples')
      .select('id, label, state, sort_order')
      .eq('session_id', session.id)
      .eq('state', 'pending')
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:61',message:'Pending sample query result',data:{has_pending_sample:!!pendingSample,pending_sample_id:pendingSample?.id,pending_sample_state:pendingSample?.state,error:pendingError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (pendingSample) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:63',message:'Returning pending sample',data:{sample_id:pendingSample.id,sample_state:pendingSample.state,sample_label:pendingSample.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return successResponse({
        current_sample: {
          id: pendingSample.id,
          label: pendingSample.label,
          state: pendingSample.state,
        },
        mode: session.mode,
      });
    }

    // 進行中のSampleがない場合
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:72',message:'No samples found',data:{session_id:session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return successResponse({ current_sample: null });
  } catch (error) {
    console.error('Unexpected error:', error);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/current-sample/route.ts:74',message:'Unexpected error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
