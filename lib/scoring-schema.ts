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
  guessed_age: number | null;
  guessed_abv: number | null;
  guessed_distillery: string | null;
  guessed_other1?: string | null;
  guessed_other2?: string | null;
}

export interface TruthScoreInput {
  true_cask: string | null;
  true_region: string | null;
  true_age: number | null;
  true_abv: number | null;
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

  const gCask = normStr(answer.guessed_cask);
  const tCask = normStr(truth.true_cask);
  if (cfg.cask.enabled && cfg.cask.maxPoints > 0) {
    if (cfg.cask.inputType === 'choice') {
      if (gCask && tCask && gCask === tCask) score += cfg.cask.maxPoints;
    } else {
      const guess = answer.guessed_cask;
      const tr = truth.true_cask;
      const fv = cfg.cask.freeValueType || 'string';
      if (cfg.cask.freeGrading === 'manual') {
        score += scoreManualItem(cfg.cask.maxPoints, gradeForKey(grade, 'cask'));
      } else if (fv === 'string') {
        if (normStr(guess) && normStr(guess) === normStr(tr)) score += cfg.cask.maxPoints;
      } else {
        const gn = parseGuessNumber(guess, fv);
        const tn = parseGuessNumber(tr, fv);
        score += scoreNumericAuto(
          gn,
          tn,
          cfg.cask.maxPoints,
          cfg.cask.penaltyStep || 1,
          cfg.cask.penaltyPointsPerStep ?? 1,
        );
      }
    }
  }

  const gReg = normStr(answer.guessed_region);
  const tReg = normStr(truth.true_region);
  if (cfg.region.enabled && cfg.region.maxPoints > 0) {
    if (cfg.region.inputType === 'choice') {
      if (gReg && tReg && gReg === tReg) score += cfg.region.maxPoints;
    } else {
      const guess = answer.guessed_region;
      const tr = truth.true_region;
      const fv = cfg.region.freeValueType || 'string';
      if (cfg.region.freeGrading === 'manual') {
        score += scoreManualItem(cfg.region.maxPoints, gradeForKey(grade, 'region'));
      } else if (fv === 'string') {
        if (normStr(guess) && normStr(guess) === normStr(tr)) score += cfg.region.maxPoints;
      } else {
        const gn = parseGuessNumber(guess, fv);
        const tn = parseGuessNumber(tr, fv);
        score += scoreNumericAuto(
          gn,
          tn,
          cfg.region.maxPoints,
          cfg.region.penaltyStep || 1,
          cfg.region.penaltyPointsPerStep ?? 1,
        );
      }
    }
  }

  if (cfg.age.enabled && cfg.age.maxPoints > 0) {
    if (cfg.age.freeGrading === 'manual') {
      score += scoreManualItem(cfg.age.maxPoints, gradeForKey(grade, 'age'));
    } else {
      const gn = parseGuessNumber(answer.guessed_age, 'int');
      const tn = parseGuessNumber(truth.true_age, 'int');
      score += scoreNumericAuto(
        gn,
        tn,
        cfg.age.maxPoints,
        cfg.age.penaltyStep || 1,
        cfg.age.penaltyPointsPerStep ?? 1,
      );
    }
  }

  if (cfg.abv.enabled && cfg.abv.maxPoints > 0) {
    if (cfg.abv.freeGrading === 'manual') {
      score += scoreManualItem(cfg.abv.maxPoints, gradeForKey(grade, 'abv'));
    } else {
      const kind = cfg.abv.freeValueType === 'int' ? 'int' : 'decimal1';
      const gn = parseGuessNumber(answer.guessed_abv, kind);
      const tn = parseGuessNumber(truth.true_abv, kind);
      score += scoreNumericAuto(
        gn,
        tn,
        cfg.abv.maxPoints,
        cfg.abv.penaltyStep || 1,
        cfg.abv.penaltyPointsPerStep ?? 1,
      );
    }
  }

  if (cfg.distillery.enabled && cfg.distillery.maxPoints > 0) {
    if (cfg.distillery.inputType === 'choice') {
      const opts = optionsForItem('distillery', cfg.distillery, caskOptions, regionOptions);
      const g = normStr(answer.guessed_distillery);
      const t = normStr(truth.true_distillery);
      if (opts.length >= 2) {
        if (g && t && g === t) score += cfg.distillery.maxPoints;
      } else if (cfg.distillery.freeGrading === 'manual') {
        score += scoreManualItem(cfg.distillery.maxPoints, gradeForKey(grade, 'distillery'));
      } else {
        if (g && t && g === t) score += cfg.distillery.maxPoints;
      }
    } else if (cfg.distillery.freeGrading === 'manual') {
      score += scoreManualItem(cfg.distillery.maxPoints, gradeForKey(grade, 'distillery'));
    } else {
      const fv = cfg.distillery.freeValueType || 'string';
      if (fv === 'string') {
        if (
          normStr(answer.guessed_distillery) &&
          normStr(answer.guessed_distillery) === normStr(truth.true_distillery)
        ) {
          score += cfg.distillery.maxPoints;
        }
      } else {
        const gn = parseGuessNumber(answer.guessed_distillery, fv);
        const tn = parseGuessNumber(truth.true_distillery, fv);
        score += scoreNumericAuto(
          gn,
          tn,
          cfg.distillery.maxPoints,
          cfg.distillery.penaltyStep || 1,
          cfg.distillery.penaltyPointsPerStep ?? 1,
        );
      }
    }
  }

