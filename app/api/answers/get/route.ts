// GET /api/answers/get
// 既存の回答を取得する
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sampleId = searchParams.get('sample_id');
    const participantToken = searchParams.get('participant_token');

    if (!sampleId || !participantToken) {
      return errorResponse('sample_idとparticipant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const participants = await sql`
      SELECT id, session_id FROM participants
      WHERE participant_token = ${participantToken}
      LIMIT 1
    `;
    const participant = participants[0];
    if (!participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const samples = await sql`
      SELECT id, session_id, state FROM samples
      WHERE id = ${sampleId}
      LIMIT 1
    `;
    const sample = samples[0];
    if (!sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    if (sample.session_id !== participant.session_id) {
      return errorResponse('Sessionが一致しません', 'UNAUTHORIZED', 401);
    }

    const answers = await sql`
      SELECT * FROM answers
      WHERE session_id = ${sample.session_id}
        AND sample_id = ${sampleId}
        AND participant_id = ${participant.id}
      LIMIT 1
    `;
    const answer = answers[0];

    if (!answer) {
      return successResponse({ answer: null });
    }

    return successResponse({
      answer: {
        id: answer.id,
        status: answer.status,
        guessed_cask: answer.guessed_cask,
        guessed_region: answer.guessed_region,
        guessed_age: answer.guessed_age,
        guessed_abv: answer.guessed_abv,
        guessed_distillery: answer.guessed_distillery,
        guessed_other1: answer.guessed_other1 ?? null,
        guessed_other2: answer.guessed_other2 ?? null,
        nose: answer.nose,
        palate: answer.palate,
        finish: answer.finish,
        score_0_100: answer.score_0_100,
        bottle_image_url: answer.bottle_image_url,
        version: answer.version,
        submitted_at: answer.submitted_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
