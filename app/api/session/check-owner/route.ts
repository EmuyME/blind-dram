// GET /api/session/check-owner
// join_tokenとowner_tokenから、オーナーかどうかをチェック
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const ownerToken = searchParams.get('owner_token');

    if (!joinToken || !ownerToken) {
      return errorResponse('join_tokenとowner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const rows = await sql`
      SELECT id, owner_token, join_token
      FROM sessions
      WHERE join_token = ${joinToken}
      LIMIT 1
    `;

    const session = rows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const isOwner = session.owner_token === ownerToken;

    return successResponse({
      is_owner: isOwner,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
