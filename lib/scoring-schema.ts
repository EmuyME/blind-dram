/**
 * 拡張配点スキーマ（app_settings.scoring / sessions.scoring_snapshot に JSON 保存）
 * 旧形式 { cask: 5, region: 2, ... } も normalizeScoringConfig で読み取り可能
 */

export const SCORING_ITEM_KEYS = [
  'cask',
  'region',
  'age',
  'abv',
  'distillery',
  'other1',
  'other2',
] as const;

export type ScoringItemKey = (typeof SCORING_ITEM_KEYS)[number];

export type ItemInputType = 'choice' | 'free';

export type FreeValueKind = 'int' | 'decimal1' | 'string';

export type FreeGradingMode = 'auto' | 'manual';

/** 手採点（自由入力かつ manual、または従来の蒸留所○×） */
export type ItemVerdict = 'correct' | 'wrong' | 'partial';

export type ItemGrade = {
  verdict: ItemVerdict;
  /** verdict === partial のとき 0〜max 推奨 */
  partial_score?: number;
};

export type ItemGradesMap = Partial<Record<ScoringItemKey, ItemGrade>>;

export interface ScoringItemConfig {
  enabled: boolean;
  /** other1/other2 の表示名 */
  label: string;
  maxPoints: number;
  inputType: ItemInputType;
  /** free のとき必須 */
  freeValueType?: FreeValueKind;
  /** inputType === free のとき */
  freeGrading?: FreeGradingMode;
  /**
   * auto・数値のみ: 真値との差を penaltyStep 単位で割り、切り捨てた回数 × penaltyPointsPerStep を満点から減点
   */
  penaltyStep?: number;
  penaltyPointsPerStep?: number;
  /** 選択式のとき、または記録用に保持する選択肢（カスク・地域もここに集約） */
  options?: string[];
}

export interface FullScoringConfig {
  version: 1;
  items: Record<ScoringItemKey, ScoringItemConfig>;
}

/** DB/API の cask_options・region_options 用デフォルト（createDefaultScoringItems と揃える） */
export const DEFAULT_CASK_CHOICE_OPTIONS = [
  'シェリー樽',
  'バーボン樽',
  'ワイン樽',
  'その他',
] as const;
export const DEFAULT_REGION_CHOICE_OPTIONS = [
  'スコットランド（スペイサイド）',
  'スコットランド（アイラ）',
  'スコットランド（ハイランド）',
  'スコットランド（ローランド）',
  'スコットランド（アイランズ）',
  'スコットランド（キャンベルタウン）',
  'アイルランド',
  'アメリカ',
  '日本',
  'その他',
] as const;

export function createDefaultScoringItems(): Record<ScoringItemKey, ScoringItemConfig> {
  return {
    cask: {
      enabled: true,
      freeGrading: 'auto',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: 'カスク',
      maxPoints: 5,
      inputType: 'choice',
      options: [...DEFAULT_CASK_CHOICE_OPTIONS],
      freeValueType: 'string',
    },
    region: {
      enabled: true,
      freeGrading: 'auto',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: '地域',
      maxPoints: 2,
      inputType: 'choice',
      options: [...DEFAULT_REGION_CHOICE_OPTIONS],
    },
    age: {
      enabled: true,
      freeGrading: 'auto',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: '年数',
      maxPoints: 3,
      inputType: 'free',
      freeValueType: 'int',
    },
    abv: {
      enabled: true,
      freeGrading: 'auto',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: '度数',
      maxPoints: 3,
      inputType: 'free',
      freeValueType: 'decimal1',
      options: ['-39.9', '40.0-44.9', '45.0-49.9', '50.0-54.9', '55.0-59.9', '60.0-64.9', '65.0-'],
    },
    distillery: {
      enabled: true,
      freeGrading: 'manual',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: '蒸留所',
      maxPoints: 5,
      inputType: 'free',
      freeValueType: 'string',
    },
    other1: {
      enabled: false,
      freeGrading: 'manual',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: 'その他1',
      maxPoints: 0,
      inputType: 'free',
      freeValueType: 'string',
    },
    other2: {
      enabled: false,
      freeGrading: 'manual',
      penaltyStep: 1,
      penaltyPointsPerStep: 1,
      label: 'その他2',
      maxPoints: 0,
      inputType: 'free',
      freeValueType: 'string',
    },
  };
}

