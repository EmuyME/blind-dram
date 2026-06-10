// POST /api/round-result/click-next
// 「次へ」ボタンをクリックしたことを記録
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
      return errorResponse('このラウンドはまだ終了していません', 'ROUND_NOT_FINISHED', 400);
    }

    const [existingClick] = await sql<{ id: string }[]>`
      SELECT id FROM round_next_clicks
      WHERE sample_id = ${sample_id}
        AND participant_id = ${participant.id}
      LIMIT 1
    `;

    if (existingClick) {
      return successResponse({ already_clicked: true });
    }

    await sql`
      INSERT INTO round_next_clicks (sample_id, participant_id)
      VALUES (${sample_id}, ${participant.id})
    `;

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

    let nextSampleId: string | null = null;
    if (allClicked) {
      const [nextSample] = await sql<{ id: string }[]>`
        SELECT id FROM samples
        WHERE session_id = ${participant.session_id}
          AND sort_order > ${sample.sort_order ?? 0}
        ORDER BY sort_order
        LIMIT 1
      `;
      nextSampleId = nextSample?.id || null;
    }

    return successResponse({
      all_clicked: allClicked,
      next_sample_id: nextSampleId,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
