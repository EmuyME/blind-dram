// POST /api/round-result/start-next
// 全員が「次へ」を押した後、次のラウンドを明示的に開始する
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:7',message:'start-next API entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const body = await request.json();
    const { participant_token, sample_id } = body;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:12',message:'start-next - Request body parsed',data:{has_participant_token:!!participant_token,has_sample_id:!!sample_id,sample_id:sample_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (!participant_token || !sample_id) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:15',message:'start-next - Missing parameter',data:{has_participant_token:!!participant_token,has_sample_id:!!sample_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      return errorResponse('participant_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Participant認証
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('participant_token', participant_token)
      .single();

    if (participantError || !participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // Sample取得と状態チェック
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state, sort_order')
      .eq('id', sample_id)
      .eq('session_id', participant.session_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    // revealed でない場合は原則エラー。ただし「既に次ラウンドが開始済み」なら成功扱いで返す（冪等）
    if (sample.state !== 'revealed') {
      const { data: activeSampleWhenNotRevealed } = await supabase
        .from('samples')
        .select('id, state')
        .eq('session_id', participant.session_id)
        .in('state', ['answering', 'grading'])
        .limit(1)
        .maybeSingle();

      if (activeSampleWhenNotRevealed) {
        return successResponse({
          next_sample_id: activeSampleWhenNotRevealed.id,
          session_completed: false,
          already_started: true,
        });
      }

      return errorResponse('このラウンドはまだ終了していません', 'ROUND_NOT_FINISHED', 400);
    }

    // 全参加者がクリックしたかチェック
    const { data: allParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', participant.session_id)
      .eq('is_attending', true);

    const { data: allClicks } = await supabase
      .from('round_next_clicks')
      .select('participant_id')
      .eq('sample_id', sample_id);

    const clickedParticipantIds = new Set((allClicks || []).map((c) => c.participant_id));
    const allClicked = (allParticipants || []).length > 0 && (allParticipants || []).every((p) => clickedParticipantIds.has(p.id));

    if (!allClicked) {
      return errorResponse('全員が「次へ」を押していません', 'NOT_ALL_CLICKED', 400);
    }

    // 逐次モードで既にanswering/grading状態のサンプルがある場合は、
    // 「別の画面から次ラウンドが開始されている」とみなしてそのラウンド情報を返す
    const { data: activeSample } = await supabase
      .from('samples')
      .select('id, state')
      .eq('session_id', participant.session_id)
      .in('state', ['answering', 'grading'])
      .limit(1)
      .maybeSingle();

    if (activeSample) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:active-check',message:'Active sample found - returning existing round',data:{active_sample_id:activeSample.id,active_sample_state:activeSample.state},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // 既に進行中のラウンドがある場合は、それをクライアントに通知する
      return successResponse({
        next_sample_id: activeSample.id,
        session_completed: false,
      });
    }

    // 次のサンプルを取得
    // sort_orderの乱れで次サンプルが見つからないケースを避けるため、
    // 「同じセッション内の、自分以外のpendingサンプル」を単純に1件取得する
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:63',message:'Fetching next sample',data:{current_sample_id:sample.id,current_sort_order:sample.sort_order},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const { data: nextSample, error: nextSampleError } = await supabase
      .from('samples')
      .select('id, state')
      .eq('session_id', participant.session_id)
      .neq('id', sample.id)
      .eq('state', 'pending')
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    if (nextSampleError) {
      console.error('Next sample fetch error:', nextSampleError);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:74',message:'Next sample fetch error',data:{error:nextSampleError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:78',message:'Next sample result',data:{has_next_sample:!!nextSample,next_sample_id:nextSample?.id,next_sample_state:nextSample?.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    let nextSampleId: string | null = null;
    
    if (nextSample && nextSample.state === 'pending') {
      // 次のサンプルをanswering状態に変更
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:82',message:'Updating next sample to answering',data:{next_sample_id:nextSample.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const { error: nextSampleUpdateError } = await supabase
        .from('samples')
        .update({ state: 'answering' })
        .eq('id', nextSample.id);

      if (nextSampleUpdateError) {
        console.error('Next sample update error:', nextSampleUpdateError);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:87',message:'Next sample update error',data:{next_sample_id:nextSample.id,error:nextSampleUpdateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return errorResponse('次のラウンドの開始に失敗しました', 'SERVER_ERROR', 500);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:92',message:'Next sample updated to answering',data:{next_sample_id:nextSample.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      nextSampleId = nextSample.id;
    } else if (!nextSample) {
      // 次のサンプルがない場合のみ、セッションをaggregating状態に遷移
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:132',message:'No next sample - transitioning to aggregating',data:{session_id:participant.session_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      const { error: sessionUpdateError } = await supabase
        .from('sessions')
        .update({ state: 'aggregating' })
        .eq('id', participant.session_id);
      
      if (sessionUpdateError) {
        console.error('Session update to aggregating error:', sessionUpdateError);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/round-result/start-next/route.ts:138',message:'Session update to aggregating error',data:{session_id:participant.session_id,error:sessionUpdateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return errorResponse('セッション状態の更新に失敗しました', 'SERVER_ERROR', 500);
      }
    }

    return successResponse({
      next_sample_id: nextSampleId,
      session_completed: !nextSample,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