/** 旧 JSON / 拡張 JSON を統一形に */
export function normalizeScoringConfig(raw: unknown): FullScoringConfig {
  const items = createDefaultScoringItems();
  if (!raw || typeof raw !== 'object') {
    return { version: 1, items };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.cask === 'number') items.cask.maxPoints = r.cask as number;
  if (typeof r.region === 'number') items.region.maxPoints = r.region as number;
  if (typeof r.age === 'number') items.age.maxPoints = r.age as number;
  if (typeof r.abv === 'number') items.abv.maxPoints = r.abv as number;
  if (typeof r.distillery === 'number') items.distillery.maxPoints = r.distillery as number;

  const apy = r.age_penalty_per_year;
  if (typeof apy === 'number' && apy > 0) {
    items.age.penaltyStep = apy;
    items.age.penaltyPointsPerStep = 1;
  }
  const app = r.abv_penalty_per_percent;
  if (typeof app === 'number' && app > 0) {
    items.abv.penaltyStep = app;
    items.abv.penaltyPointsPerStep = 1;
  }

  const ri = r.items;
  if (ri && typeof ri === 'object' && !Array.isArray(ri)) {
    for (const k of SCORING_ITEM_KEYS) {
      const patch = (ri as Record<string, unknown>)[k];
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) continue;
      const p = patch as Record<string, unknown>;
      const cur = { ...items[k] };
      if (typeof p.enabled === 'boolean') cur.enabled = p.enabled;
      if (typeof p.label === 'string') cur.label = p.label;
      if (typeof p.maxPoints === 'number' && p.maxPoints >= 0) cur.maxPoints = p.maxPoints;
      if (p.inputType === 'choice' || p.inputType === 'free') cur.inputType = p.inputType;
      if (p.freeValueType === 'int' || p.freeValueType === 'decimal1' || p.freeValueType === 'string') {
        cur.freeValueType = p.freeValueType;
      }
      if (p.freeGrading === 'auto' || p.freeGrading === 'manual') cur.freeGrading = p.freeGrading;
      if (typeof p.penaltyStep === 'number' && p.penaltyStep > 0) cur.penaltyStep = p.penaltyStep;
      if (typeof p.penaltyPointsPerStep === 'number' && p.penaltyPointsPerStep >= 0) {
        cur.penaltyPointsPerStep = p.penaltyPointsPerStep;
      }
      if (Array.isArray(p.options)) {
        cur.options = p.options.filter((x): x is string => typeof x === 'string');
      }
      items[k] = cur;
    }
  }

  for (const k of ['cask', 'region'] as const) {
    if (items[k].inputType === 'free') {
      items[k].freeValueType = 'string';
    }
  }

  return { version: 1, items };
}

/**
 * DB の cask_options / region_options 列にだけ値がある行を、scoring.items.cask|region.options に取り込む。
 * items 側に既に選択肢がある場合はそちらを優先する。
 */
export function mergeLegacyOptionColumnsIntoScoring(
  scoring: unknown,
  cask_options: string[] | undefined | null,
  region_options: string[] | undefined | null,
): FullScoringConfig {
  const norm = normalizeScoringConfig(scoring);
  const items = { ...norm.items };

  const caskFromItems = (items.cask.options ?? []).map(String).filter(Boolean);
  const caskFromLegacy = Array.isArray(cask_options)
    ? cask_options.map((x) => String(x)).filter(Boolean)
    : [];
  const caskMerged = caskFromItems.length > 0 ? caskFromItems : caskFromLegacy;

  const regionFromItems = (items.region.options ?? []).map(String).filter(Boolean);
  const regionFromLegacy = Array.isArray(region_options)
    ? region_options.map((x) => String(x)).filter(Boolean)
    : [];
  const regionMerged = regionFromItems.length > 0 ? regionFromItems : regionFromLegacy;

  items.cask = {
    ...items.cask,
    ...(caskMerged.length > 0 ? { options: caskMerged } : {}),
  };
  items.region = {
    ...items.region,
    ...(regionMerged.length > 0 ? { options: regionMerged } : {}),
  };

  return { version: 1, items };
}

