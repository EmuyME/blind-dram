// GET /api/settings/list
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyOwnerToken } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証
    const ownerSession = await verifyOwnerToken(ownerToken);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 設定一覧取得
    const { data: settingsList, error: settingsError } = await supabase
      .from('app_settings')
      .select('id, name, created_at, updated_at')
      .eq('owner_token', ownerToken)
      .order('created_at', { ascending: false });

    if (settingsError) {
      console.error('Settings list fetch error:', settingsError);
      // テーブルが存在しない場合でも空配列を返す
      if (settingsError.code === 'PGRST205') {
        return successResponse({ settings: [] });
      }
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      settings: settingsList || [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
