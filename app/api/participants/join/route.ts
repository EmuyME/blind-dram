// POST /api/participants/join
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID } from '@/lib/api-utils';
import { defaultBottleLabel } from '@/lib/default-bottle-label';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      join_token,
      display_name,
      is_attending,
      brought_count,
      bottle_labels,
      owner_token,
      rejoin_participant_token: existingParticipantTokenRaw,
    } = body;

    if (!join_token) {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!display_name || typeof display_name !== 'string' || display_name.trim() === '') {
      return errorResponse('表示名が空です', 'MISSING_DISPLAY_NAME', 400);
    }

    if (typeof is_attending !== 'boolean') {
      return errorResponse('is_attendingが必要です', 'MISSING_PARAMETER', 400);
    }

    if (typeof brought_count !== 'number' || brought_count < 0) {
      return errorResponse('持ち込み本数が不正です', 'INVALID_BOTTLE_COUNT', 400);
    }

    if (!Array.isArray(bottle_labels) || bottle_labels.length !== brought_count) {
      return errorResponse(
        'ボトル数が一致しません。brought_countとbottle_labelsの数が一致している必要があります',
        'INVALID_BOTTLE_COUNT',
        400
      );
    }

    const sessionRows = await sql`
      SELECT id, state, owner_token FROM sessions WHERE join_token = ${join_token} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    const displayNameTrimmed = display_name.trim();

    if (session.state !== 'registering') {
      const isOwner =
        typeof owner_token === 'string' &&
        owner_token.length > 0 &&
        session.owner_token === owner_token;

      if (!isOwner) {
        return errorResponse(
          'Sessionが締切済みです。参加登録はできません',
          'SESSION_CLOSED',
          409
        );
      }

      if (brought_count !== 0 || (Array.isArray(bottle_labels) && bottle_labels.length > 0)) {
        return errorResponse(
          '締切後に持ち込みボトルを追加することはできません（オーナー参加は0本のみ）',
          'OWNER_LATE_JOIN_REQUIRES_ZERO_BOTTLES',
          400
        );
      }
    }

    const existingToken =
      typeof existingParticipantTokenRaw === 'string' ? existingParticipantTokenRaw.trim() : '';

    let existingParticipant: { id: string } | null = null;
    if (existingToken) {
      const byTokenRows = await sql`
        SELECT id FROM participants
        WHERE session_id = ${session.id} AND participant_token = ${existingToken}
        LIMIT 1
      `;
      const byToken = byTokenRows[0] as { id: string } | undefined;
      if (byToken) {
        existingParticipant = byToken;
      } else {
        return errorResponse(
          '参加登録の更新用トークンが無効です。参加登録ページからやり直してください',
          'INVALID_PARTICIPANT_TOKEN',
          401,
        );
      }
    }

    const nameTakenRows = existingParticipant
      ? await sql`
          SELECT id FROM participants
          WHERE session_id = ${session.id}
            AND display_name = ${displayNameTrimmed}
            AND id != ${existingParticipant.id}
          LIMIT 1
        `
      : await sql`
          SELECT id FROM participants
          WHERE session_id = ${session.id} AND display_name = ${displayNameTrimmed}
          LIMIT 1
        `;

    if (nameTakenRows.length > 0) {
      return errorResponse(
        'この表示名は既に別の参加者が使用しています。別の名前を入力してください',
        'DISPLAY_NAME_TAKEN',
        409,
      );
    }

    const participantToken = generateUUID();

    if (existingParticipant) {
      const updatedRows = await sql`
        UPDATE participants
        SET
          display_name = ${displayNameTrimmed},
          is_attending = ${is_attending},
          brought_count = ${brought_count},
          participant_token = ${participantToken},
          updated_at = NOW()
        WHERE id = ${existingParticipant.id}
        RETURNING id
      `;
      const updatedParticipant = updatedRows[0] ?? null;

      if (!updatedParticipant) {
        return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
      }

      if (brought_count > 0) {
        type ExistingSampleRow = {
          id: string;
          state: string | null;
          sort_order: number | null;
          created_at: string;
        };
        const desiredLabels = bottle_labels.map((l: string) => l.trim());

        const existingSamples = (await sql`
          SELECT id, state, sort_order, created_at
          FROM samples
          WHERE session_id = ${session.id} AND presenter_participant_id = ${updatedParticipant.id}
          ORDER BY sort_order, created_at, id
        `) as ExistingSampleRow[];

        const samples = existingSamples;
        const nonPending = samples.find((s) => s.state && s.state !== 'pending');
        if (nonPending) {
          return errorResponse(
            '既に進行中のサンプルがあるため、持ち込みボトルの変更はできません',
            'SAMPLES_NOT_EDITABLE',
            409
          );
        }

        for (let i = 0; i < desiredLabels.length; i++) {
          const label = desiredLabels[i] || defaultBottleLabel(displayNameTrimmed, i);
          const existing = samples[i];
          if (existing) {
            await sql`
              UPDATE samples
              SET label = ${label}, sort_order = ${i}, state = 'pending',
                  presenter_participant_id = ${updatedParticipant.id}
              WHERE id = ${existing.id}
            `;
          } else {
            await sql`
              INSERT INTO samples (
                session_id, label, presenter_participant_id, sort_order, state
              )
              VALUES (
                ${session.id}, ${label}, ${updatedParticipant.id}, ${i}, 'pending'
              )
            `;
          }
        }

        const extra = samples.slice(desiredLabels.length);
        if (extra.length > 0) {
          const extraIds = extra.map((s) => s.id);
          await sql`
            DELETE FROM samples
            WHERE id = ANY(${extraIds}::uuid[])
              AND session_id = ${session.id}
              AND presenter_participant_id = ${updatedParticipant.id}
          `;
        }
      } else {
        type ExistingSampleLiteRow = { id: string; state: string | null };
        const existingSamples = (await sql`
          SELECT id, state
          FROM samples
          WHERE session_id = ${session.id} AND presenter_participant_id = ${updatedParticipant.id}
        `) as ExistingSampleLiteRow[];
        const samples = existingSamples;
        const nonPending = samples.find((s) => s.state && s.state !== 'pending');
        if (nonPending) {
          return errorResponse(
            '既に進行中のサンプルがあるため、持ち込みボトルを0本に変更できません',
            'SAMPLES_NOT_EDITABLE',
            409
          );
        }
        if (samples.length > 0) {
          const ids = samples.map((s) => s.id);
          await sql`
            DELETE FROM samples
            WHERE id = ANY(${ids}::uuid[])
              AND session_id = ${session.id}
              AND presenter_participant_id = ${updatedParticipant.id}
          `;
        }
      }

      return successResponse({
        participant_id: updatedParticipant.id,
        participant_token: participantToken,
        session_id: session.id,
      });
    }

    const newParticipantRows = await sql`
      INSERT INTO participants (
        session_id, display_name, is_attending, brought_count, participant_token
      )
      VALUES (
        ${session.id}, ${displayNameTrimmed}, ${is_attending}, ${brought_count}, ${participantToken}
      )
      RETURNING id
    `;
    const newParticipant = newParticipantRows[0] ?? null;

    if (!newParticipant) {
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (brought_count > 0) {
      for (let index = 0; index < bottle_labels.length; index++) {
        const label =
          bottle_labels[index].trim() || defaultBottleLabel(displayNameTrimmed, index);
        try {
          await sql`
            INSERT INTO samples (
              session_id, label, presenter_participant_id, sort_order, state
            )
            VALUES (
              ${session.id}, ${label}, ${newParticipant.id}, ${index}, 'pending'
            )
          `;
        } catch (samplesError) {
          console.error('Sample creation error:', samplesError);
        }
      }
    }

    return successResponse({
      participant_id: newParticipant.id,
      participant_token: participantToken,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
