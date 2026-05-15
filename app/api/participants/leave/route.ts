// POST /api/participants/leave
// 現在のparticipant_tokenを持つ参加者を「退席扱い」にして、is_attendingをfalseにする
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_token, participant_token } = body;

    if (!join_token || !participant_token) {
      return errorResponse('join_tokenとparticipant_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Session存在確認
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('join_token', join_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    // 対象参加者を取得
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, is_attending')
      .eq('session_id', session.id)
      .eq('participant_token', participant_token)
      .single();

    if (participantError || !participant) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    // すでにis_attending=falseなら何もしない
    if (participant.is_attending === false) {
      return successResponse({ updated: false });
    }

    const { error: updateError } = await supabase
      .from('participants')
      .update({ is_attending: false })
      .eq('id', participant.id);

    if (updateError) {
      console.error('Participant leave update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({ updated: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}

