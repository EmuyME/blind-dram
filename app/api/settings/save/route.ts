// POST /api/settings/save
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyOwnerToken } from '@/lib/api-utils';

// デフォルト配点
const DEFAULT_SCORING = {
  cask: 3,
  region: 3,
  age: 3,
  abv: 3,
  distillery: 6,
  age_penalty_per_year: 1,
  abv_penalty_per_percent: 2,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token, id, name, cask_options, region_options, flavor_chart, scoring } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証
    const ownerSession = await verifyOwnerToken(owner_token);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // バリデーション
    const settingName = name || 'デフォルト設定';
    if (typeof settingName !== 'string' || settingName.trim().length === 0) {
      return errorResponse('nameは空でない文字列である必要があります', 'INVALID_PARAMETER', 400);
    }

    if (!Array.isArray(cask_options) || cask_options.length === 0) {
      return errorResponse('cask_optionsは空でない配列である必要があります', 'INVALID_PARAMETER', 400);
    }

    if (!Array.isArray(region_options) || region_options.length === 0) {
      return errorResponse('region_optionsは空でない配列である必要があります', 'INVALID_PARAMETER', 400);
    }

    if (!flavor_chart || typeof flavor_chart !== 'object') {
      return errorResponse('flavor_chartはオブジェクトである必要があります', 'INVALID_PARAMETER', 400);
    }

    if (!Array.isArray(flavor_chart.tier1) || flavor_chart.tier1.length === 0) {
      return errorResponse('flavor_chart.tier1は空でない配列である必要があります', 'INVALID_PARAMETER', 400);
    }

    if (!flavor_chart.tier2_suggestions || typeof flavor_chart.tier2_suggestions !== 'object') {
      return errorResponse('flavor_chart.tier2_suggestionsはオブジェクトである必要があります', 'INVALID_PARAMETER', 400);
    }

    // 配点のバリデーション
    const finalScoring = scoring || DEFAULT_SCORING;
    if (typeof finalScoring !== 'object') {
      return errorResponse('scoringはオブジェクトである必要があります', 'INVALID_PARAMETER', 400);
    }

    const requiredScoringFields = ['cask', 'region', 'age', 'abv', 'distillery'];
    for (const field of requiredScoringFields) {
      if (typeof finalScoring[field] !== 'number' || finalScoring[field] < 0) {
        return errorResponse(`scoring.${field}は0以上の数値である必要があります`, 'INVALID_PARAMETER', 400);
      }
    }

    // 設定を保存（upsert）
    const upsertData: Record<string, unknown> = {
      owner_token: owner_token,
      name: settingName.trim(),
      cask_options: cask_options,
      region_options: region_options,
      flavor_chart: flavor_chart,
      scoring: finalScoring,
    };

    // idが指定されている場合は更新、指定されていない場合は新規作成
    if (id) {
      upsertData.id = id;
    }

    const { data: savedSettings, error: upsertError } = await supabase
      .from('app_settings')
      .upsert(upsertData, {
        onConflict: id ? 'id' : 'owner_token,name',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Settings upsert error:', upsertError);
      // テーブルが存在しない場合（PGRST205）の特別なメッセージ
      if (upsertError.code === 'PGRST205') {
        return errorResponse(
          'app_settingsテーブルが存在しません。データベースマイグレーションを実行してください。',
          'TABLE_NOT_FOUND',
          500
        );
      }
      // 名前の重複エラー
      if (upsertError.code === '23505') {
        return errorResponse(
          '同じ名前の設定が既に存在します。別の名前を指定してください。',
          'DUPLICATE_NAME',
          400
        );
      }
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    return successResponse({
      id: savedSettings.id,
      owner_token: savedSettings.owner_token,
      name: savedSettings.name,
      cask_options: savedSettings.cask_options,
      region_options: savedSettings.region_options,
      flavor_chart: savedSettings.flavor_chart,
      scoring: savedSettings.scoring,
      updated_at: savedSettings.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
