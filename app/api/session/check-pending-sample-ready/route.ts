// GET /api/session/check-pending-sample-ready
// 次のサンプルがpending状態で、全員が「次へ」を押したかどうかをチェック
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const sampleId = searchParams.get('sample_id');

    if (!joinToken || !sampleId) {
      return errorResponse('join_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id, mode FROM sessions WHERE join_token = ${joinToken} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.mode !== 'sequential') {
      return successResponse({ is_ready: false });
    }

    const sampleRows = await sql`
      SELECT id, state, sort_order
      FROM samples
      WHERE id = ${sampleId} AND session_id = ${session.id}
      LIMIT 1
    `;
    const sample = sampleRows[0] ?? null;

    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.state !== 'pending') {
      return successResponse({ is_ready: false });
    }

    const sortOrder = sample.sort_order ?? 0;

    const previousRows = await sql`
      SELECT id, state
      FROM samples
      WHERE session_id = ${session.id}
        AND sort_order < ${sortOrder}
        AND state IN ('revealed', 'closed')
      ORDER BY sort_order DESC
      LIMIT 1
    `;
    const previousSample = previousRows[0] ?? null;

    if (!previousSample) {
      const earlierSamples = await sql`
        SELECT id, state
        FROM samples
        WHERE session_id = ${session.id} AND sort_order < ${sortOrder}
      `;

      if (earlierSamples.length > 0) {
        const hasIncompleteSample = earlierSamples.some(
          (s) => s.state === 'pending' || s.state === 'answering' || s.state === 'grading'
        );
        if (hasIncompleteSample) {
          return successResponse({ is_ready: false });
        }
      }

      return successResponse({ is_ready: true });
    }

    if (previousSample.state === 'closed') {
      return successResponse({ is_ready: true });
    }

    const allParticipants = await sql`
      SELECT id FROM participants
      WHERE session_id = ${session.id} AND is_attending = true
    `;

    const allClicks = await sql`
      SELECT participant_id FROM round_next_clicks WHERE sample_id = ${previousSample.id}
    `;

    const clickedParticipantIds = new Set(allClicks.map((c) => c.participant_id));
    const allClicked =
      allParticipants.length > 0 &&
      allParticipants.every((p) => clickedParticipantIds.has(p.id));

    return successResponse({ is_ready: allClicked });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
