// POST /api/owner/force-close
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${owner_token}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state === 'closed') {
      return errorResponse('Sessionは既に終了しています', 'ALREADY_CLOSED', 400);
    }

    await sql`
      UPDATE sessions SET state = 'closed' WHERE id = ${session.id}
    `;

    return successResponse({
      session_id: session.id,
      state: 'closed',
      previous_state: session.state,
      message: 'Sessionを強制終了しました',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
