// GET /api/participants/me
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
      SELECT id, display_name, is_attending, brought_count, session_id, created_at, updated_at
      FROM participants
      WHERE participant_token = ${participantToken} AND session_id = ${session.id}
      LIMIT 1
    `;
    const participant = participantRows[0] ?? null;

    if (!participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    return successResponse({
      id: participant.id,
      display_name: participant.display_name,
      is_attending: participant.is_attending,
      brought_count: participant.brought_count,
      session_id: participant.session_id,
      created_at: participant.created_at,
      updated_at: participant.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
