// POST /api/round-result/click-next
// 「次へ」ボタンをクリックしたことを記録
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, sample_id } = body;

    if (!participant_token || !sample_id) {
      return errorResponse('participant_tokenとsample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Participant認証
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, session_id')
      .eq('participant_token', participant_token)
      .single();

    if (participantError || !participant) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // Sample取得と状態チェック
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state, sort_order')
      .eq('id', sample_id)
      .eq('session_id', participant.session_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    // revealed状態でない場合はエラー
    if (sample.state !== 'revealed') {
      return errorResponse('このラウンドはまだ終了していません', 'ROUND_NOT_FINISHED', 400);
    }

    // 既にクリック済みかチェック（存在しない場合も正常系なので maybeSingle を使う）
    const { data: existingClick } = await supabase
      .from('round_next_clicks')
      .select('id')
      .eq('sample_id', sample_id)
      .eq('participant_id', participant.id)
      .maybeSingle();

    if (existingClick) {
      // 既にクリック済みの場合は成功を返す
      return successResponse({ already_clicked: true });
    }

    // 「次へ」クリックを記録
    const { error: insertError } = await supabase
      .from('round_next_clicks')
      .insert({
        sample_id: sample_id,
        participant_id: participant.id,
      });

    if (insertError) {
      console.error('Round next click insert error:', insertError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 全参加者がクリックしたかチェック
    const { data: allParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', participant.session_id)
      .eq('is_attending', true);

    const { data: allClicks } = await supabase
      .from('round_next_clicks')
      .select('participant_id')
      .eq('sample_id', sample_id);

    const clickedParticipantIds = new Set((allClicks || []).map((c) => c.participant_id));
    const allClicked = (allParticipants || []).length > 0 && (allParticipants || []).every((p) => clickedParticipantIds.has(p.id));

    // 全員がクリックした場合でも、次のサンプルはすぐに開始しない
    // ユーザーが明示的に「次のラウンドへ進む」ボタンをクリックするまで待つ
    // これにより、全員が結果を確認する時間を確保できる
    
    let nextSampleId: string | null = null;
    if (allClicked) {
      // 次のサンプルのIDを取得（状態は変更しない）
      const nextSampleResult = await supabase
        .from('samples')
        .select('id, state')
        .eq('session_id', participant.session_id)
        .gt('sort_order', sample.sort_order || 0)
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      nextSampleId = nextSampleResult.data?.id || null;
    }

    return successResponse({
      all_clicked: allClicked,
      next_sample_id: nextSampleId,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
