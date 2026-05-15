// POST /api/owner/close-registration
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

type SampleRow = {
  id: string;
  label: string;
  presenter_participant_id: string | null;
  sort_order: number;
  state: string;
  created_at: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証とSession取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state')
      .eq('owner_token', owner_token)
      .single();

    if (sessionError || !session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 状態チェック
    if (session.state !== 'registering') {
      return errorResponse(
        'Session状態が不正です。registering状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    // 参加者数チェック（現在参加中の参加者のみ）
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, display_name, brought_count')
      .eq('session_id', session.id)
      .eq('is_attending', true);

    if (participantsError) {
      console.error('Participants fetch error:', participantsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!participants || participants.length === 0) {
      return errorResponse('参加者が0人です。参加者が1人以上必要です', 'NO_PARTICIPANTS', 400);
    }

    // Session状態をorderingに変更
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ state: 'ordering' })
      .eq('id', session.id);

    if (updateError) {
      console.error('Session update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // Sample一覧取得（既存のSample + 参加者の持ち込み本数から自動生成されたもの）
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id, label, presenter_participant_id, sort_order, state, created_at')
      .eq('session_id', session.id)
      .order('sort_order');

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 現在参加中の参加者だけを残し、それ以外の持ち込みSampleは除外
    const activeIds = new Set((participants || []).map((p) => p.id as string));
    const filteredSamples = (samples || []).filter((s: SampleRow) => {
      if (!s.presenter_participant_id) return true;
      return activeIds.has(s.presenter_participant_id);
    });

    // ordering開始時点のデフォルト順を確定（sort_orderが重複しがちなため）
    // - 既存sort_order → created_at → id で安定ソート
    // - 0..N-1 を振り直して一意性を保証
    const sorted = [...filteredSamples].sort((a: SampleRow, b: SampleRow) => {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (ao !== bo) return ao - bo;
      const ac = a.created_at ? Date.parse(a.created_at) : 0;
      const bc = b.created_at ? Date.parse(b.created_at) : 0;
      if (ac !== bc) return ac - bc;
      return String(a.id).localeCompare(String(b.id));
    });

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.sort_order !== i) {
        const { error: orderUpdateError } = await supabase
          .from('samples')
          .update({ sort_order: i })
          .eq('id', s.id)
          .eq('session_id', session.id);
        if (orderUpdateError) {
          console.error('Sample default ordering error:', orderUpdateError);
          return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
        }
        s.sort_order = i;
      }
    }

    // 参加者のbottle_labels取得（samplesから逆引き）
    const participantsWithBottles = participants.map((p) => {
      const participantSamples = sorted.filter((s: SampleRow) => s.presenter_participant_id === p.id) || [];
      return {
        id: p.id,
        display_name: p.display_name,
        brought_count: p.brought_count,
        bottle_labels: participantSamples.map((s) => s.label),
      };
    });

    return successResponse({
      session_id: session.id,
      state: 'ordering',
      participants: participantsWithBottles,
      samples: sorted,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
