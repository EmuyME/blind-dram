// DELETE /api/settings/delete
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyOwnerToken } from '@/lib/api-utils';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');
    const settingId = searchParams.get('id');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    if (!settingId) {
      return errorResponse('idが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証
    const ownerSession = await verifyOwnerToken(ownerToken);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 設定を取得して確認
    const { data: setting, error: fetchError } = await supabase
      .from('app_settings')
      .select('id, owner_token, name')
      .eq('id', settingId)
      .eq('owner_token', ownerToken)
      .single();

    if (fetchError || !setting) {
      return errorResponse('設定が見つかりません', 'SETTING_NOT_FOUND', 404);
    }

    // デフォルト設定は削除できない
    if (setting.name === 'デフォルト設定') {
      return errorResponse('デフォルト設定は削除できません', 'CANNOT_DELETE_DEFAULT', 400);
    }

    // 設定を削除
    const { error: deleteError } = await supabase
      .from('app_settings')
      .delete()
      .eq('id', settingId)
      .eq('owner_token', ownerToken);

    if (deleteError) {
      console.error('Settings delete error:', deleteError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      id: settingId,
      deleted: true,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
