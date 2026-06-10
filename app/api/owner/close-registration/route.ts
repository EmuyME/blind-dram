// POST /api/owner/close-registration
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

type SampleRow = {
  id: string;
  label: string;
  presenter_participant_id: string | null;
  sort_order: number;
  state: string;
  created_at: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${owner_token}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state !== 'registering') {
      return errorResponse(
        'Session状態が不正です。registering状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    const participants = await sql<
      { id: string; display_name: string; brought_count: number }[]
    >`
      SELECT id, display_name, brought_count
      FROM participants
      WHERE session_id = ${session.id}
        AND is_attending = true
    `;

    if (participants.length === 0) {
      return errorResponse('参加者が0人です。参加者が1人以上必要です', 'NO_PARTICIPANTS', 400);
    }

    await sql`
      UPDATE sessions SET state = 'ordering' WHERE id = ${session.id}
    `;

    const samples = await sql<SampleRow[]>`
      SELECT id, label, presenter_participant_id, sort_order, state, created_at
      FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order
    `;

    const activeIds = new Set(participants.map((p) => p.id));
    const filteredSamples = samples.filter((s) => {
      if (!s.presenter_participant_id) return true;
      return activeIds.has(s.presenter_participant_id);
    });

    const sorted = [...filteredSamples].sort((a, b) => {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (ao !== bo) return ao - bo;
      const ac = a.created_at ? Date.parse(a.created_at) : 0;
      const bc = b.created_at ? Date.parse(b.created_at) : 0;
      if (ac !== bc) return ac - bc;
      return String(a.id).localeCompare(String(b.id));
    });

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.sort_order !== i) {
        await sql`
          UPDATE samples SET sort_order = ${i}
          WHERE id = ${s.id}
            AND session_id = ${session.id}
        `;
        s.sort_order = i;
      }
    }

    const participantsWithBottles = participants.map((p) => {
      const participantSamples = sorted.filter((s) => s.presenter_participant_id === p.id);
      return {
        id: p.id,
        display_name: p.display_name,
        brought_count: p.brought_count,
        bottle_labels: participantSamples.map((s) => s.label),
      };
    });

    return successResponse({
      session_id: session.id,
      state: 'ordering',
      participants: participantsWithBottles,
      samples: sorted,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
