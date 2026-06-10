// GET /api/session/current-sample
// 現在のSessionで進行中のSample（answering状態）を取得
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

type SampleRow = {
  id: string;
  label: string;
  state: string;
  sort_order: number;
  presenter_participant_id: string | null;
};

function toCurrentSample(sample: SampleRow, stateOverride?: string) {
  return {
    id: sample.id,
    label: sample.label,
    state: stateOverride ?? sample.state,
    presenter_participant_id: sample.presenter_participant_id ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const joinToken = searchParams.get('join_token');

    if (!joinToken) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const sessionRows = await sql`
      SELECT id, state, mode FROM sessions WHERE join_token = ${joinToken} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.state !== 'running') {
      return successResponse({ current_sample: null });
    }

    const isSequential = session.mode === 'sequential';

    if (isSequential) {
      const revealedRows = await sql`
        SELECT id, label, state, sort_order, presenter_participant_id
        FROM samples
        WHERE session_id = ${session.id} AND state = 'revealed'
        ORDER BY sort_order DESC
        LIMIT 1
      `;
      const revealedSample = (revealedRows[0] as SampleRow | undefined) ?? null;

      if (revealedSample) {
        return successResponse({
          current_sample: toCurrentSample(revealedSample),
          mode: session.mode,
        });
      }

      const closedRows = await sql`
        SELECT id, label, state, sort_order, presenter_participant_id
        FROM samples
        WHERE session_id = ${session.id} AND state = 'closed'
        ORDER BY sort_order DESC
        LIMIT 1
      `;
      const closedSample = (closedRows[0] as SampleRow | undefined) ?? null;

      if (closedSample) {
        return successResponse({
          current_sample: toCurrentSample(closedSample, 'revealed'),
          mode: session.mode,
        });
      }
    }

    const answeringRows = await sql`
      SELECT id, label, state, sort_order, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id} AND state = 'answering'
      ORDER BY sort_order
      LIMIT 1
    `;
    const answeringSample = (answeringRows[0] as SampleRow | undefined) ?? null;

    if (answeringSample) {
      return successResponse({
        current_sample: toCurrentSample(answeringSample),
        mode: session.mode,
      });
    }

    const gradingRows = await sql`
      SELECT id, label, state, sort_order, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id} AND state = 'grading'
      ORDER BY sort_order
      LIMIT 1
    `;
    const gradingSample = (gradingRows[0] as SampleRow | undefined) ?? null;

    if (gradingSample) {
      return successResponse({
        current_sample: toCurrentSample(gradingSample),
        mode: session.mode,
      });
    }

    const pendingRows = await sql`
      SELECT id, label, state, sort_order, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id} AND state = 'pending'
      ORDER BY sort_order
      LIMIT 1
    `;
    const pendingSample = (pendingRows[0] as SampleRow | undefined) ?? null;

    if (pendingSample) {
      return successResponse({
        current_sample: toCurrentSample(pendingSample),
        mode: session.mode,
      });
    }

    const allSamplesFallback = (await sql`
      SELECT id, label, state, sort_order, presenter_participant_id
      FROM samples
      WHERE session_id = ${session.id}
      ORDER BY sort_order ASC
    `) as SampleRow[];

    if (allSamplesFallback.length > 0) {
      const nonTerminal = allSamplesFallback.find(
        (s) => s.state !== 'revealed' && s.state !== 'closed',
      );
      if (nonTerminal) {
        const st = nonTerminal.state;
        const normalizedState =
          st === 'pending' || st === 'answering' || st === 'grading' ? st : 'pending';
        return successResponse({
          current_sample: toCurrentSample(nonTerminal, normalizedState),
          mode: session.mode,
        });
      }
    }

    return successResponse({ current_sample: null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
