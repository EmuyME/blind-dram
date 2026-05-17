'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, Chart, TooltipItem, ChartData, ChartDataset } from 'chart.js';
import type { ScriptableContext } from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import type { Tier1NightingaleRgb } from '@/lib/flavor-chart-colors';
import { hashStringToTier1Rgb, rgbToHsl } from '@/lib/flavor-chart-colors';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

export type FlavorIntensityRadarChartProps = {
  labels: string[];
  values: number[];
  /** カード内の補足（集計方法など） */
  caption?: string;
  /**
   * オーナー設定の `flavor_chart.tier1_nightingale_colors`（または API が解決済みのマップ）。
   * 未指定時はラベル名からデフォルト／ハッシュで補完。
   */
  tier1NightingaleColors?: Record<string, Tier1NightingaleRgb>;
};

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;
}

function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

type RadialScaleLike = {
  xCenter: number;
  yCenter: number;
  getDistanceFromCenterForValue: (v: number) => number;
};

/**
 * スケール半径に沿って 0〜1、1〜2、2〜3… の帯が分かるよう、中心から外周へ色と彩度を段階的に変化させる。
 * 扇ごとに色相を少しずらし、判別しやすくする。
 * 初回描画で radial スケールが未初期化のときは chartArea から推定し、ダメなら単色にフォールバックする。
 */
function nightingaleZoneRadialGradient(
  chart: Chart,
  niceMax: number,
  liftLightness: number,
  baseHsl: { h: number; s: number; l: number },
): CanvasGradient | string {
  const ctx = chart.ctx;
  const hueBase = ((baseHsl.h % 360) + 360) % 360;
  const sat0 = Math.min(90, Math.max(16, baseHsl.s));
  const lum0 = Math.min(68, Math.max(12, baseHsl.l));

  if (!ctx) {
    return hsla(hueBase, sat0, lum0 + liftLightness * 0.15, 0.72);
  }
  const safeMax = Math.max(Number.isFinite(niceMax) ? niceMax : 5, 1e-6);

  const scale = chart.scales.r as unknown as Partial<RadialScaleLike> | undefined;
  let cx = scale?.xCenter;
  let cy = scale?.yCenter;
  let rEnd = scale?.getDistanceFromCenterForValue?.(safeMax);

  if (!isFiniteNum(cx) || !isFiniteNum(cy)) {
    const area = chart.chartArea;
    if (area && area.width > 0 && area.height > 0) {
      cx = area.left + area.width / 2;
      cy = area.top + area.height / 2;
    } else {
      return hsla(hueBase, sat0, lum0 + liftLightness * 0.15, 0.72);
    }
  }

  if (!isFiniteNum(rEnd) || rEnd <= 0) {
    const area = chart.chartArea;
    if (area && area.width > 0 && area.height > 0) {
      rEnd = Math.min(area.width, area.height) / 2;
    } else {
      rEnd = 120;
    }
  }
  rEnd = Math.max(rEnd, 1);

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rEnd);

  /** 整数強度境界: ベース HSL から外側ほど明るく・不透明に */
  const satCap = Math.min(72, sat0 + 18);
  const bandStops: { h: number; s: number; l: number; a: number }[] = [
    { h: hueBase - 5, s: Math.max(20, sat0 - 18), l: Math.max(16, lum0 - 18) + liftLightness, a: 0.44 },
    { h: hueBase - 2, s: Math.max(28, sat0 - 10), l: Math.max(22, lum0 - 10) + liftLightness, a: 0.56 },
    { h: hueBase + 1, s: Math.max(36, sat0 - 4), l: Math.max(30, lum0 - 2) + liftLightness, a: 0.66 },
    { h: hueBase + 3, s: Math.min(satCap, sat0 + 2), l: Math.min(58, lum0 + 4) + liftLightness, a: 0.76 },
    { h: hueBase + 5, s: Math.min(satCap, sat0 + 4), l: Math.min(62, lum0 + 8) + liftLightness, a: 0.84 },
    { h: hueBase + 7, s: Math.min(satCap, sat0 + 6), l: Math.min(66, lum0 + 12) + liftLightness, a: 0.88 },
    { h: hueBase + 8, s: Math.min(satCap, sat0 + 8), l: Math.min(70, lum0 + 14) + liftLightness, a: 0.9 },
    { h: hueBase + 9, s: Math.min(satCap, sat0 + 8), l: Math.min(72, lum0 + 16) + liftLightness, a: 0.91 },
    { h: hueBase + 10, s: Math.min(satCap, sat0 + 8), l: Math.min(74, lum0 + 18) + liftLightness, a: 0.92 },
    { h: hueBase + 10, s: Math.min(satCap, sat0 + 8), l: Math.min(76, lum0 + 20) + liftLightness, a: 0.93 },
  ];

  g.addColorStop(0, hsla(hueBase, sat0 * 0.55, lum0 * 0.3 + liftLightness * 0.5, 0.34));

  const maxBand = Math.max(1, Math.ceil(safeMax));
  for (let k = 1; k <= maxBand; k++) {
    const band = bandStops[Math.min(k, bandStops.length) - 1];
    const t = Math.min(1, k / safeMax);
    g.addColorStop(t, hsla(band.h, band.s, band.l, band.a));
  }

  return g;
}

function wedgeBorderColor(
  niceMax: number,
  value: number,
  baseHsl: { h: number; s: number; l: number },
): string {
  const t = Math.min(1, Math.max(0, value / Math.max(niceMax, 1)));
  const hueBase = ((baseHsl.h % 360) + 360) % 360;
  return hsla(
    hueBase + t * 6,
    Math.min(72, baseHsl.s + 6 + t * 8),
    Math.min(70, baseHsl.l + 6 + t * 10),
    0.45 + t * 0.32,
  );
}

