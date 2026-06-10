// POST /api/owner/set-results-visibility — 公開済みセッションの結果ページの公開範囲
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

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

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${owner_token}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state !== 'published') {
      return errorResponse(
        '結果の公開範囲は published 状態のときのみ変更できます',
        'INVALID_STATE',
        400,
      );
    }

    await sql`
      UPDATE sessions
      SET public_results = ${public_results}, updated_at = NOW()
      WHERE id = ${session.id}
    `;

    return successResponse({ public_results });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
