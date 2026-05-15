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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:42',message:'Samples fetch error',data:{session_id:session.id,error:samplesError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!allSamples || allSamples.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:47',message:'No samples found',data:{session_id:session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
        reason: 'no_samples',
      });
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:54',message:'All samples fetched',data:{session_id:session.id,session_mode:session.mode,samples_count:allSamples.length,samples_states:allSamples.map(s=>({id:s.id,state:s.state}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    if (session.mode === 'sequential') {
      // 逐次モードの場合、pending、answering、またはgrading状態のサンプルがある場合は完了していない
      const hasIncompleteSamples = allSamples.some(
        (s) => s.state === 'pending' || s.state === 'answering' || s.state === 'grading'
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:68',message:'Sequential mode check for incomplete samples',data:{has_incomplete_samples:hasIncompleteSamples,samples_states:allSamples.map(s=>s.state)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      // pending/answering/grading状態のサンプルがある場合は完了していない
      if (hasIncompleteSamples) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:71',message:'Returning early - incomplete samples found',data:{session_id:session.id,state:session.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        return successResponse({
          session_id: session.id,
          state: session.state,
          updated: false,
          reason: 'incomplete_samples_pending',
        });
      }
      // 逐次モードでは、すべてのサンプルがrevealedまたはclosed状態になった時点で完了
      // revealed状態のサンプルがある場合でも、すべてのサンプルがrevealedまたはclosed状態であれば完了とみなす
    }

    const allCompleted = allSamples.every(
      (s) => s.state === 'revealed' || s.state === 'closed'
    );

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:68',message:'All completed check',data:{all_completed:allCompleted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    if (!allCompleted) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:72',message:'Samples not completed',data:{session_id:session.id,state:session.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
        reason: 'samples_not_completed',
      });
    }

    // セッションをaggregating状態に遷移
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:81',message:'Transitioning to aggregating',data:{session_id:session.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ state: 'aggregating' })
      .eq('id', session.id);

    if (updateError) {
      console.error('Session update error:', updateError);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/session/check-complete/route.ts:87',message:'Session update error',data:{session_id:session.id,error:updateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
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
