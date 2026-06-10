// POST /api/owner/publish
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

    if (session.state !== 'aggregating') {
      return errorResponse(
        'Session状態が不正です。aggregating状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    const samples = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM samples WHERE session_id = ${session.id}
    `;

    if (samples.length === 0) {
      return errorResponse('Sampleが0個です', 'NO_SAMPLES', 400);
    }

    const hasIncomplete = samples.some(
      (s) => s.state === 'pending' || s.state === 'answering' || s.state === 'grading'
    );

    if (hasIncomplete) {
      return errorResponse(
        'まだ未完了のRoundがあります。すべてのRoundを完了してから結果を公開してください',
        'ROUNDS_NOT_COMPLETE',
        400
      );
    }

    await sql`
      UPDATE sessions SET state = 'published' WHERE id = ${session.id}
    `;

    return successResponse({
      session_id: session.id,
      state: 'published',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
