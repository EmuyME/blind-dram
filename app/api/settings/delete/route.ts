// DELETE /api/settings/delete
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
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

    const ownerSession = await verifyOwnerToken(ownerToken);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    const settingRows = await sql`
      SELECT id, owner_token, name FROM app_settings
      WHERE id = ${settingId} AND owner_token = ${ownerToken}
      LIMIT 1
    `;
    const setting = settingRows[0];
    if (!setting) {
      return errorResponse('設定が見つかりません', 'SETTING_NOT_FOUND', 404);
    }

    if (setting.name === 'デフォルト設定') {
      return errorResponse('デフォルト設定は削除できません', 'CANNOT_DELETE_DEFAULT', 400);
    }

    try {
      await sql`
        DELETE FROM app_settings
        WHERE id = ${settingId} AND owner_token = ${ownerToken}
      `;
    } catch (deleteError) {
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
