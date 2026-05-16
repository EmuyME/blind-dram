// POST /api/round/finish
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { writeErrorLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_token, owner_token, sample_id } = body;

    if (!sample_id) {
      return errorResponse('sample_idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Sample取得
    const { data: sample, error: sampleError } = await supabase
      .from('samples')
      .select('id, session_id, state, presenter_participant_id, sort_order')
      .eq('id', sample_id)
      .single();

    if (sampleError || !sample) {
      return errorResponse('Sampleが見つかりません', 'SAMPLE_NOT_FOUND', 404);
    }

    // Participant認証（Presenter）
    let isAuthorized = false;
    if (participant_token) {
      const { data: presenter, error: presenterError } = await supabase
        .from('participants')
        .select('id')
        .eq('participant_token', participant_token)
        .single();

      if (!presenterError && presenter) {
        if (sample.presenter_participant_id === presenter.id) {
          isAuthorized = true;
        } else {
          return errorResponse('Presenter権限がありません', 'NOT_PRESENTER', 403);
        }
      }
    }

    // オーナー権限（Presenterが不在/無効の場合のフォールバック）
    if (!isAuthorized && owner_token) {
      const { data: sessionOwner, error: sessionOwnerError } = await supabase
        .from('sessions')
        .select('id, owner_token')
        .eq('id', sample.session_id)
        .single();
      if (!sessionOwnerError && sessionOwner?.owner_token === owner_token) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 状態チェック
    if (sample.state !== 'grading') {
      return errorResponse(
        'Round状態が不正です。grading状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    // 採点完了確認（プレゼンター自身は除外）
    const { data: participants } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', sample.session_id)
      .eq('is_attending', true);

    // プレゼンター以外の参加者を取得
    const nonPresenterParticipants = participants?.filter((p) => p.id !== sample.presenter_participant_id) || [];

    const { data: grades } = await supabase
      .from('distillery_grades')
      .select('participant_id')
      .eq('sample_id', sample_id);

    const gradedParticipantIds = new Set(grades?.map((g) => g.participant_id) || []);
    
    // プレゼンター以外の全参加者が採点済みかチェック
    // 採点対象者がゼロのときは採点完了扱いにしない（誤って即 reveal しない）
    let allGraded =
      nonPresenterParticipants.length > 0 &&
      nonPresenterParticipants.every((p) => gradedParticipantIds.has(p.id));

    // オーナーのみ: 採点対象が0人のときでもラウンドを締められる（テスト用・復旧用）
    if (!allGraded && owner_token) {
      const { data: sessionOwnerRow } = await supabase
        .from('sessions')
        .select('owner_token')
        .eq('id', sample.session_id)
        .single();
      if (
        sessionOwnerRow?.owner_token === owner_token &&
        nonPresenterParticipants.length === 0
      ) {
        allGraded = true;
      }
    }

    console.log('[DEBUG] Round finish - Grading check:', {
      sample_id: sample_id,
      presenter_id: sample.presenter_participant_id,
      all_participants_count: participants?.length || 0,
      non_presenter_count: nonPresenterParticipants.length,
      graded_count: grades?.length || 0,
      graded_participant_ids: Array.from(gradedParticipantIds),
      all_graded: allGraded,
    });

    if (!allGraded) {
      const missing = nonPresenterParticipants.filter((p) => !gradedParticipantIds.has(p.id));
      return errorResponse(
        missing.length > 0
          ? `採点が完了していません。未採点の参加者が${missing.length}名います。プレゼンター画面で全員分の採点を済ませてから「Round終了」を押してください。`
          : '採点が完了していません。全参加者の採点を完了してください',
        'GRADING_INCOMPLETE',
        400
      );
    }

    // Session mode取得
    const { data: session } = await supabase
      .from('sessions')
      .select('mode')
      .eq('id', sample.session_id)
      .single();

    // Round状態をrevealed（逐次）またはclosed（一斉）に変更
    // modeが不明な場合は逐次扱いとしてrevealedにする
    const newState = session?.mode === 'simultaneous' ? 'closed' : 'revealed';
    const { error: updateError } = await supabase
      .from('samples')
      .update({ state: newState })
      .eq('id', sample_id);

    if (updateError) {
      console.error('Sample update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // 次のSample取得
    const { data: nextSample } = await supabase
      .from('samples')
      .select('id, state')
      .eq('session_id', sample.session_id)
      .gt('sort_order', sample.sort_order || 0)
      .order('sort_order')
      .limit(1)
      .maybeSingle();
    

    // 逐次モードでは次のラウンドを自動開始しない
    // 参加者全員が結果確認後に「次へ」操作で開始する

    // 逐次モードでは、最後のラウンドでも結果ページを表示するため
    // ここではセッションをaggregatingに遷移させない

    return successResponse({
      sample_id: sample_id,
      state: newState,
      next_sample_id: nextSample?.id || null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    writeErrorLog('ROUND_FINISH_ERROR', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
