// POST /api/round-result/start-next
// 全員が「次へ」を押した後、次のラウンドを明示的に開始する
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, sample_id } = body;

    if (!participant_token || !sample_id) {
      return errorResponse('participant_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const [participant] = await sql<{ id: string; session_id: string }[]>`
      SELECT id, session_id FROM participants
      WHERE participant_token = ${participant_token}
    `;

    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const [sample] = await sql<{ id: string; session_id: string; state: string; sort_order: number }[]>`
      SELECT id, session_id, state, sort_order
      FROM samples
      WHERE id = ${sample_id}
        AND session_id = ${participant.session_id}
    `;

    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.state !== 'revealed') {
      const [activeSampleWhenNotRevealed] = await sql<{ id: string; state: string }[]>`
        SELECT id, state FROM samples
        WHERE session_id = ${participant.session_id}
          AND state IN ('answering', 'grading')
        LIMIT 1
      `;

      if (activeSampleWhenNotRevealed) {
        return successResponse({
          next_sample_id: activeSampleWhenNotRevealed.id,
          session_completed: false,
          already_started: true,
        });
      }

      return errorResponse('このラウンドはまだ終了していません', 'ROUND_NOT_FINISHED', 400);
    }

    const allParticipants = await sql<{ id: string }[]>`
      SELECT id FROM participants
      WHERE session_id = ${participant.session_id}
        AND is_attending = true
    `;

    const allClicks = await sql<{ participant_id: string }[]>`
      SELECT participant_id FROM round_next_clicks
      WHERE sample_id = ${sample_id}
    `;

    const clickedParticipantIds = new Set(allClicks.map((c) => c.participant_id));
    const allClicked =
      allParticipants.length > 0 &&
      allParticipants.every((p) => clickedParticipantIds.has(p.id));

    if (!allClicked) {
      return errorResponse('全員が「次へ」を押していません', 'NOT_ALL_CLICKED', 400);
    }

    const [activeSample] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM samples
      WHERE session_id = ${participant.session_id}
        AND state IN ('answering', 'grading')
      LIMIT 1
    `;

    if (activeSample) {
      return successResponse({
        next_sample_id: activeSample.id,
        session_completed: false,
      });
    }

    const [nextSample] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM samples
      WHERE session_id = ${participant.session_id}
        AND id <> ${sample.id}
        AND state = 'pending'
      ORDER BY sort_order
      LIMIT 1
    `;

    let nextSampleId: string | null = null;

    if (nextSample && nextSample.state === 'pending') {
      await sql`
        UPDATE samples SET state = 'answering' WHERE id = ${nextSample.id}
      `;
      nextSampleId = nextSample.id;
    } else if (!nextSample) {
      await sql`
        UPDATE sessions SET state = 'aggregating' WHERE id = ${participant.session_id}
      `;
    }

    return successResponse({
      next_sample_id: nextSampleId,
      session_completed: !nextSample,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
