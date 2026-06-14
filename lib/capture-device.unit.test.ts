import { describe, expect, it } from 'vitest';
import {
  getDefaultPixelRatio,
  getMaxCanvasDimension,
  getMaxChunkHeight,
} from '@/lib/capture-device';

describe('capture-device limits', () => {
  it('returns desktop defaults in node (non-mobile)', () => {
    expect(getMaxCanvasDimension()).toBe(16384);
    expect(getMaxChunkHeight()).toBe(8000);
    expect(getDefaultPixelRatio()).toBe(2);
  });
});
