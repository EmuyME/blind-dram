// POST /api/owner/update-participant — 登録中のみ表示名を修正
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerToken = typeof body.owner_token === 'string' ? body.owner_token : '';
    const participantId = typeof body.participant_id === 'string' ? body.participant_id : '';
    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';

    if (!ownerToken || !participantId) {
      return errorResponse('owner_tokenとparticipant_idが必要です', 'MISSING_PARAMETER', 400);
    }
    if (!displayName) {
      return errorResponse('表示名を入力してください', 'INVALID_NAME', 400);
    }
    if (displayName.length > 40) {
      return errorResponse('表示名は40文字以内にしてください', 'INVALID_NAME', 400);
    }

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${ownerToken} LIMIT 1
    `;
    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }
    if (session.state !== 'registering') {
      return errorResponse('参加登録中のみ名前を変更できます', 'INVALID_STATE', 400);
    }

    const [participant] = await sql<{ id: string }[]>`
      SELECT id FROM participants
      WHERE id = ${participantId} AND session_id = ${session.id} AND is_attending = true
      LIMIT 1
    `;
    if (!participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    await sql`
      UPDATE participants
      SET display_name = ${displayName}
      WHERE id = ${participant.id}
    `;

    return successResponse({ participant_id: participant.id, display_name: displayName });
  } catch (error) {
    console.error('update-participant error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
