// POST /api/session/check-complete
// すべてのサンプルが完了している場合、セッションをaggregating状態に遷移させる
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_token } = body;

    if (!join_token) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id, state, mode FROM sessions WHERE join_token = ${join_token} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.state !== 'running') {
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
      });
    }

    const allSamples = await sql`
      SELECT id, state FROM samples WHERE session_id = ${session.id}
    `;

    if (allSamples.length === 0) {
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
        reason: 'no_samples',
      });
    }

    if (session.mode === 'sequential') {
      const hasIncompleteSamples = allSamples.some(
        (s) =>
          s.state === 'pending' ||
          s.state === 'answering' ||
          s.state === 'grading' ||
          s.state === 'revealed',
      );
      if (hasIncompleteSamples) {
        return successResponse({
          session_id: session.id,
          state: session.state,
          updated: false,
          reason: 'incomplete_samples_pending',
        });
      }
    }

    const allCompleted = allSamples.every(
      (s) => s.state === 'revealed' || s.state === 'closed'
    );

    if (!allCompleted) {
      return successResponse({
        session_id: session.id,
        state: session.state,
        updated: false,
        reason: 'samples_not_completed',
      });
    }

    await sql`
      UPDATE sessions SET state = 'aggregating' WHERE id = ${session.id}
    `;

    return successResponse({
      session_id: session.id,
      state: 'aggregating',
      updated: true,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
