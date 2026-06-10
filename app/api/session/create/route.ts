// POST /api/session/create
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID, generateJoinCode } from '@/lib/api-utils';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, mode, flavor_chart_id, previous_session_id, previous_session_join_token } = body;

    // バリデーション
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return errorResponse('イベント名が空です', 'MISSING_TITLE', 400);
    }

    if (mode !== 'sequential' && mode !== 'simultaneous') {
      return errorResponse(
        '回答モードが不正です。sequential または simultaneous を指定してください',
        'INVALID_MODE',
        400
      );
    }

    // 逐次モードで前のセッションが指定された場合、その状態をチェック
    let previousSessionId: string | null = null;
    if (mode === 'sequential' && (previous_session_id || previous_session_join_token)) {
      const previousRows = (previous_session_id
        ? await sql`
            SELECT id, state FROM sessions WHERE id = ${previous_session_id} LIMIT 1
          `
        : await sql`
            SELECT id, state FROM sessions WHERE join_token = ${previous_session_join_token} LIMIT 1
          `) as { id: string; state: string }[];

      const previousSession = previousRows[0] ?? null;

      if (!previousSession) {
        return errorResponse('前のセッションが見つかりません', 'PREVIOUS_SESSION_NOT_FOUND', 404);
      }

      previousSessionId = previousSession.id;

      if (previousSession.state !== 'published' && previousSession.state !== 'closed') {
        return errorResponse(
          `前のセッションが完了していません。現在の状態: ${previousSession.state}。結果が公開されるまで新しいセッションを開始できません`,
          'PREVIOUS_SESSION_NOT_COMPLETED',
          409
        );
      }
    }

    const ownerToken = generateUUID();
    const joinToken = generateUUID();

    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const existingRows = await sql`
        SELECT id FROM sessions WHERE join_code = ${joinCode} LIMIT 1
      `;
      if (!existingRows[0]) {
        break;
      }
      joinCode = generateJoinCode();
      attempts++;
    }

    const sessionRows = (await sql`
      INSERT INTO sessions (
        title, owner_token, join_token, join_code, mode, state,
        flavor_chart_id, flavor_chart_snapshot, previous_session_id, public_results
      )
      VALUES (
        ${title.trim()}, ${ownerToken}, ${joinToken}, ${joinCode}, ${mode}, 'registering',
        ${flavor_chart_id || null}, null, ${previousSessionId}, true
      )
      RETURNING id
    `) as { id: string }[];

    const session = sessionRows[0];
    if (!session) {
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      session_id: session.id,
      owner_token: ownerToken,
      join_token: joinToken,
      join_code: joinCode,
      owner_url: `/o/${ownerToken}`,
      join_url: `/s/${joinToken}`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