/** オーナー画面用・配点JSON v2（入出力） */
export const SCORING_FILE_FORMAT = 'blind-dram-scoring' as const;
export const SCORING_FILE_VERSION = 2 as const;

export type ScoringSettingsFileV2 = {
  format: typeof SCORING_FILE_FORMAT;
  version: typeof SCORING_FILE_VERSION;
  exported_at: string;
  /** 満点・入力方式・選択肢（options）はすべてここに集約 */
  scoring: FullScoringConfig;
};

export function buildScoringSettingsFile(cfg: FullScoringConfig): ScoringSettingsFileV2 {
  return {
    format: SCORING_FILE_FORMAT,
    version: SCORING_FILE_VERSION,
    exported_at: new Date().toISOString(),
    scoring: normalizeScoringConfig(cfg),
  };
}

export function parseScoringSettingsFile(raw: unknown): FullScoringConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('INVALID_ROOT');
  }
  const o = raw as Record<string, unknown>;
  if (o.format !== SCORING_FILE_FORMAT) {
    throw new Error('UNKNOWN_FORMAT');
  }
  if (o.version !== SCORING_FILE_VERSION) {
    throw new Error('UNKNOWN_VERSION');
  }
  if (!o.scoring || typeof o.scoring !== 'object' || Array.isArray(o.scoring)) {
    throw new Error('MISSING_SCORING');
  }
  return normalizeScoringConfig(o.scoring);
}

export function scoreManualItem(maxPoints: number, grade: ItemGrade | undefined): number {
  if (!grade?.verdict) return 0;
  if (grade.verdict === 'wrong') return 0;
  if (grade.verdict === 'correct') return maxPoints;
  const ps = Number(grade.partial_score);
  if (!Number.isFinite(ps)) return 0;
  return Math.max(0, Math.min(maxPoints, ps));
}

function parseGuessNumber(
  raw: string | number | null | undefined,
  kind: FreeValueKind,
): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    if (kind === 'int') return Math.trunc(raw);
    return Math.round(raw * 10) / 10;
  }
  const s = String(raw).replace(/%/g, '').trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  if (kind === 'int') return Math.trunc(n);
  return Math.round(n * 10) / 10;
}

function normStr(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase();
}

export function cleanOptionStrings(arr: string[]): string[] {
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

/** 選択式として選択肢リストが必要な項目か（有効かつ満点>0） */
export function itemNeedsChoiceOptionsList(item: ScoringItemConfig): boolean {
  return item.enabled && item.maxPoints > 0 && item.inputType === 'choice';
}

/** 選択式の表示用オプション（items[].options を最優先。無ければセッションスナップショットの配列） */
export function optionsForItem(
  key: ScoringItemKey,
  item: ScoringItemConfig,
  caskOptions: string[],
  regionOptions: string[],
): string[] {
  if (item.inputType !== 'choice') return [];
  const fromItem = cleanOptionStrings(item.options || []);
  if (key === 'cask') return fromItem.length > 0 ? fromItem : cleanOptionStrings(caskOptions);
  if (key === 'region') return fromItem.length > 0 ? fromItem : cleanOptionStrings(regionOptions);
  return fromItem;
}

function scoreNumericAuto(
  guess: number | null,
  truth: number | null,
  maxPoints: number,
  step: number,
  pointsPerStep: number,
): number {
  if (guess === null || truth === null) return 0;
  const diff = Math.abs(guess - truth);
  const st = step > 0 ? step : 1;
  const pp = pointsPerStep >= 0 ? pointsPerStep : 1;
  const ticks = Math.floor(diff / st);
  return Math.max(0, maxPoints - ticks * pp);
}

export interface AnswerScoreInput {
  guessed_cask: string | null;
  guessed_region: string | null;
  guessed_age: string | number | null;
  guessed_abv: string | number | null;
  guessed_distillery: string | null;
  guessed_other1?: string | null;
  guessed_other2?: string | null;
}

export interface TruthScoreInput {
  true_cask: string | null;
  true_region: string | null;
  true_age: string | number | null;
  true_abv: string | number | null;
  true_distillery: string | null;
  true_other1?: string | null;
  true_other2?: string | null;
}

export interface GradeScoreInput {
  is_correct: boolean | null;
  item_grades: ItemGradesMap | null | undefined;
}

function gradeForKey(g: GradeScoreInput, key: ScoringItemKey): ItemGrade | undefined {
  const fromMap = g.item_grades?.[key];
  if (fromMap?.verdict) return fromMap;
  if (key === 'distillery' && g.is_correct !== null && g.is_correct !== undefined) {
    return { verdict: g.is_correct ? 'correct' : 'wrong' };
  }
  return undefined;
}

function hasAgeAbvValue(v: string | number | null | undefined): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
}

