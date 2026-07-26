// POST /api/owner/remove-participant — 登録中のみ参加者を退席扱いにする
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerToken = typeof body.owner_token === 'string' ? body.owner_token : '';
    const participantId = typeof body.participant_id === 'string' ? body.participant_id : '';

    if (!ownerToken || !participantId) {
      return errorResponse('owner_tokenとparticipant_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${ownerToken} LIMIT 1
    `;
    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }
    if (session.state !== 'registering') {
      return errorResponse('参加登録中のみ参加者を削除できます', 'INVALID_STATE', 400);
    }

    const [participant] = await sql<{ id: string; display_name: string }[]>`
      SELECT id, display_name FROM participants
      WHERE id = ${participantId} AND session_id = ${session.id} AND is_attending = true
      LIMIT 1
    `;
    if (!participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    await sql`
      UPDATE participants SET is_attending = false WHERE id = ${participant.id}
    `;

    return successResponse({
      participant_id: participant.id,
      display_name: participant.display_name,
      removed: true,
    });
  } catch (error) {
    console.error('remove-participant error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
