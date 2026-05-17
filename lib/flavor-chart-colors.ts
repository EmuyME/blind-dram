import { tier1ListFromFlavorChart } from '@/lib/json-helpers';
import { DEFAULT_TIER1_NIGHTINGALE_RGB } from '@/lib/default-flavor-chart';

/** ナイチンゲール・ローズ・チャートの Tier1 ごとのベース色（設定で上書き可） */
export type Tier1NightingaleRgb = { r: number; g: number; b: number };

/** デフォルト（オーナー画面・スナップショット未設定時の基準） — 13区分ホイール + その他 */
export const DEFAULT_TIER1_NIGHTINGALE_COLORS: Record<string, Tier1NightingaleRgb> = Object.fromEntries(
  Object.entries(DEFAULT_TIER1_NIGHTINGALE_RGB).map(([k, v]) => [k, { r: v.r, g: v.g, b: v.b }]),
) as Record<string, Tier1NightingaleRgb>;

export function clampRgb(c: Tier1NightingaleRgb): Tier1NightingaleRgb {
  const clip = (n: number) =>
    Math.min(255, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));
  return { r: clip(c.r), g: clip(c.g), b: clip(c.b) };
}

function hslToRgb(h: number, s: number, l: number): Tier1NightingaleRgb {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  const hh = ((h % 360) + 360) % 360;
  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return clampRgb({
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  });
}

/** Tier1 名から安定的な補完色（カスタム未設定の項目用） */
export function hashStringToTier1Rgb(label: string): Tier1NightingaleRgb {
  let h = 2166136261;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const hue = u % 360;
  const sat = 44 + (u >>> 8) % 24;
  const light = 52 + (u >>> 16) % 12;
  return hslToRgb(hue, sat, light);
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * flavor_chart（スナップショット含む）から Tier1 ラベル → RGB を解決。
 * `tier1_nightingale_colors` が無い・欠ける場合はデフォルト／ハッシュで埋める。
 */
export function resolvedTier1NightingaleColors(flavorChartRaw: unknown): Record<string, Tier1NightingaleRgb> {
  const out: Record<string, Tier1NightingaleRgb> = {
    ...Object.fromEntries(
      Object.entries(DEFAULT_TIER1_NIGHTINGALE_COLORS).map(([k, v]) => [k, { ...v }]),
    ),
  };

  const rawObj =
    flavorChartRaw && typeof flavorChartRaw === 'object'
      ? (flavorChartRaw as { tier1_nightingale_colors?: unknown })
      : null;
  const custom = rawObj?.tier1_nightingale_colors;
  if (custom && typeof custom === 'object' && !Array.isArray(custom)) {
    for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
      if (!k || typeof v !== 'object' || v === null) continue;
      const o = v as Record<string, unknown>;
      const r = Number(o.r);
      const g = Number(o.g);
      const b = Number(o.b);
      if ([r, g, b].every((n) => Number.isFinite(n))) {
        out[k] = clampRgb({ r, g, b });
      }
    }
  }

  for (const t of tier1ListFromFlavorChart(flavorChartRaw)) {
    if (t && !out[t]) {
      out[t] = hashStringToTier1Rgb(t);
    }
  }

  return out;
}

/** POST /api/settings/save 用: 不正キーは除外 */
export function sanitizeTier1NightingaleColorsInput(raw: unknown): Record<string, Tier1NightingaleRgb> | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, Tier1NightingaleRgb> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== 'string' || !k.trim()) continue;
    if (typeof v !== 'object' || v === null) continue;
    const o = v as Record<string, unknown>;
    const r = Number(o.r);
    const g = Number(o.g);
    const b = Number(o.b);
    if (![r, g, b].every((n) => Number.isFinite(n))) continue;
    out[k.trim()] = clampRgb({ r, g, b });
  }
  return out;
}
