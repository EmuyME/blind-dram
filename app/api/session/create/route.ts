// POST /api/session/create
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID, generateJoinCode } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, mode, flavor_chart_id, previous_session_id, previous_session_join_token } = body;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        location:'app/api/session/create/route.ts:10',
        message:'Session create request received',
        data:{has_title:!!title,mode,has_previous_session_id:!!previous_session_id,has_previous_session_join_token:!!previous_session_join_token},
        timestamp:Date.now(),
        sessionId:'debug-session',
        runId:'run-create',
        hypothesisId:'H_CREATE'
      })
    }).catch(()=>{});
    // #endregion

    // バリデーション
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return errorResponse('イベント名が空です', 'MISSING_TITLE', 400);
    }

    if (mode !== 'sequential' && mode !== 'simultaneous') {
      return errorResponse(
        '回答モードが不正です。sequential または simultaneous を指定してください',
        'INVALID_MODE',
        400
      );
    }

    // 逐次モードで前のセッションが指定された場合、その状態をチェック
    let previousSessionId: string | null = null;
    if (mode === 'sequential' && (previous_session_id || previous_session_join_token)) {
      let previousSessionQuery = previous_session_id
        ? supabase.from('sessions').select('id, state').eq('id', previous_session_id).single()
        : supabase.from('sessions').select('id, state').eq('join_token', previous_session_join_token).single();

      const { data: previousSession, error: previousSessionError } = await previousSessionQuery;

      if (previousSessionError || !previousSession) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            location:'app/api/session/create/route.ts:33',
            message:'Previous session not found',
            data:{previous_session_id:previous_session_id,previous_session_join_token:previous_session_join_token,error:previousSessionError},
            timestamp:Date.now(),
            sessionId:'debug-session',
            runId:'run-create',
            hypothesisId:'H_CREATE'
          })
        }).catch(()=>{});
        // #endregion
        return errorResponse('前のセッションが見つかりません', 'PREVIOUS_SESSION_NOT_FOUND', 404);
      }

      previousSessionId = previousSession.id;

      // 前のセッションの状態をチェック（publishedまたはclosedでない場合はエラー）
      if (previousSession.state !== 'published' && previousSession.state !== 'closed') {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            location:'app/api/session/create/route.ts:40',
            message:'Previous session not completed',
            data:{previous_session_state:previousSession.state},
            timestamp:Date.now(),
            sessionId:'debug-session',
            runId:'run-create',
            hypothesisId:'H_CREATE'
          })
        }).catch(()=>{});
        // #endregion
        return errorResponse(
          `前のセッションが完了していません。現在の状態: ${previousSession.state}。結果が公開されるまで新しいセッションを開始できません`,
          'PREVIOUS_SESSION_NOT_COMPLETED',
          409
        );
      }
    }

    // トークン生成
    const ownerToken = generateUUID();
    const joinToken = generateUUID();
    
    // 参加コード生成（重複チェック付き）
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('sessions')
        .select('id')
        .eq('join_code', joinCode)
        .maybeSingle();
      
      if (!existing) {
        break; // 重複なし
      }
      joinCode = generateJoinCode();
      attempts++;
    }

    // Session作成
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        title: title.trim(),
        owner_token: ownerToken,
        join_token: joinToken,
        join_code: joinCode,
        mode,
        state: 'registering',
        flavor_chart_id: flavor_chart_id || null,
        flavor_chart_snapshot: null,
        previous_session_id: previousSessionId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Session creation error:', error);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          location:'app/api/session/create/route.ts:87',
          message:'Session creation error',
          data:{error},
          timestamp:Date.now(),
          sessionId:'debug-session',
          runId:'run-create',
          hypothesisId:'H_CREATE'
        })
      }).catch(()=>{});
      // #endregion
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        location:'app/api/session/create/route.ts:92',
        message:'Session created successfully',
        data:{session_id:session.id,mode,state:session.state},
        timestamp:Date.now(),
        sessionId:'debug-session',
        runId:'run-create',
        hypothesisId:'H_CREATE'
      })
    }).catch(()=>{});
    // #endregion

    return successResponse({
      session_id: session.id,
      owner_token: ownerToken,
      join_token: joinToken,
      join_code: joinCode,
      owner_url: `/o/${ownerToken}`,
      join_url: `/s/${joinToken}`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
