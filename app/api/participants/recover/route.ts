// POST /api/participants/recover — 別端末から参加者を選択して復帰（パスワード不要）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_token, participant_id } = body;

    if (!join_token || typeof join_token !== 'string') {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!participant_id || typeof participant_id !== 'string') {
      return errorResponse('participant_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id, state FROM sessions WHERE join_token = ${join_token} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.state === 'closed') {
      return errorResponse('このイベントは終了しています', 'SESSION_CLOSED', 409);
    }

    const participantRows = await sql`
      SELECT id, display_name, is_attending
      FROM participants
      WHERE id = ${participant_id} AND session_id = ${session.id}
      LIMIT 1
    `;
    const participant = participantRows[0] ?? null;

    if (!participant || !participant.is_attending) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    const participantToken = generateUUID();

    await sql`
      UPDATE participants
      SET participant_token = ${participantToken}, updated_at = NOW()
      WHERE id = ${participant.id}
    `;

    return successResponse({
      participant_id: participant.id,
      participant_token: participantToken,
      display_name: participant.display_name,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
