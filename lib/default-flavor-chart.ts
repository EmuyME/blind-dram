/**
 * デフォルトのフレーバーチャート（13区分ホイール + レガシー／未知タグ用「その他」）
 * 典拠: whisky_flavour_wheel_13categories_concrete.csv（Tier1 ごとの RGB は CSV に準ずる）
 */

export type AppFlavorChartSnapshot = {
  version: string;
  tier1: string[];
  tier2_suggestions: Record<string, string[]>;
  /** true のときのみナイチンゲール（ローズ）チャートの軸に「その他」を載せる。未設定・false はチャートから除外 */
  include_other_in_nightingale_chart?: boolean;
  /**
   * Tier1 ラベル → ナイチンゲール・チャートに載せるか。
   * オブジェクトが空でないときはこちらを優先。キー欠落は「その他」以外は表示、「その他」は非表示。
   * 未設定・空オブジェクトのときはレガシーとして `include_other_in_nightingale_chart` のみ「その他」に効く。
   */
  tier1_nightingale_visible?: Record<string, boolean>;
};

/**
 * 編集 UI / API 応答用: 現在の tier1 一覧に整合した表示マップを返す。
 */
export function ensureTier1NightingaleVisibleMap(fc: {
  tier1: string[];
  tier1_nightingale_visible?: Record<string, boolean> | undefined;
  include_other_in_nightingale_chart?: boolean | undefined;
}): Record<string, boolean> {
  const legacyOther = fc.include_other_in_nightingale_chart === true;
  const fromMap = fc.tier1_nightingale_visible;
  const mapIsExplicit = fromMap != null && Object.keys(fromMap).length > 0;

  const out: Record<string, boolean> = {};
  for (const t of fc.tier1) {
    if (mapIsExplicit) {
      if (fromMap != null && Object.prototype.hasOwnProperty.call(fromMap, t)) {
        out[t] = fromMap[t] !== false;
      } else {
        out[t] = t === 'その他' ? false : true;
      }
    } else {
      out[t] = t === 'その他' ? legacyOther : true;
    }
  }
  return out;
}

