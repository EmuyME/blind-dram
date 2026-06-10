// POST /api/round/finish
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { writeErrorLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, owner_token, sample_id } = body;

    if (!sample_id) {
      return errorResponse('sample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const [sample] = await sql<
      {
        id: string;
        session_id: string;
        state: string;
        presenter_participant_id: string;
        sort_order: number;
      }[]
    >`
      SELECT id, session_id, state, presenter_participant_id, sort_order
      FROM samples
      WHERE id = ${sample_id}
    `;

    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    let isAuthorized = false;
    if (participant_token) {
      const [presenter] = await sql<{ id: string }[]>`
        SELECT id FROM participants WHERE participant_token = ${participant_token}
      `;

      if (presenter) {
        if (sample.presenter_participant_id === presenter.id) {
          isAuthorized = true;
        } else {
          return errorResponse('Presenter権限がありません', 'NOT_PRESENTER', 403);
        }
      }
    }

    if (!isAuthorized && owner_token) {
      const [sessionOwner] = await sql<{ id: string; owner_token: string }[]>`
        SELECT id, owner_token FROM sessions WHERE id = ${sample.session_id}
      `;
      if (sessionOwner?.owner_token === owner_token) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (sample.state !== 'grading') {
      return errorResponse(
        'Round状態が不正です。grading状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    const grades = await sql<{ participant_id: string }[]>`
      SELECT participant_id FROM distillery_grades WHERE sample_id = ${sample_id}
    `;

    const gradedParticipantIds = new Set(grades.map((g) => g.participant_id));

    const submittedAnswers = await sql<{ participant_id: string }[]>`
      SELECT participant_id FROM answers
      WHERE sample_id = ${sample_id}
        AND status = 'submitted'
    `;

    const submittedIds = submittedAnswers.map((a) => a.participant_id);

    let allGraded =
      submittedIds.length > 0 && submittedIds.every((id) => gradedParticipantIds.has(id));

    if (!allGraded && submittedIds.length === 0) {
      const attending = await sql<{ id: string }[]>`
        SELECT id FROM participants
        WHERE session_id = ${sample.session_id}
          AND is_attending = true
      `;
      const nonPresenterCount = attending.filter(
        (p) => p.id !== sample.presenter_participant_id
      ).length;
      if (nonPresenterCount === 0) {
        allGraded = true;
      }
    }

    if (!allGraded && owner_token) {
      const [sessionOwnerRow] = await sql<{ owner_token: string }[]>`
        SELECT owner_token FROM sessions WHERE id = ${sample.session_id}
      `;
      if (sessionOwnerRow?.owner_token === owner_token && submittedIds.length === 0) {
        allGraded = true;
      }
    }

    console.log('[DEBUG] Round finish - Grading check:', {
      sample_id: sample_id,
      presenter_id: sample.presenter_participant_id,
      submitted_count: submittedIds.length,
      graded_count: grades.length,
      graded_participant_ids: Array.from(gradedParticipantIds),
      all_graded: allGraded,
    });

    if (!allGraded) {
      const missing = submittedIds.filter((id) => !gradedParticipantIds.has(id));
      return errorResponse(
        missing.length > 0
          ? `採点が完了していません。未採点の参加者が${missing.length}名います。プレゼンター画面で全員分の採点を済ませてから「Round終了」を押してください。`
          : '採点が完了していません。全参加者の採点を完了してください',
        'GRADING_INCOMPLETE',
        400
      );
    }

    const [session] = await sql<{ mode: string }[]>`
      SELECT mode FROM sessions WHERE id = ${sample.session_id}
    `;

    const newState = session?.mode === 'simultaneous' ? 'closed' : 'revealed';
    await sql`
      UPDATE samples SET state = ${newState} WHERE id = ${sample_id}
    `;

    const [nextSample] = await sql<{ id: string; state: string }[]>`
      SELECT id, state FROM samples
      WHERE session_id = ${sample.session_id}
        AND sort_order > ${sample.sort_order ?? 0}
      ORDER BY sort_order
      LIMIT 1
    `;

    return successResponse({
      sample_id: sample_id,
      state: newState,
      next_sample_id: nextSample?.id || null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    writeErrorLog('ROUND_FINISH_ERROR', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
