import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeSafePixelRatio,
  getMaxCanvasArea,
  getMaxCanvasDimension,
  getMaxChunkHeight,
} from '@/lib/capture-device';

describe('capture-device limits', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns desktop defaults in node (non-mobile)', () => {
    expect(getMaxCanvasDimension()).toBe(16384);
    expect(getMaxChunkHeight()).toBe(8000);
    expect(getMaxCanvasArea()).toBe(16384 * 16384);
  });

  it('scales below 1 when height would exceed canvas max side', () => {
    // 1400 x 5000 at 2x would be 10000px tall — must drop below 1 on a 4096 limit.
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    expect(getMaxCanvasDimension()).toBe(4096);
    const ratio = computeSafePixelRatio(1400, 5000, 2);
    expect(ratio).toBeLessThan(1);
    expect(5000 * ratio).toBeLessThanOrEqual(4096 + 0.5);
    expect(1400 * 5000 * ratio * ratio).toBeLessThanOrEqual(4096 * 4096 + 1);
  });

  it('keeps requested ratio when it fits', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    const ratio = computeSafePixelRatio(1200, 1600, 2);
    expect(ratio).toBe(2);
  });
});
