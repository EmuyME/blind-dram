// GET /api/owner/get-participants
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, verifyOwnerToken } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証とSession取得
    const session = await verifyOwnerToken(ownerToken);
    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 参加者一覧取得（常に必要なフィールド＋開発用フィールド）
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, display_name, is_attending, brought_count, participant_token')
      .eq('session_id', session.id)
      .eq('is_attending', true)
      .order('created_at');

    if (participantsError) {
      console.error('Participants fetch error:', participantsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 各参加者の持ち込みボトル（Sample）を取得
    // 参加登録時にSampleが作成されているので、registering状態でも取得可能
    const participantsWithSamples = await Promise.all(
      (participants || []).map(async (participant) => {
        const { data: samples } = await supabase
          .from('samples')
          .select('id, label')
          .eq('session_id', session.id)
          .eq('presenter_participant_id', participant.id)
          .order('sort_order');

        return {
          ...participant,
          bottle_labels: (samples || []).map((s) => s.label),
        };
      })
    );

    return successResponse({
      participants: participantsWithSamples,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
