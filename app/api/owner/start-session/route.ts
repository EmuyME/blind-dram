// POST /api/owner/start-session
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner_token } = body;

    if (!owner_token) {
      return errorResponse('owner_tokenが必要です', 'MISSING_PARAMETER', 400);
    }

    // Owner認証とSession取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, state, flavor_chart_id')
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

    // デフォルトのフレーバーチャート
    const defaultFlavorChart = {
      version: 'v1',
      tier1: [
        'フルーティ',
        'フローラル・ハーブ系',
        'シリアル',
        'テール',
        '硫黄系',
        'サリファリー',
        'ピート・薫香',
        '樽熟成',
        'その他',
      ],
      tier2_suggestions: {
        'フルーティ': ['レモン', 'ライム', 'オレンジ', 'グレープフルーツ', '青リンゴ', '赤リンゴ', '洋梨', '桃', 'さくらんぼ', 'プラム', 'いちご', 'ラズベリー', 'ブラックベリー', 'カシス', 'マンゴー', 'パイナップル', 'バナナ', 'メロン', 'ドライレーズン', 'ドライイチジク', 'ドライアプリコット'],
        'フローラル・ハーブ系': ['バラ', '白い花', 'スミレ', 'ラベンダー', 'ヒース（ヘザー）', 'ミント', 'タイム', 'ローズマリー', '芝生', '干し草', '甘草'],
        'シリアル': ['麦芽', '穀草', 'パン', 'ビスケット', 'クッキー', 'クレープ'],
        'テール': ['タバコ', '紅茶', 'バター', '皮革', 'うろこ'],
        '硫黄系': ['硫黄', 'マッチ', 'ゴム', 'ゆで卵', 'キャベツ'],
        'サリファリー': ['なめし革', 'ゴム', '油', '肉', 'ブロス'],
        'ピート・薫香': ['煙', '焚き火', 'タール', 'ヨード', '海藻', 'ベーコン', 'スモーク', '焦げ'],
        '樽熟成': ['バニラ', 'キャラメル', 'ハチミツ', 'メープル', 'ココナッツ', 'クルミ', 'アーモンド', 'ヘーゼルナッツ', 'オーク', 'セダー', 'サンダルウッド', '杉', '黒胡椒', '白胡椒', 'ジンジャー', 'ナツメグ', 'クローブ', 'シナモン', 'シェリー', 'マデイラ', 'ワイン'],
        'その他': [],
      },
    };

    // 設定が存在する場合はそれを使用、なければデフォルトを使用
    const flavorChartSnapshot = settings?.flavor_chart || defaultFlavorChart;

    // デフォルトのカスク・地域選択肢
    const defaultCaskOptions = ['シェリー樽', 'バーボン樽', 'ワイン樽', 'その他'];
    const defaultRegionOptions = ['スコットランド', 'アイルランド', 'アメリカ', '日本', 'その他'];

    // 設定からカスク・地域選択肢を取得
    const caskOptionsSnapshot = settings?.cask_options || defaultCaskOptions;
    const regionOptionsSnapshot = settings?.region_options || defaultRegionOptions;

    // デフォルト配点
    const defaultScoring = {
      cask: 3,
      region: 3,
      age: 3,
      abv: 3,
      distillery: 6,
      age_penalty_per_year: 1,
      abv_penalty_per_percent: 2,
    };

    // 設定から配点を取得
    const scoringSnapshot = settings?.scoring || defaultScoring;

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
