import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateUUID } from '@/lib/api-utils';

/**
 * デバッグ用：模擬参加者を作成する
 * 開発環境でのみ使用可能
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'この機能は開発環境でのみ使用できます' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { join_token, display_name, brought_count = 0, bottle_labels = [] } = body;

    if (!join_token) {
      return NextResponse.json(
        { error: 'join_tokenが必要です' },
        { status: 400 }
      );
    }

    if (!display_name) {
      return NextResponse.json(
        { error: 'display_nameが必要です' },
        { status: 400 }
      );
    }

    const sessionRows = await sql`
      SELECT id, state FROM sessions WHERE join_token = ${join_token} LIMIT 1
    `;
    const session = sessionRows[0] ?? null;

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    if (session.state !== 'registering') {
      return NextResponse.json(
        { error: 'セッションは参加登録中ではありません' },
        { status: 400 }
      );
    }

    const displayNameTrimmed = display_name.trim();

    const takenRows = await sql`
      SELECT id FROM participants
      WHERE session_id = ${session.id} AND display_name = ${displayNameTrimmed}
      LIMIT 1
    `;

    if (takenRows.length > 0) {
      return NextResponse.json(
        {
          error: 'この表示名は既に別の参加者が使用しています。別の名前を入力してください',
          code: 'DISPLAY_NAME_TAKEN',
        },
        { status: 409 }
      );
    }

    const participantToken = generateUUID();

    const newParticipantRows = await sql`
      INSERT INTO participants (
        session_id, display_name, is_attending, brought_count, participant_token
      )
      VALUES (
        ${session.id}, ${displayNameTrimmed}, true, ${brought_count}, ${participantToken}
      )
      RETURNING id
    `;

    const newParticipant = newParticipantRows[0];
    if (!newParticipant) {
      return NextResponse.json(
        { error: '参加者の作成に失敗しました' },
        { status: 500 }
      );
    }

    const participantId = newParticipant.id;

    if (brought_count > 0 && bottle_labels.length > 0) {
      const samples = bottle_labels
        .filter((label: string) => label.trim())
        .map((label: string, index: number) => ({
          label: label.trim(),
          sort_order: index,
        }));

      for (const sample of samples) {
        try {
          await sql`
            INSERT INTO samples (
              session_id, label, presenter_participant_id, sort_order, state
            )
            VALUES (
              ${session.id}, ${sample.label}, ${participantId}, ${sample.sort_order}, 'pending'
            )
          `;
        } catch (samplesError) {
          console.error('Sample creation error:', samplesError);
        }
      }
    }

    return NextResponse.json({
      data: {
        participant_id: participantId,
        participant_token: participantToken,
        display_name: displayNameTrimmed,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
