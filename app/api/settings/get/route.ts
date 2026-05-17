// GET /api/settings/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyOwnerToken } from '@/lib/api-utils';
import {
  DEFAULT_CASK_CHOICE_OPTIONS,
  DEFAULT_REGION_CHOICE_OPTIONS,
  mergeLegacyOptionColumnsIntoScoring,
} from '@/lib/scoring-schema';
import { resolvedTier1NightingaleColors } from '@/lib/flavor-chart-colors';
import { DEFAULT_FLAVOR_CHART, ensureTier1NightingaleVisibleMap } from '@/lib/default-flavor-chart';

// デフォルト設定
const DEFAULT_CASK_OPTIONS = [...DEFAULT_CASK_CHOICE_OPTIONS];
const DEFAULT_REGION_OPTIONS = [...DEFAULT_REGION_CHOICE_OPTIONS];

function flavorChartResponse(fc: typeof DEFAULT_FLAVOR_CHART) {
  return {
    ...fc,
    tier1_nightingale_colors: resolvedTier1NightingaleColors(fc),
    tier1_nightingale_visible: ensureTier1NightingaleVisibleMap(fc),
  };
}
const DEFAULT_SCORING = {
  cask: 5,
  region: 2,
  age: 3,
  abv: 3,
  distillery: 5,
  age_penalty_per_year: 1,
  abv_penalty_per_percent: 2,
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');
    const settingId = searchParams.get('id'); // 設定IDで取得（オプショナル）

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証
    const ownerSession = await verifyOwnerToken(ownerToken);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    // 設定取得
    let query = supabase
      .from('app_settings')
      .select('id, name, cask_options, region_options, flavor_chart, scoring')
      .eq('owner_token', ownerToken);

    // 設定IDが指定されている場合はその設定を取得、指定されていない場合は最初の設定を取得
    if (settingId) {
      query = query.eq('id', settingId);
    }

    const { data: settings, error: settingsError } = await query.maybeSingle();

    // テーブルが存在しない場合（PGRST205）またはその他のエラーの場合、デフォルト値を返す
    if (settingsError) {
      console.error('Settings fetch error (returning defaults):', settingsError);
      // テーブルが存在しない場合でもデフォルト値を返す（エラーにしない）
      return successResponse({
        id: null,
        name: 'デフォルト設定',
        cask_options: DEFAULT_CASK_OPTIONS,
        region_options: DEFAULT_REGION_OPTIONS,
        flavor_chart: flavorChartResponse(DEFAULT_FLAVOR_CHART),
        scoring: mergeLegacyOptionColumnsIntoScoring(DEFAULT_SCORING, DEFAULT_CASK_OPTIONS, DEFAULT_REGION_OPTIONS),
      });
    }

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      return successResponse({
        id: null,
        name: 'デフォルト設定',
        cask_options: DEFAULT_CASK_OPTIONS,
        region_options: DEFAULT_REGION_OPTIONS,
        flavor_chart: flavorChartResponse(DEFAULT_FLAVOR_CHART),
        scoring: mergeLegacyOptionColumnsIntoScoring(DEFAULT_SCORING, DEFAULT_CASK_OPTIONS, DEFAULT_REGION_OPTIONS),
      });
    }

    const merged = mergeLegacyOptionColumnsIntoScoring(
      settings.scoring || DEFAULT_SCORING,
      settings.cask_options,
      settings.region_options,
    );

    return successResponse({
      id: settings.id,
      name: settings.name,
      cask_options: merged.items.cask.options?.length ? merged.items.cask.options : DEFAULT_CASK_OPTIONS,
      region_options: merged.items.region.options?.length ? merged.items.region.options : DEFAULT_REGION_OPTIONS,
      flavor_chart: flavorChartResponse(
        (settings.flavor_chart as typeof DEFAULT_FLAVOR_CHART) || DEFAULT_FLAVOR_CHART,
      ),
      scoring: merged,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
