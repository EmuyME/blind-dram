// GET /api/settings/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql } from '@/lib/db';
import { verifyOwnerToken } from '@/lib/api-utils';
import {
  DEFAULT_CASK_CHOICE_OPTIONS,
  DEFAULT_REGION_CHOICE_OPTIONS,
  mergeLegacyOptionColumnsIntoScoring,
} from '@/lib/scoring-schema';
import { resolvedTier1NightingaleColors } from '@/lib/flavor-chart-colors';
import { DEFAULT_FLAVOR_CHART, ensureTier1NightingaleVisibleMap } from '@/lib/default-flavor-chart';

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

function defaultSettingsResponse() {
  return successResponse({
    id: null,
    name: 'デフォルト設定',
    cask_options: DEFAULT_CASK_OPTIONS,
    region_options: DEFAULT_REGION_OPTIONS,
    flavor_chart: flavorChartResponse(DEFAULT_FLAVOR_CHART),
    scoring: mergeLegacyOptionColumnsIntoScoring(DEFAULT_SCORING, DEFAULT_CASK_OPTIONS, DEFAULT_REGION_OPTIONS),
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerToken = searchParams.get('owner_token');
    const settingId = searchParams.get('id');

    if (!ownerToken) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const ownerSession = await verifyOwnerToken(ownerToken);
    if (!ownerSession) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    let settingsRows;
    try {
      settingsRows = settingId
        ? await sql`
            SELECT id, name, cask_options, region_options, flavor_chart, scoring
            FROM app_settings
            WHERE owner_token = ${ownerToken} AND id = ${settingId}
            LIMIT 1
          `
        : await sql`
            SELECT id, name, cask_options, region_options, flavor_chart, scoring
            FROM app_settings
            WHERE owner_token = ${ownerToken}
            LIMIT 1
          `;
    } catch (settingsError) {
      console.error('Settings fetch error (returning defaults):', settingsError);
      return defaultSettingsResponse();
    }

    const settings = settingsRows[0] as {
      id: string;
      name: string;
      cask_options: string[] | null;
      region_options: string[] | null;
      flavor_chart: unknown;
      scoring: unknown;
    } | undefined;
    if (!settings) {
      return defaultSettingsResponse();
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