function itemHasGuessValue(key: ScoringItemKey, answer: AnswerScoreInput): boolean {
  switch (key) {
    case 'cask':
      return !!normStr(answer.guessed_cask);
    case 'region':
      return !!normStr(answer.guessed_region);
    case 'age':
      return hasAgeAbvValue(answer.guessed_age);
    case 'abv':
      return hasAgeAbvValue(answer.guessed_abv);
    case 'distillery':
      return !!normStr(answer.guessed_distillery);
    case 'other1':
      return !!normStr(answer.guessed_other1);
    case 'other2':
      return !!normStr(answer.guessed_other2);
    default:
      return false;
  }
}

function itemHasTruthValue(key: ScoringItemKey, truth: TruthScoreInput): boolean {
  switch (key) {
    case 'cask':
      return !!normStr(truth.true_cask);
    case 'region':
      return !!normStr(truth.true_region);
    case 'age':
      return hasAgeAbvValue(truth.true_age);
    case 'abv':
      return hasAgeAbvValue(truth.true_abv);
    case 'distillery':
      return !!normStr(truth.true_distillery);
    case 'other1':
      return !!normStr(truth.true_other1);
    case 'other2':
      return !!normStr(truth.true_other2);
    default:
      return false;
  }
}

/** 1 項目の得点（calculateScoreExtended と同じロジック） */
export function scoreSingleItem(
  key: ScoringItemKey,
  it: ScoringItemConfig,
  answer: AnswerScoreInput,
  truth: TruthScoreInput,
  grade: GradeScoreInput,
  caskOptions: string[],
  regionOptions: string[],
): number {
  if (!it.enabled || it.maxPoints <= 0) return 0;

  switch (key) {
    case 'cask': {
      const gCask = normStr(answer.guessed_cask);
      const tCask = normStr(truth.true_cask);
      if (it.inputType === 'choice') {
        return gCask && tCask && gCask === tCask ? it.maxPoints : 0;
      }
      const fv = it.freeValueType || 'string';
      if (it.freeGrading === 'manual') {
        return scoreManualItem(it.maxPoints, gradeForKey(grade, 'cask'));
      }
      if (fv === 'string') {
        return normStr(answer.guessed_cask) && normStr(answer.guessed_cask) === normStr(truth.true_cask)
          ? it.maxPoints
          : 0;
      }
      return scoreNumericAuto(
        parseGuessNumber(answer.guessed_cask, fv),
        parseGuessNumber(truth.true_cask, fv),
        it.maxPoints,
        it.penaltyStep || 1,
        it.penaltyPointsPerStep ?? 1,
      );
    }
    case 'region': {
      const gReg = normStr(answer.guessed_region);
      const tReg = normStr(truth.true_region);
      if (it.inputType === 'choice') {
        return gReg && tReg && gReg === tReg ? it.maxPoints : 0;
      }
      const fv = it.freeValueType || 'string';
      if (it.freeGrading === 'manual') {
        return scoreManualItem(it.maxPoints, gradeForKey(grade, 'region'));
      }
      if (fv === 'string') {
        return normStr(answer.guessed_region) && normStr(answer.guessed_region) === normStr(truth.true_region)
          ? it.maxPoints
          : 0;
      }
      return scoreNumericAuto(
        parseGuessNumber(answer.guessed_region, fv),
        parseGuessNumber(truth.true_region, fv),
        it.maxPoints,
        it.penaltyStep || 1,
        it.penaltyPointsPerStep ?? 1,
      );
    }
    case 'age': {
      if (it.inputType === 'choice') {
        const ga = normStr(String(answer.guessed_age ?? ''));
        const ta = normStr(String(truth.true_age ?? ''));
        return ga && ta && ga === ta ? it.maxPoints : 0;
      }
      if (it.freeGrading === 'manual') {
        return scoreManualItem(it.maxPoints, gradeForKey(grade, 'age'));
      }
      const kind = it.freeValueType === 'decimal1' ? 'decimal1' : 'int';
      return scoreNumericAuto(
        parseGuessNumber(answer.guessed_age, kind),
        parseGuessNumber(truth.true_age, kind),
        it.maxPoints,
        it.penaltyStep || 1,
        it.penaltyPointsPerStep ?? 1,
      );
    }
    case 'abv': {
      if (it.inputType === 'choice') {
        const ga = normStr(String(answer.guessed_abv ?? ''));
        const ta = normStr(String(truth.true_abv ?? ''));
        return ga && ta && ga === ta ? it.maxPoints : 0;
      }
      if (it.freeGrading === 'manual') {
        return scoreManualItem(it.maxPoints, gradeForKey(grade, 'abv'));
      }
      const kind = it.freeValueType === 'int' ? 'int' : 'decimal1';
      return scoreNumericAuto(
        parseGuessNumber(answer.guessed_abv, kind),
        parseGuessNumber(truth.true_abv, kind),
        it.maxPoints,
        it.penaltyStep || 1,
        it.penaltyPointsPerStep ?? 1,
      );
    }
    case 'distillery': {
      if (it.inputType === 'choice') {
        const opts = optionsForItem('distillery', it, caskOptions, regionOptions);
        const g = normStr(answer.guessed_distillery);
        const t = normStr(truth.true_distillery);
        if (opts.length >= 2) {
          return g && t && g === t ? it.maxPoints : 0;
        }
        if (it.freeGrading === 'manual') {
          return scoreManualItem(it.maxPoints, gradeForKey(grade, 'distillery'));
        }
        return g && t && g === t ? it.maxPoints : 0;
      }
      if (it.freeGrading === 'manual') {
        return scoreManualItem(it.maxPoints, gradeForKey(grade, 'distillery'));
      }
      const fv = it.freeValueType || 'string';
      if (fv === 'string') {
        return normStr(answer.guessed_distillery) &&
          normStr(answer.guessed_distillery) === normStr(truth.true_distillery)
          ? it.maxPoints
          : 0;
      }
      return scoreNumericAuto(
        parseGuessNumber(answer.guessed_distillery, fv),
        parseGuessNumber(truth.true_distillery, fv),
        it.maxPoints,
        it.penaltyStep || 1,
        it.penaltyPointsPerStep ?? 1,
      );
    }
    case 'other1':
    case 'other2': {
      const gk = key === 'other1' ? answer.guessed_other1 : answer.guessed_other2;
      const tk = key === 'other1' ? truth.true_other1 : truth.true_other2;
      if (it.inputType === 'choice') {
        return normStr(gk) && normStr(gk) === normStr(tk) ? it.maxPoints : 0;
      }
      if (it.freeGrading === 'manual') {
        return scoreManualItem(it.maxPoints, gradeForKey(grade, key));
      }
      const fv = it.freeValueType || 'string';
      if (fv === 'string') {
        return normStr(gk) && normStr(gk) === normStr(tk) ? it.maxPoints : 0;
      }
      return scoreNumericAuto(
        parseGuessNumber(gk, fv),
        parseGuessNumber(tk, fv),
        it.maxPoints,
        it.penaltyStep || 1,
        it.penaltyPointsPerStep ?? 1,
      );
    }
    default:
      return 0;
  }
}

