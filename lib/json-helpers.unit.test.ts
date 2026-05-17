import { describe, it, expect } from 'vitest';
import {
  mergeSubmittedAndPresenterDraftsForFlavorRadar,
  flavorCommentsFromAnswer,
  tier1CountsForAnswerFlavor,
  tier1ListForSessionRadar,
  addAnswerMaxFlavorIntensitiesToTotals,
  mergePresenterTastingTier2FromAnswers,
  flavorChartIncludeOtherInNightingaleChart,
  tier1CountsForNightingaleChartDisplay,
  hasNonZeroTier1CountsForNightingaleChart,
} from '@/lib/json-helpers';
import { ensureTier1NightingaleVisibleMap } from '@/lib/default-flavor-chart';

describe('mergeSubmittedAndPresenterDraftsForFlavorRadar', () => {
  const samples = [{ id: 's1', presenter_participant_id: 'pres1' }];

  it('プレゼンターの draft が提出が無いときレーダー候補に含める', () => {
    const submitted: { sample_id: string; participant_id: string; nose?: unknown }[] = [];
    const drafts = [
      {
        sample_id: 's1',
        participant_id: 'pres1',
        status: 'draft',
        nose: { tier1_tags: ['りんご・洋梨'], tier1_intensity: { 'りんご・洋梨': 3 } },
      },
    ];
    const merged = mergeSubmittedAndPresenterDraftsForFlavorRadar(submitted, drafts, samples);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ participant_id: 'pres1', sample_id: 's1' });
  });

  it('同じ参加者が提出済みのとき draft は二重に載せない', () => {
    const submitted = [
      {
        sample_id: 's1',
        participant_id: 'pres1',
        nose: { tier1_tags: ['麦芽・焼き菓子'], tier1_intensity: { '麦芽・焼き菓子': 1 } },
      },
    ];
    const drafts = [
      {
        sample_id: 's1',
        participant_id: 'pres1',
        status: 'draft',
        nose: { tier1_tags: ['りんご・洋梨'], tier1_intensity: { 'りんご・洋梨': 5 } },
      },
    ];
    const merged = mergeSubmittedAndPresenterDraftsForFlavorRadar(submitted, drafts, samples);
    expect(merged).toHaveLength(1);
    expect((merged[0] as { nose?: { tier1_tags?: string[] } }).nose?.tier1_tags).toContain('麦芽・焼き菓子');
  });

  it('他参加者の draft は無視する', () => {
    const submitted: { sample_id: string; participant_id: string }[] = [];
    const drafts = [
      { sample_id: 's1', participant_id: 'other', status: 'draft', nose: { tier1_tags: ['りんご・洋梨'] } },
    ];
    const merged = mergeSubmittedAndPresenterDraftsForFlavorRadar(submitted, drafts, samples);
    expect(merged).toHaveLength(0);
  });
});

describe('flavorCommentsFromAnswer', () => {
  it('JSON 文字列のセクションをパースして tier1_intensity を含める', () => {
    const row = {
      nose: JSON.stringify({
        tier1_tags: ['りんご・洋梨'],
        tier2_terms: [],
        tier1_intensity: { 'りんご・洋梨': 4 },
        text: '甘い',
      }),
      palate: null,
      finish: null,
    };
    const c = flavorCommentsFromAnswer(row);
    expect(c.nose.tier1_tags).toEqual(['りんご・洋梨']);
    expect(c.nose.tier1_intensity).toEqual({ 'りんご・洋梨': 4 });
    expect(c.nose.text).toBe('甘い');
  });
});

describe('tier1CountsForAnswerFlavor', () => {
  const tier1 = tier1ListForSessionRadar(null);

  it('N/P/F で同一 Tier1 なら強度の最大をとる', () => {
    const answer = {
      nose: { tier1_tags: ['りんご・洋梨'], tier1_intensity: { 'りんご・洋梨': 2 } },
      palate: { tier1_tags: ['りんご・洋梨'], tier1_intensity: { 'りんご・洋梨': 3 } },
      finish: { tier1_tags: ['オーク・スパイス'], tier1_intensity: { 'オーク・スパイス': 1 } },
    };
    const counts = tier1CountsForAnswerFlavor(answer, tier1);
    expect(counts['りんご・洋梨']).toBe(3);
    expect(counts['オーク・スパイス']).toBe(1);
  });

  it('スナップショットに無い Tier1 タグは「その他」に集約される', () => {
    const totals: Record<string, number> = {};
    tier1.forEach((t) => {
      totals[t] = 0;
    });
    addAnswerMaxFlavorIntensitiesToTotals(
      { nose: { tier1_tags: ['存在しないタグ'], tier1_intensity: {} } },
      totals,
      tier1,
    );
    expect(totals['存在しないタグ']).toBeUndefined();
    expect(totals['その他']).toBe(1);
  });
});

