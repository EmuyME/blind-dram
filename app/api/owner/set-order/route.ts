// POST /api/owner/set-order
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

function isSampleOrderItem(x: unknown): x is { sample_id: string; sort_order: number } {
  if (x === null || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.sample_id === 'string' && typeof o.sort_order === 'number';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token, sample_orders } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!Array.isArray(sample_orders) || sample_orders.length === 0) {
      return errorResponse('sample_ordersが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!sample_orders.every(isSampleOrderItem)) {
      return errorResponse(
        'sample_ordersの各要素にはsample_id（文字列）とsort_order（数値）が必要です',
        'INVALID_PARAMETER',
        400
      );
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
    if (session.state !== 'ordering') {
      return errorResponse(
        'Session状態が不正です。ordering状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    // Sample存在確認
    const sampleIds = sample_orders.map((so) => so.sample_id);
    const { data: existingSamples, error: samplesError } = await supabase
      .from('samples')
      .select('id')
      .eq('session_id', session.id)
      .in('id', sampleIds);

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!existingSamples || existingSamples.length !== sampleIds.length) {
      return errorResponse('Sample IDが不正です', 'INVALID_SAMPLE_ID', 404);
    }

    // sort_orderの重複チェック
    const sortOrders = sample_orders.map((so) => so.sort_order);
    const uniqueSortOrders = new Set(sortOrders);
    if (sortOrders.length !== uniqueSortOrders.size) {
      return errorResponse('順番が重複しています', 'DUPLICATE_SORT_ORDER', 400);
    }

    // トランザクション的に更新（PostgreSQLでは複数UPDATEを順次実行）
    for (const order of sample_orders) {
      const { error: updateError } = await supabase
        .from('samples')
        .update({ sort_order: order.sort_order })
        .eq('id', order.sample_id)
        .eq('session_id', session.id);

      if (updateError) {
        console.error('Sample update error:', updateError);
        return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
      }
    }

    // 更新後のSample一覧取得
    const { data: updatedSamples, error: fetchError } = await supabase
      .from('samples')
      .select('id, label, presenter_participant_id, sort_order, state')
      .eq('session_id', session.id)
      .order('sort_order');

    if (fetchError) {
      console.error('Samples fetch error:', fetchError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      session_id: session.id,
      samples: updatedSamples || [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
