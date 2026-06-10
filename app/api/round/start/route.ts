// POST /api/round/start
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

    const [sample] = await sql<
      {
        id: string;
        state: string;
        presenter_participant_id: string;
        session_id: string;
        sort_order: number;
      }[]
    >`
      SELECT id, state, presenter_participant_id, session_id, sort_order
      FROM samples
      WHERE id = ${sample_id}
    `;

    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    const [participant] = await sql<{ id: string }[]>`
      SELECT id FROM participants
      WHERE participant_token = ${participant_token}
        AND session_id = ${sample.session_id}
    `;

    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (sample.presenter_participant_id !== participant.id) {
      return errorResponse(
        'Presenter権限がありません。このSampleの持ち込み主のみ実行できます',
        'NOT_PRESENTER',
        403
      );
    }

    if (sample.state === 'answering') {
      return successResponse({
        sample_id: sample_id,
        state: 'answering',
        already_started: true,
      });
    }

    if (sample.state !== 'pending') {
      return errorResponse(
        `Round状態が不正です（現在: ${sample.state}）。開始できるのは未開始（pending）のときだけです。`,
        'INVALID_STATE',
        400
      );
    }

    const [session] = await sql<{ id: string; mode: string }[]>`
      SELECT id, mode FROM sessions WHERE id = ${sample.session_id}
    `;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.mode === 'sequential') {
      const [previousSample] = await sql<{ id: string; state: string }[]>`
        SELECT id, state FROM samples
        WHERE session_id = ${session.id}
          AND sort_order < ${sample.sort_order ?? 0}
        ORDER BY sort_order DESC
        LIMIT 1
      `;

      if (previousSample) {
        if (
          previousSample.state === 'pending' ||
          previousSample.state === 'answering' ||
          previousSample.state === 'grading'
        ) {
          return errorResponse(
            '前のラウンドが完了していません。前のラウンドを終了してから開始してください',
            'PREVIOUS_ROUND_NOT_CLOSED',
            409
          );
        }

        if (previousSample.state === 'revealed') {
          const allParticipants = await sql<{ id: string }[]>`
            SELECT id FROM participants
            WHERE session_id = ${session.id}
              AND is_attending = true
          `;

          const allClicks = await sql<{ participant_id: string }[]>`
            SELECT participant_id FROM round_next_clicks
            WHERE sample_id = ${previousSample.id}
          `;

          const clickedParticipantIds = new Set(allClicks.map((c) => c.participant_id));
          const allClicked =
            allParticipants.length > 0 &&
            allParticipants.every((p) => clickedParticipantIds.has(p.id));

          if (!allClicked) {
            return errorResponse(
              '前のラウンドの結果確認が完了していません。全員が「次へ」を押すまで開始できません',
              'PREVIOUS_ROUND_NOT_READY',
              409
            );
          }
        }
      }
    }

    await sql`
      UPDATE samples SET state = 'answering' WHERE id = ${sample_id}
    `;

    return successResponse({
      sample_id: sample_id,
      state: 'answering',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
