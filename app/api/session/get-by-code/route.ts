// GET /api/session/get-by-code
// 参加コードからjoin_tokenを取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinCode = searchParams.get('join_code');

    if (!joinCode) {
      return errorResponse('join_codeが必要です', 'MISSING_PARAMETER', 400);
    }

    const rows = await sql`
      SELECT id, title, mode, state, join_token
      FROM sessions
      WHERE join_code = ${joinCode.toUpperCase()}
      LIMIT 1
    `;

    const session = rows[0] ?? null;

    if (!session) {
      return errorResponse('参加コードが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.state !== 'registering') {
      return errorResponse('このイベントの参加登録は既に締め切られています', 'REGISTRATION_CLOSED', 400);
    }

    return successResponse({
      join_token: session.join_token,
      title: session.title,
      mode: session.mode,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