export function calculateItemScore(
  key: ScoringItemKey,
  answer: AnswerScoreInput,
  truth: TruthScoreInput,
  grade: GradeScoreInput,
  configRaw: unknown,
  caskOptions: string[],
  regionOptions: string[],
): number {
  const cfg = normalizeScoringConfig(configRaw).items;
  return scoreSingleItem(key, cfg[key], answer, truth, grade, caskOptions, regionOptions);
}

export function calculateScoreExtended(
  answer: AnswerScoreInput,
  truth: TruthScoreInput,
  grade: GradeScoreInput,
  configRaw: unknown,
  caskOptions: string[],
  regionOptions: string[],
): number {
  const cfg = normalizeScoringConfig(configRaw).items;
  let score = 0;
  for (const key of SCORING_ITEM_KEYS) {
    score += scoreSingleItem(key, cfg[key], answer, truth, grade, caskOptions, regionOptions);
  }
  return score;
}

/** プレゼンターが手採点（正解/不正解/部分点）を付ける必要がある項目か */
export function itemNeedsManualGrading(key: ScoringItemKey, it: ScoringItemConfig): boolean {
  if (!it.enabled || it.maxPoints <= 0) return false;
  if (it.inputType === 'free' && it.freeGrading === 'manual') return true;
  if (key === 'distillery' && it.inputType === 'choice') {
    const opts = it.options || [];
    return opts.length < 2;
  }
  return false;
}

