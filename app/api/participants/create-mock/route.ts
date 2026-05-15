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

    // 模擬参加者を作成
    const participantToken = generateUUID();

    // 既存参加者チェック（同じdisplay_nameで既に登録済みか）
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('display_name', display_name.trim())
      .single();

    let participantId: string;

    if (existingParticipant) {
      // 既存参加者の更新
      const { data: updatedParticipant, error: updateError } = await supabase
        .from('participants')
        .update({
          is_attending: true,
          brought_count: brought_count,
          participant_token: participantToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingParticipant.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Participant update error:', updateError);
        return NextResponse.json(
          { error: '参加者の更新に失敗しました', details: updateError.message },
          { status: 500 }
        );
      }

      participantId = updatedParticipant.id;
    } else {
      // 新規参加者登録
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          display_name: display_name.trim(),
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

      participantId = newParticipant.id;

      // Sample自動生成（持ち込み本数分）
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

        const { error: samplesError } = await supabase
          .from('samples')
          .insert(samples);

        if (samplesError) {
          console.error('Sample creation error:', samplesError);
          // Sample作成失敗はログのみ（参加者作成は成功とする）
        }
      }
    }

    // 既存参加者の場合は更新後のトークンを取得
    let finalToken = participantToken;
    if (existingParticipant) {
      // 更新後のトークンを取得
      const { data: updatedParticipant } = await supabase
        .from('participants')
        .select('participant_token')
        .eq('id', participantId)
        .single();
      if (updatedParticipant) {
        finalToken = updatedParticipant.participant_token;
      }
    }

    return NextResponse.json({
      data: {
        participant_id: participantId,
        participant_token: finalToken,
        display_name: display_name.trim(),
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
