// POST /api/owner/start-session
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { mergeLegacyOptionColumnsIntoScoring, cleanOptionStrings, DEFAULT_CASK_CHOICE_OPTIONS, DEFAULT_REGION_CHOICE_OPTIONS } from '@/lib/scoring-schema';
import { DEFAULT_FLAVOR_CHART } from '@/lib/default-flavor-chart';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証とSession取得（mode は一斉開始時の Sample 状態遷移に必要）
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state, mode, flavor_chart_id')
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

    // Sample数チェック
    const { data: samples, error: samplesError } = await supabase
      .from('samples')
      .select('id')
      .eq('session_id', session.id);

    if (samplesError) {
      console.error('Samples fetch error:', samplesError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    if (!samples || samples.length === 0) {
      return errorResponse('Sampleが0個です。Sampleが1個以上必要です', 'NO_SAMPLES', 400);
    }

    // 設定からフレーバーチャート、カスク選択肢、地域選択肢、配点を取得
    // setting_idが指定されている場合はその設定を取得、指定されていない場合は最初の設定を取得
    const settingId = body.setting_id;
    let settingsQuery = supabase
      .from('app_settings')
      .select('flavor_chart, cask_options, region_options, scoring')
      .eq('owner_token', owner_token);
    
    if (settingId) {
      settingsQuery = settingsQuery.eq('id', settingId);
    }
    
    const { data: settings, error: settingsError } = await settingsQuery.maybeSingle();

    if (settingsError) {
      console.error('Settings fetch error:', settingsError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

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
      settings?.cask_options,
      settings?.region_options,
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

    // Session状態をrunningに変更、スナップショット保存
    // cask_options_snapshot、region_options_snapshot、scoring_snapshotはオプショナル（カラムが存在する場合のみ更新）
    const updateData: Record<string, unknown> = {
      state: 'running',
      flavor_chart_snapshot: flavorChartSnapshot,
    };
    
    // カラムが存在する場合のみ追加
    try {
      // まずカラムの存在確認（エラーが発生しない場合は存在する）
      const testResult = await supabase
        .from('sessions')
        .select('cask_options_snapshot, scoring_snapshot')
        .eq('id', session.id)
        .limit(1);
      
      if (!testResult.error) {
        updateData.cask_options_snapshot = caskOptionsSnapshot;
        updateData.region_options_snapshot = regionOptionsSnapshot;
        updateData.scoring_snapshot = scoringSnapshot;
      }
    } catch {
      // カラムが存在しない場合はスキップ
    }
    
    const { error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', session.id);

    if (updateError) {
      console.error('Session update error:', updateError);
      return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
    }

    // mode は DB 上 NOT NULL のはずだが、取りこぼし・型ゆれで厳密比較だけだと分岐に入らず
    // pending のまま残り得るため、「simultaneous 以外は逐次扱い」とする。
    const effectiveMode: 'sequential' | 'simultaneous' =
      session.mode === 'simultaneous' ? 'simultaneous' : 'sequential';

    // 一斉モード: 仕様どおり、セッション開始と同時に未開始の全 Sample を回答受付にする。
    // （これがないと session は running でも全件 pending のままになり、参加者側が永遠に「開始待ち」になる）
    if (effectiveMode === 'simultaneous') {
      const { error: samplesActivateError } = await supabase
        .from('samples')
        .update({ state: 'answering' })
        .eq('session_id', session.id)
        .eq('state', 'pending');

      if (samplesActivateError) {
        console.error('Simultaneous samples activate error:', samplesActivateError);
        return errorResponse('サンプル状態の更新に失敗しました', 'SERVER_ERROR', 500);
      }
    } else {
      // 逐次モード: sort_order 最小の pending を第1ラウンドとして自動開始する。
      // これまで「Session を開始」後も全件 pending のため、参加者だけ「まだ開始されていません」が続いていた。
      const { data: firstPending, error: firstPendingError } = await supabase
        .from('samples')
        .select('id')
        .eq('session_id', session.id)
        .eq('state', 'pending')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstPendingError) {
        console.error('Sequential first pending sample query error:', firstPendingError);
        return errorResponse('サンプル状態の確認に失敗しました', 'SERVER_ERROR', 500);
      }

      if (firstPending?.id) {
        const { error: firstActivateError } = await supabase
          .from('samples')
          .update({ state: 'answering' })
          .eq('id', firstPending.id)
          .eq('session_id', session.id)
          .eq('state', 'pending');

        if (firstActivateError) {
          console.error('Sequential first sample activate error:', firstActivateError);
          return errorResponse('最初のラウンドの開始に失敗しました', 'SERVER_ERROR', 500);
        }
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
