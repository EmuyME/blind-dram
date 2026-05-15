// POST /api/owner/set-results-visibility — 公開済みセッションの結果ページの公開範囲
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token, public_results } = body;

    if (!owner_token || typeof owner_token !== 'string') {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (typeof public_results !== 'boolean') {
      return errorResponse('public_results（boolean）が必要です', 'MISSING_PARAMETER', 400);
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state')
      .eq('owner_token', owner_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state !== 'published') {
      return errorResponse(
        '結果の公開範囲は published 状態のときのみ変更できます',
        'INVALID_STATE',
        400,
      );
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ public_results, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (updateError) {
      console.error('set-results-visibility update error:', updateError);
      if (updateError.code === '42703') {
        return errorResponse(
          'データベースに public_results 列がありません。migrations/add_public_results_to_sessions.sql を適用してください。',
          'SCHEMA_OUTDATED',
          500,
        );
      }
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({ public_results });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