  for (const ok of ['other1', 'other2'] as const) {
    const it = cfg[ok];
    if (!it.enabled || it.maxPoints <= 0) continue;
    const gk = ok === 'other1' ? answer.guessed_other1 : answer.guessed_other2;
    const tk = ok === 'other1' ? truth.true_other1 : truth.true_other2;
    if (it.freeGrading === 'manual') {
      score += scoreManualItem(it.maxPoints, gradeForKey(grade, ok));
    } else {
      const fv = it.freeValueType || 'string';
      if (fv === 'string') {
        if (normStr(gk) && normStr(gk) === normStr(tk)) score += it.maxPoints;
      } else {
        const gn = parseGuessNumber(gk, fv);
        const tn = parseGuessNumber(tk, fv);
        score += scoreNumericAuto(
          gn,
          tn,
          it.maxPoints,
          it.penaltyStep || 1,
          it.penaltyPointsPerStep ?? 1,
        );
      }
    }
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
 * 結果テーブル用: 項目が「満点一致」なら true、明確に外れなら false、部分点・未採点・両方空などは null
 */
export function resultItemCorrectnessBadge(
  key: ScoringItemKey,
  cfg: ScoringItemConfig,
  answer: AnswerScoreInput,
  truth: TruthScoreInput,
  grade: { is_correct?: boolean | null; item_grades?: ItemGradesMap | null } | null | undefined,
): boolean | null {
  if (!cfg.enabled || cfg.maxPoints <= 0) return null;

  const gIn: GradeScoreInput = {
    is_correct: grade?.is_correct ?? null,
    item_grades: grade?.item_grades ?? undefined,
  };

  if (itemNeedsManualGrading(key, cfg)) {
    const ig = gradeForKey(gIn, key);
    if (ig?.verdict === 'correct') return true;
    if (ig?.verdict === 'wrong') return false;
    return null;
  }

  if (cfg.inputType === 'choice') {
    let gs = '';
    let ts = '';
    switch (key) {
      case 'cask':
        gs = String(answer.guessed_cask ?? '');
        ts = String(truth.true_cask ?? '');
        break;
      case 'region':
        gs = String(answer.guessed_region ?? '');
        ts = String(truth.true_region ?? '');
        break;
      case 'age':
        gs = answer.guessed_age == null || !Number.isFinite(answer.guessed_age) ? '' : String(answer.guessed_age);
        ts = truth.true_age == null || !Number.isFinite(truth.true_age) ? '' : String(truth.true_age);
        break;
      case 'abv':
        gs = answer.guessed_abv == null || !Number.isFinite(answer.guessed_abv) ? '' : String(answer.guessed_abv);
        ts = truth.true_abv == null || !Number.isFinite(truth.true_abv) ? '' : String(truth.true_abv);
        break;
      case 'distillery':
        gs = String(answer.guessed_distillery ?? '');
        ts = String(truth.true_distillery ?? '');
        break;
      case 'other1':
        gs = String(answer.guessed_other1 ?? '');
        ts = String(truth.true_other1 ?? '');
        break;
      case 'other2':
        gs = String(answer.guessed_other2 ?? '');
        ts = String(truth.true_other2 ?? '');
        break;
      default:
        return null;
    }
    if (!normStr(gs) && !normStr(ts)) return null;
    return normStr(gs) === normStr(ts);
  }

  const fv = cfg.freeValueType || 'string';
  if (fv === 'int' || fv === 'decimal1') {
    let rawG: string | number | null | undefined;
    let rawT: string | number | null | undefined;
    switch (key) {
      case 'age':
        rawG = answer.guessed_age;
        rawT = truth.true_age;
        break;
      case 'abv':
        rawG = answer.guessed_abv;
        rawT = truth.true_abv;
        break;
      case 'distillery':
        rawG = answer.guessed_distillery;
        rawT = truth.true_distillery;
        break;
      case 'other1':
        rawG = answer.guessed_other1;
        rawT = truth.true_other1;
        break;
      case 'other2':
        rawG = answer.guessed_other2;
        rawT = truth.true_other2;
        break;
      default:
        return null;
    }
    const gn = parseGuessNumber(rawG, fv);
    const tn = parseGuessNumber(rawT, fv);
    if (gn === null && tn === null) return null;
    if (gn === null || tn === null) return false;
    return gn === tn;
  }

  let rawG: string | null | undefined;
  let rawT: string | null | undefined;
  switch (key) {
    case 'distillery':
      rawG = answer.guessed_distillery ?? undefined;
      rawT = truth.true_distillery ?? undefined;
      break;
    case 'other1':
      rawG = answer.guessed_other1 ?? undefined;
      rawT = truth.true_other1 ?? undefined;
      break;
    case 'other2':
      rawG = answer.guessed_other2 ?? undefined;
      rawT = truth.true_other2 ?? undefined;
      break;
    default:
      return null;
  }
  if (!normStr(rawG) && !normStr(rawT)) return null;
  return normStr(rawG) === normStr(rawT);
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