/**
 * フレーバー・ナイチンゲール・ローズ・チャート（Polar Area）。
 * 各 Tier1 は中心角が等分され、ノーズ／ポーラー／フィニッシュの強度の最大値を半径で表現する。
 * `labels` は外周の pointLabels として各フレーバー名を表示する。
 */
export function FlavorIntensityRadarChart({
  labels,
  values,
  caption,
  tier1NightingaleColors,
}: FlavorIntensityRadarChartProps) {
  const maxValue = Math.max(...values, 1);
  const niceMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
  const step = Math.max(1, Math.round(niceMax / 5));

  const hslByLabelIndex = useMemo(() => {
    return labels.map((label) => {
      const rgb =
        tier1NightingaleColors?.[label] ??
        hashStringToTier1Rgb(label);
      return rgbToHsl(rgb.r, rgb.g, rgb.b);
    });
  }, [labels, tier1NightingaleColors]);

  /** 外周ラベル: 扇と同系色で、暗背景でも判読できるよう明るめにブレンド */
  const rgbByLabelIndex = useMemo(() => {
    return labels.map((label) => tier1NightingaleColors?.[label] ?? hashStringToTier1Rgb(label));
  }, [labels, tier1NightingaleColors]);

  const fallbackHsl = { h: 218, s: 42, l: 58 };
  const borderColor = values.map((v, i) =>
    wedgeBorderColor(niceMax, v, hslByLabelIndex[i] ?? fallbackHsl),
  );
  const borderWidth = values.map((v) => {
    const t = Math.min(1, v / Math.max(niceMax, 1));
    return 1.25 + t * 2.1;
  });
  const hoverBorderColor = values.map((v, i) =>
    wedgeBorderColor(niceMax, v + 0.35, hslByLabelIndex[i] ?? fallbackHsl),
  );
  const hoverBorderWidth = values.map((v) => {
    const t = Math.min(1, v / Math.max(niceMax, 1));
    return 2 + t * 2.4;
  });

  const chartData: ChartData<'polarArea', number[], string> = {
    labels,
    datasets: [
      {
        label: '強度（ノーズ・ポーラー・フィニッシュの最大）',
        data: values,
        backgroundColor: (ctx: ScriptableContext<'polarArea'>) =>
          nightingaleZoneRadialGradient(
            ctx.chart,
            niceMax,
            0,
            hslByLabelIndex[ctx.dataIndex] ?? fallbackHsl,
          ),
        borderColor,
        borderWidth,
        hoverBackgroundColor: (ctx: ScriptableContext<'polarArea'>) =>
          nightingaleZoneRadialGradient(
            ctx.chart,
            niceMax,
            8,
            hslByLabelIndex[ctx.dataIndex] ?? fallbackHsl,
          ),
        hoverBorderColor,
        hoverBorderWidth,
      } as ChartDataset<'polarArea', number[]>,
    ],
  };

  const chartOptions: ChartOptions<'polarArea'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.12,
      animation: {
        duration: 650,
        easing: 'easeOutCubic',
      },
      datasets: {
        polarArea: {
          clip: false,
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: niceMax,
          min: 0,
          ticks: {
            stepSize: step,
            color: 'rgba(226, 232, 240, 0.82)',
            font: { size: 11, weight: 600, family: 'system-ui, sans-serif' },
            showLabelBackdrop: true,
            backdropColor: 'rgba(7, 10, 16, 0.55)',
            backdropPadding: 4,
          },
          grid: {
            color: 'rgba(203, 213, 225, 0.38)',
            circular: true,
            lineWidth: 1.5,
          },
          angleLines: {
            color: 'rgba(186, 198, 210, 0.42)',
            lineWidth: 1.5,
          },
          pointLabels: {
            display: true,
            centerPointLabels: true,
            color(ctx) {
              const i = typeof ctx.index === 'number' ? ctx.index : 0;
              const { r, g, b } = rgbByLabelIndex[i] ?? { r: 200, g: 205, b: 215 };
              const t = 0.42;
              const lr = Math.round(r * (1 - t) + 255 * t);
              const lg = Math.round(g * (1 - t) + 255 * t);
              const lb = Math.round(b * (1 - t) + 255 * t);
              return `rgb(${lr}, ${lg}, ${lb})`;
            },
            font: { size: 12, weight: 'bold', family: 'system-ui, sans-serif' },
            padding: 22,
            backdropColor: 'rgba(7, 10, 16, 0.5)',
            backdropPadding: 5,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          titleColor: 'rgba(248, 250, 252, 1)',
          bodyColor: 'rgba(226, 232, 240, 0.95)',
          borderColor: 'rgba(129, 140, 248, 0.35)',
          borderWidth: 1,
          padding: 11,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: 6,
          callbacks: {
            label: (context: TooltipItem<'polarArea'>) =>
              `強度（最大）: ${context.parsed.r != null ? context.parsed.r : context.raw}`,
          },
        },
      },
    }),
    [niceMax, step, rgbByLabelIndex],
  );

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-500/20 bg-gradient-to-b from-slate-950 via-[#0c0f18] to-[#070a10] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_44px_-14px_rgba(0,0,0,0.6)]"
        style={{
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 44px -14px rgba(0,0,0,0.6), 0 0 0 1px rgba(99, 102, 241, 0.07)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_72%_62%_at_50%_38%,rgba(99,102,241,0.09),transparent_58%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[18px] rounded-full border border-indigo-500/10"
          aria-hidden
        />
        <div className="relative mx-auto max-w-xl pt-1">
          <PolarArea data={chartData} options={chartOptions} />
        </div>
      </div>
      {caption ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">{caption}</p>
      ) : null}
    </div>
  );
}
