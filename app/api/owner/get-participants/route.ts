// GET /api/owner/get-participants
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<{ id: string }[]>`
      SELECT id FROM sessions WHERE owner_token = ${ownerToken}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const participants = await sql<
      {
        id: string;
        display_name: string;
        is_attending: boolean;
        brought_count: number;
        participant_token: string;
      }[]
    >`
      SELECT id, display_name, is_attending, brought_count, participant_token
      FROM participants
      WHERE session_id = ${session.id}
        AND is_attending = true
      ORDER BY created_at
    `;

    const allSamples = await sql<{ id: string; label: string; presenter_participant_id: string }[]>`
      SELECT id, label, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order
    `;

    const samplesByPresenter = new Map<string, string[]>();
    for (const sample of allSamples) {
      const labels = samplesByPresenter.get(sample.presenter_participant_id) ?? [];
      labels.push(sample.label);
      samplesByPresenter.set(sample.presenter_participant_id, labels);
    }

    const participantsWithSamples = participants.map((participant) => ({
      ...participant,
      bottle_labels: samplesByPresenter.get(participant.id) ?? [],
    }));

    return successResponse({
      participants: participantsWithSamples,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
