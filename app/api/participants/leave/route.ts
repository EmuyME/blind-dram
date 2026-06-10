// POST /api/participants/leave
// 現在のparticipant_tokenを持つ参加者を「退席扱い」にして、is_attendingをfalseにする
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_token, participant_token } = body;

    if (!join_token || !participant_token) {
      return errorResponse('join_tokenとparticipant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id FROM sessions WHERE join_token = ${join_token} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const participantRows = await sql`
      SELECT id, is_attending
      FROM participants
      WHERE session_id = ${session.id} AND participant_token = ${participant_token}
      LIMIT 1
    `;
    const participant = participantRows[0] ?? null;

    if (!participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    if (participant.is_attending === false) {
      return successResponse({ updated: false });
    }

    await sql`
      UPDATE participants SET is_attending = false WHERE id = ${participant.id}
    `;

    return successResponse({ updated: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
