// GET /api/owner/get-samples
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

type SampleRow = {
  id: string;
  label: string;
  state: string;
  presenter_participant_id: string | null;
  sort_order: number;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${ownerToken}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const activeParticipants = await sql<{ id: string }[]>`
      SELECT id FROM participants
      WHERE session_id = ${session.id}
        AND is_attending = true
    `;

    const activeIds = new Set(activeParticipants.map((p) => p.id));

    const samples = await sql<SampleRow[]>`
      SELECT id, label, state, presenter_participant_id, sort_order
      FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order
    `;

    const filteredSamples = samples.filter((s) => {
      if (!s.presenter_participant_id) return true;
      return activeIds.has(s.presenter_participant_id);
    });

    return successResponse({
      samples: filteredSamples,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
