// GET /api/session/my-samples
// 参加者が持ち込んだサンプル（presenter_participant_idが一致するもの）を取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');
    const participantToken = searchParams.get('participant_token');

    if (!joinToken || !participantToken) {
      return errorResponse('join_tokenとparticipant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id FROM sessions WHERE join_token = ${joinToken} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const participantRows = await sql`
      SELECT id FROM participants
      WHERE participant_token = ${participantToken} AND session_id = ${session.id}
      LIMIT 1
    `;
    const participant = participantRows[0] ?? null;

    if (!participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    const samples = await sql`
      SELECT id, label, state, sort_order
      FROM samples
      WHERE session_id = ${session.id} AND presenter_participant_id = ${participant.id}
      ORDER BY sort_order
    `;

    return successResponse(samples);
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
