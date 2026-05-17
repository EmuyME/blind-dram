import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateUUID } from '@/lib/api-utils';

/**
 * デバッグ用：模擬参加者を作成する
 * 開発環境でのみ使用可能
 */
export async function POST(request: NextRequest) {
  // 開発環境でのみ許可
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

    // セッションを取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state')
      .eq('join_token', join_token)
      .single();

    if (sessionError || !session) {
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

    const { data: takenRows, error: takenErr } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('display_name', displayNameTrimmed)
      .limit(1);

    if (takenErr) {
      console.error('Display name conflict check error:', takenErr);
      return NextResponse.json(
        { error: '参加者の作成に失敗しました', details: takenErr.message },
        { status: 500 }
      );
    }
    if (takenRows && takenRows.length > 0) {
      return NextResponse.json(
        {
          error: 'この表示名は既に別の参加者が使用しています。別の名前を入力してください',
          code: 'DISPLAY_NAME_TAKEN',
        },
        { status: 409 }
      );
    }

    // 模擬参加者を新規登録
    const participantToken = generateUUID();

    const { data: newParticipant, error: insertError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        display_name: displayNameTrimmed,
        is_attending: true,
        brought_count: brought_count,
        participant_token: participantToken,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Participant creation error:', insertError);
      return NextResponse.json(
        { error: '参加者の作成に失敗しました', details: insertError.message },
        { status: 500 }
      );
    }

    const participantId = newParticipant.id;

    if (brought_count > 0 && bottle_labels.length > 0) {
      const samples = bottle_labels
        .filter((label: string) => label.trim())
        .map((label: string, index: number) => ({
          session_id: session.id,
          label: label.trim(),
          presenter_participant_id: participantId,
          sort_order: index,
          state: 'pending',
        }));

      const { error: samplesError } = await supabase.from('samples').insert(samples);

      if (samplesError) {
        console.error('Sample creation error:', samplesError);
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