/**
 * 結果テーブル用バッジ状態
 * 0点=不正解、満点=正解、それ以外=部分点
 */
export type ResultItemBadgeState =
  | { kind: 'correct' }
  | { kind: 'wrong' }
  | { kind: 'partial'; earned: number }
  | { kind: 'unknown' };

export function resultItemBadgeState(
  key: ScoringItemKey,
  cfg: ScoringItemConfig,
  answer: AnswerScoreInput,
  truth: TruthScoreInput,
  grade: { is_correct?: boolean | null; item_grades?: ItemGradesMap | null } | null | undefined,
  caskOptions: string[] = [],
  regionOptions: string[] = [],
): ResultItemBadgeState {
  if (!cfg.enabled || cfg.maxPoints <= 0) return { kind: 'unknown' };

  const gIn: GradeScoreInput = {
    is_correct: grade?.is_correct ?? null,
    item_grades: grade?.item_grades ?? undefined,
  };

  if (!itemHasGuessValue(key, answer) && !itemHasTruthValue(key, truth)) {
    return { kind: 'unknown' };
  }

  if (itemNeedsManualGrading(key, cfg) && !gradeForKey(gIn, key)?.verdict) {
    return { kind: 'unknown' };
  }

  const earned = scoreSingleItem(key, cfg, answer, truth, gIn, caskOptions, regionOptions);
  const max = cfg.maxPoints;

  if (earned <= 0) return { kind: 'wrong' };
  if (earned >= max) return { kind: 'correct' };
  return { kind: 'partial', earned };
}

/**
 * @deprecated resultItemBadgeState を使用してください
 */
export function resultItemCorrectnessBadge(
  key: ScoringItemKey,
  cfg: ScoringItemConfig,
  answer: AnswerScoreInput,
  truth: TruthScoreInput,
  grade: { is_correct?: boolean | null; item_grades?: ItemGradesMap | null } | null | undefined,
): boolean | null {
  const state = resultItemBadgeState(key, cfg, answer, truth, grade);
  if (state.kind === 'correct') return true;
  if (state.kind === 'wrong') return false;
  return null;
}

export function isParticipantManualGradingComplete(
  configRaw: unknown,
  gradeRow: {
    is_correct: boolean | null | undefined;
    item_grades: ItemGradesMap | null | undefined;
  } | null,
): boolean {
  if (!gradeRow) return false;
  const cfg = normalizeScoringConfig(configRaw).items;
  const g: GradeScoreInput = {
    is_correct: gradeRow.is_correct ?? null,
    item_grades: gradeRow.item_grades,
  };

  for (const key of SCORING_ITEM_KEYS) {
    const it = cfg[key];
    if (!itemNeedsManualGrading(key, it)) continue;

    const ig = gradeForKey(g, key);
    if (!ig?.verdict) return false;
    if (ig.verdict === 'partial') {
      const ps = Number(ig.partial_score);
      if (!Number.isFinite(ps)) return false;
    }
  }

  return true;
}
