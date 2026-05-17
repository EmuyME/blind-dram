// POST /api/settings/save
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyOwnerToken } from '@/lib/api-utils';
import { normalizeScoringConfig, itemNeedsChoiceOptionsList } from '@/lib/scoring-schema';
import { sanitizeTier1NightingaleColorsInput } from '@/lib/flavor-chart-colors';

// デフォルト配点
const DEFAULT_SCORING = {
  cask: 5,
  region: 2,
  age: 3,
  abv: 3,
  distillery: 5,
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

    if (!Array.isArray(cask_options)) {
      return errorResponse('cask_optionsは配列である必要があります', 'INVALID_PARAMETER', 400);
    }

    if (!Array.isArray(region_options)) {
      return errorResponse('region_optionsは配列である必要があります', 'INVALID_PARAMETER', 400);
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

    const rawFc = flavor_chart as Record<string, unknown>;
    let flavorChartToSave: Record<string, unknown> = { ...rawFc };
    if (rawFc.tier1_nightingale_colors !== undefined) {
      const sanitized = sanitizeTier1NightingaleColorsInput(rawFc.tier1_nightingale_colors);
      if (sanitized === null) {
        return errorResponse(
          'flavor_chart.tier1_nightingale_colors はオブジェクトで、各値は { r, g, b }（0〜255 相当の数値）である必要があります',
          'INVALID_PARAMETER',
          400,
        );
      }
      flavorChartToSave = { ...flavorChartToSave, tier1_nightingale_colors: sanitized };
    }

    if (rawFc.tier1_nightingale_visible !== undefined && rawFc.tier1_nightingale_visible !== null) {
      const v = rawFc.tier1_nightingale_visible;
      if (typeof v !== 'object' || Array.isArray(v)) {
        return errorResponse(
          'flavor_chart.tier1_nightingale_visible はオブジェクトである必要があります',
          'INVALID_PARAMETER',
          400,
        );
      }
      const tier1 = flavor_chart.tier1 as string[];
      const sanitizedVis: Record<string, boolean> = {};
      for (const t of tier1) {
        const val = (v as Record<string, unknown>)[t];
        sanitizedVis[t] = val !== false;
      }
      flavorChartToSave = { ...flavorChartToSave, tier1_nightingale_visible: sanitizedVis };
    }

    const scoringInput = scoring !== undefined && scoring !== null ? scoring : DEFAULT_SCORING;
    if (typeof scoringInput !== 'object' || scoringInput === null || Array.isArray(scoringInput)) {
      return errorResponse('scoringはオブジェクトである必要があります', 'INVALID_PARAMETER', 400);
    }

    const finalScoring = normalizeScoringConfig(scoringInput);

    const caskTrimmed = cask_options.map((x) => String(x).trim()).filter(Boolean);
    const regionTrimmed = region_options.map((x) => String(x).trim()).filter(Boolean);

    if (itemNeedsChoiceOptionsList(finalScoring.items.cask) && caskTrimmed.length === 0) {
      return errorResponse(
        'カスクが選択式のときは、選択肢を1つ以上（空でない名前）で設定してください',
        'INVALID_PARAMETER',
        400,
      );
    }

    if (itemNeedsChoiceOptionsList(finalScoring.items.region) && regionTrimmed.length === 0) {
      return errorResponse(
        '地域が選択式のときは、選択肢を1つ以上（空でない名前）で設定してください',
        'INVALID_PARAMETER',
        400,
      );
    }

    // 設定を保存（upsert）
    const upsertData: Record<string, unknown> = {
      owner_token: owner_token,
      name: settingName.trim(),
      cask_options: cask_options,
      region_options: region_options,
      flavor_chart: flavorChartToSave,
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
