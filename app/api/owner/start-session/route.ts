// POST /api/owner/start-session
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { sql, jsonb } from '@/lib/db';
import { mergeLegacyOptionColumnsIntoScoring, cleanOptionStrings, DEFAULT_CASK_CHOICE_OPTIONS, DEFAULT_REGION_CHOICE_OPTIONS } from '@/lib/scoring-schema';
import { DEFAULT_FLAVOR_CHART } from '@/lib/default-flavor-chart';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    const [session] = await sql<
      { id: string; state: string; mode: string; flavor_chart_id: string | null }[]
    >`
      SELECT id, state, mode, flavor_chart_id
      FROM sessions
      WHERE owner_token = ${owner_token}
    `;

    if (!session) {
      return errorResponse('認証トークンが不正です', 'UNAUTHORIZED', 401);
    }

    if (session.state !== 'ordering') {
      return errorResponse(
        'Session状態が不正です。ordering状態の時のみ実行できます',
        'INVALID_STATE',
        400
      );
    }

    const samples = await sql<{ id: string }[]>`
      SELECT id FROM samples WHERE session_id = ${session.id}
    `;

    if (samples.length === 0) {
      return errorResponse('Sampleが0個です。Sampleが1個以上必要です', 'NO_SAMPLES', 400);
    }

    const settingId = body.setting_id;
    const settingsRows = settingId
      ? await sql<
          {
            flavor_chart: unknown;
            cask_options: unknown;
            region_options: unknown;
            scoring: unknown;
          }[]
        >`
          SELECT flavor_chart, cask_options, region_options, scoring
          FROM app_settings
          WHERE owner_token = ${owner_token}
            AND id = ${settingId}
          LIMIT 1
        `
      : await sql<
          {
            flavor_chart: unknown;
            cask_options: unknown;
            region_options: unknown;
            scoring: unknown;
          }[]
        >`
          SELECT flavor_chart, cask_options, region_options, scoring
          FROM app_settings
          WHERE owner_token = ${owner_token}
          LIMIT 1
        `;

    const settings = settingsRows[0] ?? null;

    const flavorChartSnapshot = settings?.flavor_chart || DEFAULT_FLAVOR_CHART;

    const defaultCaskOptions = [...DEFAULT_CASK_CHOICE_OPTIONS];
    const defaultRegionOptions = [...DEFAULT_REGION_CHOICE_OPTIONS];

    const defaultScoring = {
      cask: 5,
      region: 2,
      age: 3,
      abv: 3,
      distillery: 5,
      age_penalty_per_year: 1,
      abv_penalty_per_percent: 2,
    };

    const scoringSnapshot = mergeLegacyOptionColumnsIntoScoring(
      settings?.scoring || defaultScoring,
      settings?.cask_options as string[] | undefined | null,
      settings?.region_options as string[] | undefined | null,
    );

    const needCaskChoice =
      scoringSnapshot.items.cask.enabled &&
      scoringSnapshot.items.cask.maxPoints > 0 &&
      scoringSnapshot.items.cask.inputType === 'choice';
    const needRegionChoice =
      scoringSnapshot.items.region.enabled &&
      scoringSnapshot.items.region.maxPoints > 0 &&
      scoringSnapshot.items.region.inputType === 'choice';

    const caskOptsList = cleanOptionStrings(scoringSnapshot.items.cask.options ?? []);
    const regionOptsList = cleanOptionStrings(scoringSnapshot.items.region.options ?? []);

    const caskOptionsSnapshot = needCaskChoice
      ? caskOptsList.length > 0
        ? caskOptsList
        : defaultCaskOptions
      : caskOptsList;

    const regionOptionsSnapshot = needRegionChoice
      ? regionOptsList.length > 0
        ? regionOptsList
        : defaultRegionOptions
      : regionOptsList;

    await sql`
      UPDATE sessions
      SET
        state = 'running',
        flavor_chart_snapshot = ${jsonb(flavorChartSnapshot)}::jsonb,
        cask_options_snapshot = ${jsonb(caskOptionsSnapshot)}::jsonb,
        region_options_snapshot = ${jsonb(regionOptionsSnapshot)}::jsonb,
        scoring_snapshot = ${jsonb(scoringSnapshot)}::jsonb
      WHERE id = ${session.id}
    `;

    const effectiveMode: 'sequential' | 'simultaneous' =
      session.mode === 'simultaneous' ? 'simultaneous' : 'sequential';

    if (effectiveMode === 'simultaneous') {
      await sql`
        UPDATE samples SET state = 'answering'
        WHERE session_id = ${session.id}
          AND state = 'pending'
      `;
    } else {
      const [firstPending] = await sql<{ id: string }[]>`
        SELECT id FROM samples
        WHERE session_id = ${session.id}
          AND state = 'pending'
        ORDER BY sort_order ASC
        LIMIT 1
      `;

      if (firstPending?.id) {
        await sql`
          UPDATE samples SET state = 'answering'
          WHERE id = ${firstPending.id}
            AND session_id = ${session.id}
            AND state = 'pending'
        `;
      }
    }

    return successResponse({
      session_id: session.id,
      state: 'running',
      flavor_chart_snapshot: flavorChartSnapshot,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
