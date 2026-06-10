// GET /api/session/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

type SessionRowFetched = {
  id: string;
  title: string;
  mode: string;
  state: string;
  flavor_chart_snapshot: unknown;
  cask_options_snapshot: unknown;
  region_options_snapshot: unknown;
  scoring_snapshot: unknown;
  created_at: string;
  updated_at: string;
  join_code: string | null;
  join_token: string | null;
  public_results: boolean | null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const ownerToken = searchParams.get('owner_token');

    if (!joinToken && !ownerToken) {
      return errorResponse('join_tokenまたはowner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const rows = joinToken
      ? await sql`
          SELECT
            id, title, mode, state, flavor_chart_snapshot,
            cask_options_snapshot, region_options_snapshot, scoring_snapshot,
            created_at, updated_at, join_code, join_token, public_results
          FROM sessions
          WHERE join_token = ${joinToken}
          LIMIT 1
        `
      : await sql`
          SELECT
            id, title, mode, state, flavor_chart_snapshot,
            cask_options_snapshot, region_options_snapshot, scoring_snapshot,
            created_at, updated_at, join_code, join_token, public_results
          FROM sessions
          WHERE owner_token = ${ownerToken}
          LIMIT 1
        `;

    const session = (rows[0] as SessionRowFetched | undefined) ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    return successResponse({
      id: session.id,
      title: session.title,
      mode: session.mode,
      state: session.state,
      flavor_chart_snapshot: session.flavor_chart_snapshot,
      cask_options_snapshot: session.cask_options_snapshot,
      region_options_snapshot: session.region_options_snapshot,
      scoring_snapshot: session.scoring_snapshot,
      join_code: session.join_code ?? null,
      join_token: session.join_token ?? null,
      public_results: session.public_results !== false,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
