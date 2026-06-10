// POST /api/owner/set-order
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

function isSampleOrderItem(x: unknown): x is { sample_id: string; sort_order: number } {
  if (x === null || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.sample_id === 'string' && typeof o.sort_order === 'number';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token, sample_orders } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!Array.isArray(sample_orders) || sample_orders.length === 0) {
      return errorResponse('sample_ordersが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!sample_orders.every(isSampleOrderItem)) {
      return errorResponse(
        'sample_ordersの各要素にはsample_id（文字列）とsort_order（数値）が必要です',
        'INVALID_PARAMETER',
        400
      );
    }

    const [session] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM sessions WHERE owner_token = ${owner_token}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state !== 'ordering') {
      return errorResponse(
        'Session状態が不正です。ordering状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    const sampleIds = sample_orders.map((so) => so.sample_id);
    const existingSamples = await sql<{ id: string }[]>`
      SELECT id FROM samples
      WHERE session_id = ${session.id}
        AND id = ANY(${sampleIds})
    `;

    if (existingSamples.length !== sampleIds.length) {
      return errorResponse('Sample IDが不正です', 'INVALID_SAMPLE_ID', 404);
    }

    const sortOrders = sample_orders.map((so) => so.sort_order);
    const uniqueSortOrders = new Set(sortOrders);
    if (sortOrders.length !== uniqueSortOrders.size) {
      return errorResponse('順番が重複しています', 'DUPLICATE_SORT_ORDER', 400);
    }

    for (const order of sample_orders) {
      await sql`
        UPDATE samples
        SET sort_order = ${order.sort_order}
        WHERE id = ${order.sample_id}
          AND session_id = ${session.id}
      `;
    }

    const updatedSamples = await sql<
      {
        id: string;
        label: string;
        presenter_participant_id: string | null;
        sort_order: number;
        state: string;
      }[]
    >`
      SELECT id, label, presenter_participant_id, sort_order, state
      FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order
    `;

    return successResponse({
      session_id: session.id,
      samples: updatedSamples,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