describe('mergePresenterTastingTier2FromAnswers', () => {
  it('プレゼンター回答から N/P/F の Tier2 を重複なく収集する', () => {
    const merged = mergePresenterTastingTier2FromAnswers([
      {
        nose: { tier2_terms: ['蜜', '蜜', '柑橘'] },
        palate: { tier2_terms: ['スパイス'] },
        finish: {},
      },
    ]);
    expect(merged.nose).toEqual(['蜜', '柑橘']);
    expect(merged.palate).toEqual(['スパイス']);
    expect(merged.finish).toEqual([]);
  });
});

describe('flavorChartIncludeOtherInNightingaleChart / tier1CountsForNightingaleChartDisplay', () => {
  it('スナップショットに明示的に true が無いとき「その他」はチャートに含めない扱い（レガシー）', () => {
    expect(flavorChartIncludeOtherInNightingaleChart(undefined)).toBe(false);
    expect(flavorChartIncludeOtherInNightingaleChart({})).toBe(false);
    expect(flavorChartIncludeOtherInNightingaleChart({ include_other_in_nightingale_chart: false })).toBe(false);
  });

  it('include_other_in_nightingale_chart が true のときのみ true', () => {
    expect(
      flavorChartIncludeOtherInNightingaleChart({ include_other_in_nightingale_chart: true }),
    ).toBe(true);
  });

  it('レガシー: tier1_nightingale_visible 無しで「その他」をチャートから除く', () => {
    const counts = { りんご・洋梨: 2, その他: 5 };
    const snapLegacyOff = { include_other_in_nightingale_chart: false };
    const snapLegacyOn = { include_other_in_nightingale_chart: true };
    expect(tier1CountsForNightingaleChartDisplay(counts, snapLegacyOff)).toEqual({ りんご・洋梨: 2 });
    expect(tier1CountsForNightingaleChartDisplay(counts, snapLegacyOn)).toEqual(counts);
  });

  it('tier1_nightingale_visible があるときは任意 Tier1 をチャートから除外できる', () => {
    const counts = { A: 1, B: 2, その他: 3 };
    const snap = {
      tier1_nightingale_visible: { A: false, B: true, その他: true },
    };
    expect(tier1CountsForNightingaleChartDisplay(counts, snap)).toEqual({ B: 2, その他: 3 });
  });

  it('マップにキーが無いとき: その他はデフォルト非表示、追加 Tier1 は表示', () => {
    const counts = { 新規: 5, 既存: 1, その他: 3 };
    const snap = { tier1_nightingale_visible: { 既存: false } };
    expect(tier1CountsForNightingaleChartDisplay(counts, snap)).toEqual({ 新規: 5 });
  });

  it('レガシー: その他のみ正ならチャート非表示', () => {
    expect(
      hasNonZeroTier1CountsForNightingaleChart({ その他: 3 }, { include_other_in_nightingale_chart: false }),
    ).toBe(false);
    expect(
      hasNonZeroTier1CountsForNightingaleChart({ その他: 3 }, { include_other_in_nightingale_chart: true }),
    ).toBe(true);
  });

  it('per-Tier 非表示のみならチャート非表示', () => {
    expect(
      hasNonZeroTier1CountsForNightingaleChart(
        { A: 2 },
        { tier1_nightingale_visible: { A: false } },
      ),
    ).toBe(false);
  });

  it('ensureTier1NightingaleVisibleMap: 明示マップで「その他」キー欠落はチャート非表示', () => {
    const m = ensureTier1NightingaleVisibleMap({
      tier1: ['A', 'その他'],
      tier1_nightingale_visible: { A: true },
    });
    expect(m['その他']).toBe(false);
    expect(m.A).toBe(true);
  });
});
