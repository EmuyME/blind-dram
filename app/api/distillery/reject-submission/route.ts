// POST /api/distillery/reject-submission
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, sample_id, target_participant_id } = body;

    if (!participant_token || !sample_id || !target_participant_id) {
      return errorResponse('participant_token、sample_id、target_participant_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const presenterRows = await sql`
      SELECT id, session_id FROM participants
      WHERE participant_token = ${participant_token}
      LIMIT 1
    `;
    const presenter = presenterRows[0];
    if (!presenter) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const sampleRows = await sql`
      SELECT id, session_id, presenter_participant_id, state FROM samples
      WHERE id = ${sample_id}
      LIMIT 1
    `;
    const sample = sampleRows[0];
    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.presenter_participant_id !== presenter.id) {
      return errorResponse('Presenter権限がありません', 'NOT_PRESENTER', 403);
    }

    if (sample.state === 'revealed' || sample.state === 'closed') {
      return errorResponse('このRoundは終了しているため差し戻しできません', 'INVALID_STATE', 409);
    }

    const answerRows = await sql`
      SELECT id, version FROM answers
      WHERE session_id = ${sample.session_id}
        AND sample_id = ${sample_id}
        AND participant_id = ${target_participant_id}
      LIMIT 1
    `;
    const answer = answerRows[0] as { id: string; version: number };
    if (!answer) {
      return errorResponse('回答が見つかりません', 'ANSWER_NOT_FOUND', 404);
    }

    const updatedAt = new Date().toISOString();
    const newVersion = (answer.version || 1) + 1;

    try {
      await sql`
        UPDATE answers SET
          status = 'draft',
          submitted_at = NULL,
          version = ${newVersion},
          updated_at = ${updatedAt}
        WHERE id = ${answer.id}
      `;
    } catch (updateError) {
      console.error('Answer update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    try {
      await sql`
        DELETE FROM distillery_grades
        WHERE session_id = ${sample.session_id}
          AND sample_id = ${sample_id}
          AND participant_id = ${target_participant_id}
      `;
    } catch (gradeDeleteError) {
      console.error('Grade delete error:', gradeDeleteError);
    }

    let nextSampleState = sample.state;
    if (sample.state === 'grading') {
      try {
        const updatedSamples = await sql`
          UPDATE samples SET state = 'answering'
          WHERE id = ${sample_id} AND state = 'grading'
          RETURNING state
        `;
        if (updatedSamples.length > 0) {
          nextSampleState = 'answering';
        }
      } catch (sampleUpdateError) {
        console.error('Sample state update after reject:', sampleUpdateError);
      }
    }

    return successResponse({
      answer_id: answer.id,
      status: 'draft',
      sample_state: nextSampleState,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
