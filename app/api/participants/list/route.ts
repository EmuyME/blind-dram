// GET /api/participants/list — 参加復帰用（join_token のみで参加者一覧を返す）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const joinToken = request.nextUrl.searchParams.get('join_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id FROM sessions WHERE join_token = ${joinToken} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const participants = await sql`
      SELECT id, display_name, brought_count
      FROM participants
      WHERE session_id = ${session.id} AND is_attending = true
      ORDER BY created_at
    `;

    return successResponse({
      participants,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
