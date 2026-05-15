// GET /api/session/check-pending-sample-ready
// 次のサンプルがpending状態で、全員が「次へ」を押したかどうかをチェック
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const sampleId = searchParams.get('sample_id');

    if (!joinToken || !sampleId) {
      return errorResponse('join_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, mode')
      .eq('join_token', joinToken)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 逐次モードでない場合は常にfalse
    if (session.mode !== 'sequential') {
      return successResponse({ is_ready: false });
    }

    // 指定されたサンプルを取得
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, state, sort_order')
      .eq('id', sampleId)
      .eq('session_id', session.id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    // pending状態でない場合はfalse
    if (sample.state !== 'pending') {
      return successResponse({ is_ready: false });
    }

    // 前のサンプルを取得（revealedまたはclosed状態）
    const { data: previousSample } = await supabase
      .from('samples')
      .select('id, state')
      .eq('session_id', session.id)
      .lt('sort_order', sample.sort_order || 0)
      .in('state', ['revealed', 'closed'])
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!previousSample) {
      // 前のサンプルがない場合（最初のラウンド）は開始可能
      // ただし、他のpending状態のサンプルがないか確認する必要はあるが、
      // ここでは最初のラウンドとして扱う
      const { data: earlierSamples } = await supabase
        .from('samples')
        .select('id, state')
        .eq('session_id', session.id)
        .lt('sort_order', sample.sort_order || 0);
      
      // 前のサンプルが存在し、pendingまたはansweringまたはgrading状態の場合は開始不可
      // revealed状態は全員が「次へ」を押すことで開始可能になるため除外
      if (earlierSamples && earlierSamples.length > 0) {
        const hasIncompleteSample = earlierSamples.some((s) => 
          s.state === 'pending' || s.state === 'answering' || s.state === 'grading'
        );
        if (hasIncompleteSample) {
          return successResponse({ is_ready: false });
        }
      }
      
      return successResponse({ is_ready: true });
    }

    // 前のサンプルがclosed状態の場合は開始可能
    if (previousSample.state === 'closed') {
      return successResponse({ is_ready: true });
    }

    // 前のサンプルがrevealed状態の場合、全員が「次へ」を押したかチェック
    // 前のサンプルに対して全員が「次へ」を押したかチェック
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

    return successResponse({ is_ready: allClicked });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
