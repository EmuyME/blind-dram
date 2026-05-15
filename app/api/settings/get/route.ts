// GET /api/settings/get
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';
import { verifyOwnerToken } from '@/lib/api-utils';

// デフォルト設定
const DEFAULT_CASK_OPTIONS = ['シェリー樽', 'バーボン樽', 'ワイン樽', 'その他'];
const DEFAULT_REGION_OPTIONS = ['スコットランド', 'アイルランド', 'アメリカ', '日本', 'その他'];
const DEFAULT_FLAVOR_CHART = {
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
const DEFAULT_SCORING = {
  cask: 3,
  region: 3,
  age: 3,
  abv: 3,
  distillery: 6,
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
        flavor_chart: DEFAULT_FLAVOR_CHART,
        scoring: DEFAULT_SCORING,
      });
    }

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      return successResponse({
        id: null,
        name: 'デフォルト設定',
        cask_options: DEFAULT_CASK_OPTIONS,
        region_options: DEFAULT_REGION_OPTIONS,
        flavor_chart: DEFAULT_FLAVOR_CHART,
        scoring: DEFAULT_SCORING,
      });
    }

    return successResponse({
      id: settings.id,
      name: settings.name,
      cask_options: settings.cask_options || DEFAULT_CASK_OPTIONS,
      region_options: settings.region_options || DEFAULT_REGION_OPTIONS,
      flavor_chart: settings.flavor_chart || DEFAULT_FLAVOR_CHART,
      scoring: settings.scoring || DEFAULT_SCORING,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('サーバーエラーが発生しました', 'SERVER_ERROR', 500);
  }
}
