// GET /api/settings/list
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { verifyOwnerToken } from '@/lib/api-utils';

function isTableNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '42P01'
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const ownerSession = await verifyOwnerToken(ownerToken);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    let settingsList;
    try {
      settingsList = await sql`
        SELECT id, name, created_at, updated_at
        FROM app_settings
        WHERE owner_token = ${ownerToken}
        ORDER BY created_at DESC
      `;
    } catch (settingsError) {
      console.error('Settings list fetch error:', settingsError);
      if (isTableNotFound(settingsError)) {
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
