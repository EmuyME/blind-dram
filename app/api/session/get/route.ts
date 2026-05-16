// GET /api/session/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, isMissingPublicResultsColumn } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

type SessionRowFetched = {
  id: string;
  title: string;
  mode: string;
  state: string;
  flavor_chart_snapshot: unknown;
  created_at: string;
  updated_at: string;
  join_code: string | null;
  join_token: string | null;
  public_results?: boolean | null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const ownerToken = searchParams.get('owner_token');


    if (!joinToken && !ownerToken) {
      return errorResponse('join_tokenまたはowner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session取得（cask_options_snapshotとregion_options_snapshotはオプショナル）
    
    const selectWithPublic =
      'id, title, mode, state, flavor_chart_snapshot, created_at, updated_at, join_code, join_token, public_results';
    const selectWithoutPublic =
      'id, title, mode, state, flavor_chart_snapshot, created_at, updated_at, join_code, join_token';

    let session: SessionRowFetched | null = null;
    let error: PostgrestError | null = null;

    const first = await supabase
      .from('sessions')
      .select(selectWithPublic)
      .eq(joinToken ? 'join_token' : 'owner_token', joinToken ?? ownerToken)
      .single();

    session = first.data as SessionRowFetched | null;
    error = first.error;

    if (error && isMissingPublicResultsColumn(error)) {
      const retry = await supabase
        .from('sessions')
        .select(selectWithoutPublic)
        .eq(joinToken ? 'join_token' : 'owner_token', joinToken ?? ownerToken)
        .single();
      session = retry.data as SessionRowFetched | null;
      error = retry.error;
    }

    // オプショナルカラムを別途取得（存在する場合のみ）
    let caskOptionsSnapshot: unknown = null;
    let regionOptionsSnapshot: unknown = null;
    if (session && !error) {
      try {
        const optionalResult = await supabase
          .from('sessions')
          .select('cask_options_snapshot, region_options_snapshot')
          .eq(joinToken ? 'join_token' : 'owner_token', joinToken ?? ownerToken)
          .single();
        if (!optionalResult.error && optionalResult.data) {
          caskOptionsSnapshot = optionalResult.data.cask_options_snapshot;
          regionOptionsSnapshot = optionalResult.data.region_options_snapshot;
        }
      } catch {
        // カラムが存在しない場合は無視
      }
    }


    if (error || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }


    return successResponse({
      id: session.id,
      title: session.title,
      mode: session.mode,
      state: session.state,
      flavor_chart_snapshot: session.flavor_chart_snapshot,
      cask_options_snapshot: caskOptionsSnapshot,
      region_options_snapshot: regionOptionsSnapshot,
      join_code:
        session && typeof session === 'object' && 'join_code' in session
          ? (session as { join_code?: string | null }).join_code ?? null
          : null,
      join_token:
        session && typeof session === 'object' && 'join_token' in session
          ? (session as { join_token?: string | null }).join_token ?? null
          : null,
      public_results:
        session && typeof session === 'object' && 'public_results' in session
          ? (session as { public_results?: boolean | null }).public_results !== false
          : true,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