/** 13区分 + 「その他」（スナップショットに無い Tier1 タグの受け皿。Tier2 候補なし） */
export const DEFAULT_FLAVOR_CHART: AppFlavorChartSnapshot = {
  version: 'v1',
  include_other_in_nightingale_chart: false,
  tier1: [
    'りんご・洋梨',
    '桃・南国果実',
    'ベリー・干し果実',
    '柑橘',
    '草・ハーブ',
    '花・紅茶',
    '蜂蜜・ワックス',
    'バニラ・トフィー',
    '黒糖・カラメル',
    '麦芽・焼き菓子',
    'ナッツ・チョコ',
    'オーク・スパイス',
    'ピート・スモーク',
    'その他',
  ],
  tier2_suggestions: {
    'りんご・洋梨': [
      '青りんご',
      '赤りんご',
      '煮りんご',
      '焼きりんご',
      '洋梨',
      '梨',
      '白ぶどう',
      'メロン',
    ],
    '桃・南国果実': [
      '白桃',
      '黄桃',
      'あんず',
      'バナナ',
      'ドライバナナ',
      'パイナップル',
      'マンゴー',
      'パッションフルーツ',
      'キウイ',
    ],
    'ベリー・干し果実': [
      'いちご',
      'ラズベリー',
      'ブルーベリー',
      'ブラックベリー',
      'チェリー',
      'プラム',
      'プルーン',
      'レーズン',
      'サルタナ',
      'いちじく',
      'デーツ',
    ],
    柑橘: [
      'レモン',
      'ライム',
      'オレンジ',
      'みかん',
      'グレープフルーツ',
      'レモンピール',
      'オレンジピール',
      'マーマレード',
      '柑橘皮の砂糖漬け',
    ],
    '草・ハーブ': [
      '芝',
      '芝刈り',
      '青草',
      '青い葉',
      '葉っぱ',
      'エンドウ豆のさや',
      '干し草',
      'ミント',
      'セージ',
      'ローズマリー',
      '緑茶',
    ],
    '花・紅茶': [
      '白い花',
      'ジャスミン',
      'バラ',
      'ラベンダー',
      'カーネーション',
      'ヒースの花',
      '紅茶',
      'アールグレイ',
      'ポプリ',
      '香水',
    ],
    '蜂蜜・ワックス': [
      '蜂蜜',
      '花の蜜',
      '蜜蝋',
      'ロウソク',
      'ハチミツ酒',
      'シロップ',
      '砂糖菓子',
      '綿あめ',
      'メレンゲ',
    ],
    'バニラ・トフィー': [
      'バニラ',
      'トフィー',
      'バタースコッチ',
      'カスタード',
      'プリン',
      'クリーム',
      'ホワイトチョコ',
      'ミルクチョコ',
    ],
    '黒糖・カラメル': [
      'カラメル',
      '黒糖',
      '糖蜜',
      'メープルシロップ',
      '焦がし砂糖',
      'ブラウンシュガー',
      'コーラ',
      'ダークチョコ',
    ],
    '麦芽・焼き菓子': [
      '麦芽',
      '麦粥',
      'オートミール',
      'シリアル',
      'ビスケット',
      '全粒粉ビスケット',
      'トースト',
      'パン',
      'クッキー',
      'クラッカー',
      'スイートコーン',
      '茹でトウモロコシ',
    ],
    'ナッツ・チョコ': [
      'アーモンド',
      'ヘーゼルナッツ',
      'くるみ',
      'ピーナッツ',
      '栗',
      'プラリーヌ',
      'アーモンドオイル',
      'チョコレート',
      'ココア',
      'コーヒー',
      'エスプレッソ',
    ],
    'オーク・スパイス': [
      'オーク',
      '新しい木',
      '古い木',
      'ミズナラ',
      '鉛筆',
      '白檀',
      '杉',
      '樟脳',
      'ココナッツ',
      'シナモン',
      'クローブ',
      'ナツメグ',
      'ジンジャー',
      '黒こしょう',
      'オールスパイス',
      'リコリス',
    ],
    'ピート・スモーク': [
      '泥炭',
      '薪の煙',
      '焚き火',
      '燻製',
      '灰',
      '燃えさし',
      'お香',
      'ヨード',
      '消毒薬',
      '正露丸',
      'タール',
      'クレオソート',
      '海藻',
      '海風',
      '塩気',
      'スモークサーモン',
      '牡蠣のスモーク',
      '土',
      '苔',
    ],
    その他: [],
  },
};

/** ナイチンゲール（Polar）用: Tier1 → CSV の区分色。`その他` のみ CSV 外の中立色 */
export const DEFAULT_TIER1_NIGHTINGALE_RGB: Record<string, { r: number; g: number; b: number }> = {
  'りんご・洋梨': { r: 176, g: 210, b: 92 },
  '桃・南国果実': { r: 240, g: 178, b: 76 },
  'ベリー・干し果実': { r: 176, g: 72, b: 96 },
  柑橘: { r: 245, g: 198, b: 55 },
  '草・ハーブ': { r: 104, g: 158, b: 80 },
  '花・紅茶': { r: 198, g: 124, b: 174 },
  '蜂蜜・ワックス': { r: 224, g: 171, b: 54 },
  'バニラ・トフィー': { r: 222, g: 190, b: 118 },
  '黒糖・カラメル': { r: 142, g: 88, b: 48 },
  '麦芽・焼き菓子': { r: 190, g: 132, b: 68 },
  'ナッツ・チョコ': { r: 126, g: 82, b: 54 },
  'オーク・スパイス': { r: 118, g: 88, b: 60 },
  'ピート・スモーク': { r: 95, g: 100, b: 98 },
  その他: { r: 148, g: 156, b: 168 },
};
