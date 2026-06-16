import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 結果レポート画像（大会・全体・個人）の UI とキャプチャ DOM を検証
 */
test.describe('Report image export', () => {
  test.setTimeout(180000);

  test('結果画面で3種レポートの保存ボタンとキャプチャ用DOMが動作する', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const result = await helpers.createEvent('レポート出力E2E', 'sequential');
    const joinToken = result.joinToken!;
    const ownerToken = result.ownerToken!;

    const participant1 = await helpers.createMockParticipant(joinToken, '参加者A', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者B', 0, []);

    await helpers.waitForParticipantsToAppear(ownerToken);
    await page.waitForTimeout(1500);
    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);
    await page.waitForTimeout(1500);

    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const samples = samplesResult?.data?.samples || [];
    expect(samples.length).toBeGreaterThan(0);

    const sample = samples[0];
    const sampleId = sample.id as string;

    await helpers.startRound(joinToken, sampleId, participant1.participantToken);
    await helpers.submitAnswer(joinToken, sampleId, participant1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 12,
      guessed_abv: 43,
      guessed_distillery: 'マッカラン',
    });
    await helpers.submitAnswer(joinToken, sampleId, participant2.participantToken, {
      guessed_cask: 'バーボン樽',
      guessed_region: '日本',
      guessed_age: 15,
      guessed_abv: 40,
      guessed_distillery: '山崎',
    });
    await helpers.submitTruth(joinToken, sampleId, participant1.participantToken, {
      true_cask: 'シェリー樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43,
      true_distillery: 'マッカラン',
    });
    await page.request.post('/api/distillery/grade', {
      data: {
        participant_token: participant1.participantToken,
        sample_id: sampleId,
        target_participant_id: participant2.participantId,
        is_correct: true,
      },
    });
    await page.request.post('/api/distillery/grade', {
      data: {
        participant_token: participant1.participantToken,
        sample_id: sampleId,
        target_participant_id: participant1.participantId,
        is_correct: true,
      },
    });
    await helpers.finishRound(joinToken, sampleId, participant1.participantToken);

    await page.request.post('/api/round-result/click-next', {
      data: { participant_token: participant1.participantToken, sample_id: sampleId },
    });
    await page.request.post('/api/round-result/click-next', {
      data: { participant_token: participant2.participantToken, sample_id: sampleId },
    });
    const startNext = await page.request.post('/api/round-result/start-next', {
      data: { participant_token: participant1.participantToken, sample_id: sampleId },
    });
    if (!startNext.ok()) {
      const err = await startNext.json().catch(() => ({}));
      throw new Error(`start-next: ${(err as { error?: string })?.error || startNext.status()}`);
    }

    await page.request.post('/api/session/check-complete', { data: { join_token: joinToken } });
    const waitStart = Date.now();
    let sessionState = '';
    while (Date.now() - waitStart < 30000) {
      const sessionResponse = await page.request.get(`/api/session/get?owner_token=${ownerToken}`);
      const sessionResult = await sessionResponse.json().catch(() => ({}));
      sessionState = sessionResult?.data?.state || '';
      if (sessionState === 'aggregating') break;
      await page.request.post('/api/session/check-complete', { data: { join_token: joinToken } });
      await page.waitForTimeout(2000);
    }
    expect(sessionState).toBe('aggregating');

    const pub = await page.request.post('/api/owner/publish', { data: { owner_token: ownerToken } });
    expect(pub.ok()).toBeTruthy();
    await page.waitForTimeout(2000);

    const apiRes = await page.request.get(`/api/results/get?join_token=${joinToken}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiJson = await apiRes.json();
    expect(apiJson.data?.rankings?.length).toBeGreaterThan(0);
    expect(apiJson.data?.session?.created_at).toBeTruthy();

    await page.goto(`/session/${joinToken}/results`);
    await expect(page.getByRole('button', { name: '大会レポートを保存' })).toBeVisible();
    await expect(page.getByRole('button', { name: '全体レポートを保存' })).toBeVisible();

    const captureInfo = await page.evaluate(() => {
      const root = document.querySelector('[data-report-capture-root]');
      if (!root) return { ok: false, reason: 'no capture root' };
      const kinds = ['tournament', 'overall', 'personal'] as const;
      const pages: Record<string, number> = {};
      for (const kind of kinds) {
        pages[kind] = root.querySelectorAll(`[data-report-kind="${kind}"] [data-report-capture-page]`).length;
      }
      return { ok: true, pages };
    });
    expect(captureInfo.ok).toBe(true);
    expect(captureInfo.pages?.tournament).toBe(1);
    expect(captureInfo.pages?.overall).toBe(1);
    expect((captureInfo.pages?.personal ?? 0)).toBeGreaterThanOrEqual(2);

    await page.getByRole('button', { name: '大会レポートを保存' }).click();
    await expect(page.getByText(/レポート画像をダウンロード|共有シートから画像|長押しして保存/)).toBeVisible({
      timeout: 90000,
    });

    await page.getByRole('button', { name: '全体レポートを保存' }).click();
    await expect(page.getByText(/レポート画像をダウンロード|共有シートから画像|長押しして保存/)).toBeVisible({
      timeout: 90000,
    });

    await page.getByRole('button', { name: '参加者' }).click();
    await page.getByRole('button', { name: /参加者A/ }).click();
    await expect(page.getByRole('button', { name: '個人レポートを保存' })).toBeEnabled();
    await page.getByRole('button', { name: '個人レポートを保存' }).click();
    await expect(page.getByText(/レポート画像をダウンロード|共有シートから画像|長押しして保存/)).toBeVisible({
      timeout: 90000,
    });
  });
});
