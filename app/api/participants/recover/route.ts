// POST /api/participants/recover — 別端末から参加者を選択して復帰（パスワード不要）
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, generateUUID } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { join_token, participant_id } = body;

    if (!join_token || typeof join_token !== 'string') {
      return errorResponse('join_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!participant_id || typeof participant_id !== 'string') {
      return errorResponse('participant_idが必要です', 'MISSING_PARAMETER', 400);
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state')
      .eq('join_token', join_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sessionが見つかりません', 'SESSION_NOT_FOUND', 404);
    }

    if (session.state === 'closed') {
      return errorResponse('このイベントは終了しています', 'SESSION_CLOSED', 409);
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, display_name, is_attending')
      .eq('id', participant_id)
      .eq('session_id', session.id)
      .maybeSingle();

    if (participantError) {
      console.error('Participant lookup error:', participantError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!participant || !participant.is_attending) {
      return errorResponse('参加者が見つかりません', 'PARTICIPANT_NOT_FOUND', 404);
    }

    const participantToken = generateUUID();

    const { error: updateError } = await supabase
      .from('participants')
      .update({
        participant_token: participantToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', participant.id);

    if (updateError) {
      console.error('Participant recover error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      participant_id: participant.id,
      participant_token: participantToken,
      display_name: participant.display_name,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
