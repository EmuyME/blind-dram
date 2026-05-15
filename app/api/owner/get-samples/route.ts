// GET /api/owner/get-samples
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, verifyOwnerToken } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

type SampleRow = {
  id: string;
  label: string;
  state: string;
  presenter_participant_id: string | null;
  sort_order: number;
};

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

    // 現在参加中の参加者のみ取得（退席済みの参加者は除外）
    const { data: activeParticipants, error: participantsError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('is_attending', true);

    if (participantsError) {
      console.error('Active participants fetch error:', participantsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    const activeIds = new Set((activeParticipants || []).map((p) => p.id as string));

    // Sample一覧取得
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, label, state, presenter_participant_id, sort_order')
      .eq('session_id', session.id)
      .order('sort_order');

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 退席済み参加者が持ち込んだSampleは除外（presenter_participant_idがnullのものは残す）
    const filteredSamples = (samples || []).filter((s: SampleRow) => {
      if (!s.presenter_participant_id) return true;
      return activeIds.has(s.presenter_participant_id);
    });

    return successResponse({
      samples: filteredSamples,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
