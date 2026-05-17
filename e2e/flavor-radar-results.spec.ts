import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 解答のテイスティングが結果 API のレーダー・per_participant_radar・comments に載ること
 */
test.describe('Flavor radar on published results', () => {
  test.setTimeout(120000);
  test('公開結果: フレーバー集計と参加者別レーダーが API で一致する', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const result = await helpers.createEvent('フレーダー集計E2E', 'sequential');
    const joinToken = result.joinToken!;
    const ownerToken = result.ownerToken!;

    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 2, ['Sample A', 'Sample B']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);

    await helpers.waitForParticipantsToAppear(ownerToken);
    await page.waitForTimeout(2000);
    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);
    await page.waitForTimeout(2000);

    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const samples = samplesResult?.data?.samples || [];

    for (const sample of samples) {
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

      await helpers.mergeAnswerTastingViaApi(sampleId, participant1.participantToken, {
        nose: {
          tier1_tags: ['りんご・洋梨'],
          tier2_terms: [],
          tier1_intensity: { りんご・洋梨: 3 },
          text: null,
        },
        palate: {
          tier1_tags: ['りんご・洋梨'],
          tier2_terms: [],
          tier1_intensity: { りんご・洋梨: 2 },
          text: null,
        },
      });
      await helpers.mergeAnswerTastingViaApi(sampleId, participant2.participantToken, {
        nose: {
          tier1_tags: ['ピート・スモーク'],
          tier2_terms: [],
          tier1_intensity: { 'ピート・スモーク': 2 },
          text: null,
        },
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

      if (sample !== samples[samples.length - 1]) {
        await page.goto(`/session/${joinToken}`);
        await page.evaluate(
          ({ token, jt }) => {
            localStorage.setItem(`bd:participant_token:${jt}`, token);
          },
          { token: participant1.participantToken, jt: joinToken },
        );
        await page.reload();
        await page.waitForTimeout(2000);
        await page.request.post('/api/round-result/click-next', {
          data: { participant_token: participant1.participantToken, sample_id: sampleId },
        });
        await page.request.post('/api/round-result/click-next', {
          data: { participant_token: participant2.participantToken, sample_id: sampleId },
        });
        await page.request.post('/api/round-result/start-next', {
          data: { participant_token: participant1.participantToken, sample_id: sampleId },
        });
        await page.waitForTimeout(2000);
      }
    }

    if (!samples.length) throw new Error('サンプルがありません');

    const lastSampleId = samples[samples.length - 1].id as string;
    await page.request.post('/api/round-result/click-next', {
      data: { participant_token: participant1.participantToken, sample_id: lastSampleId },
    });
    await page.request.post('/api/round-result/click-next', {
      data: { participant_token: participant2.participantToken, sample_id: lastSampleId },
    });
    const startLast = await page.request.post('/api/round-result/start-next', {
      data: { participant_token: participant1.participantToken, sample_id: lastSampleId },
    });
    if (!startLast.ok()) {
      const err = await startLast.json().catch(() => ({}));
      throw new Error(`start-next: ${(err as { error?: string })?.error || startLast.status()}`);
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
    await helpers.publishResults(ownerToken);

    const apiRes = await page.request.get(`/api/results/get?join_token=${joinToken}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiJson = await apiRes.json();
    const data = apiJson.data as {
      flavor_radar?: { tier1_counts: Record<string, number> };
      sample_details?: Array<{
        sample_id: string;
        comments?: Array<{ participant_id: string; nose?: { tier1_tags?: string[] } }>;
        per_participant_radar?: Array<{ participant_id: string; tier1_counts: Record<string, number> }>;
        radar?: { tier1_counts: Record<string, number> };
      }>;
    };

    const counts = data.flavor_radar?.tier1_counts || {};
    expect(counts['りんご・洋梨'] ?? 0).toBeGreaterThanOrEqual(6);
    expect(counts['ピート・スモーク'] ?? 0).toBeGreaterThanOrEqual(4);

    const firstSample = data.sample_details?.[0];
    expect(firstSample?.radar?.tier1_counts?.['りんご・洋梨'] ?? 0).toBeGreaterThanOrEqual(3);

    const p1radar = firstSample?.per_participant_radar?.find(
      (r) => r.participant_id === participant1.participantId,
    );
    expect(p1radar?.tier1_counts['りんご・洋梨'] ?? 0).toBeGreaterThanOrEqual(3);

    const p2radar = firstSample?.per_participant_radar?.find(
      (r) => r.participant_id === participant2.participantId,
    );
    expect(p2radar?.tier1_counts['ピート・スモーク'] ?? 0).toBeGreaterThanOrEqual(2);

    const p1comment = firstSample?.comments?.find((c) => c.participant_id === participant1.participantId);
    expect(p1comment?.nose?.tier1_tags).toContain('りんご・洋梨');
  });

  test('単独プレゼンター: Presenterパネルで Nose Tier1 を保存すると公開結果のナイチンゲール・ローズに反映される', async ({
    page,
  }, testInfo) => {
    const helpers = new TestHelpers(page);
    const result = await helpers.createEvent('フレーダーPresenterパネルE2E', 'sequential');
    const joinToken = result.joinToken!;
    const ownerToken = result.ownerToken!;

    const presenter = await helpers.createMockParticipant(joinToken, '単独プレゼンター', 1, ['Sample A']);

    await helpers.waitForParticipantsToAppear(ownerToken);
    await page.waitForTimeout(2000);
    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);
    await page.waitForTimeout(2000);

    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const samples = samplesResult?.data?.samples || [];
    if (!samples.length) throw new Error('サンプルがありません');

    const sampleId = samples[0].id as string;
    await helpers.startRound(joinToken, sampleId, presenter.participantToken);

    await helpers.submitAnswer(joinToken, sampleId, presenter.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 12,
      guessed_abv: 43,
      guessed_distillery: 'マッカラン',
    });

    await helpers.submitTruth(joinToken, sampleId, presenter.participantToken, {
      true_cask: 'シェリー樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43,
      true_distillery: 'マッカラン',
    });

    await helpers.savePresenterNoseTier1ViaPresenterPanel(
      joinToken,
      sampleId,
      presenter.participantToken,
      'りんご・洋梨',
      4000,
    );

    await helpers.finishRound(joinToken, sampleId, presenter.participantToken);

    await page.request.post('/api/round-result/click-next', {
      data: { participant_token: presenter.participantToken, sample_id: sampleId },
    });
    const startLast = await page.request.post('/api/round-result/start-next', {
      data: { participant_token: presenter.participantToken, sample_id: sampleId },
    });
    if (!startLast.ok()) {
      const err = await startLast.json().catch(() => ({}));
      throw new Error(`start-next: ${(err as { error?: string })?.error || startLast.status()}`);
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
    await helpers.publishResults(ownerToken);

    const apiRes = await page.request.get(`/api/results/get?join_token=${joinToken}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiJson = await apiRes.json();
    const data = apiJson.data as {
      flavor_radar?: { tier1_counts: Record<string, number> };
      sample_details?: Array<{
        sample_id: string;
        radar?: { tier1_counts: Record<string, number> };
        per_participant_radar?: Array<{ participant_id: string; tier1_counts: Record<string, number> }>;
      }>;
    };

    const chartPayload = {
      aggregate_tier1_counts: data.flavor_radar?.tier1_counts ?? {},
      sample_radar: data.sample_details?.[0]?.radar?.tier1_counts ?? {},
    };
    await testInfo.attach('flavor-chart-tier1-counts.json', {
      body: JSON.stringify(chartPayload, null, 2),
      contentType: 'application/json',
    });
    console.log('[E2E flavor chart]', JSON.stringify(chartPayload, null, 2));

    const ft = data.flavor_radar?.tier1_counts?.['りんご・洋梨'] ?? 0;
    expect(ft).toBeGreaterThanOrEqual(3);

    const sampleFt = data.sample_details?.[0]?.radar?.tier1_counts?.['りんご・洋梨'] ?? 0;
    expect(sampleFt).toBeGreaterThanOrEqual(3);

    const selfRadar = data.sample_details?.[0]?.per_participant_radar?.find(
      (r) => r.participant_id === presenter.participantId,
    );
    expect(selfRadar?.tier1_counts['りんご・洋梨'] ?? 0).toBeGreaterThanOrEqual(3);

    await page.goto(`/session/${joinToken}/results`);
    await page.evaluate(
      ({ token, jt }) => {
        localStorage.setItem(`bd:participant_token:${jt}`, token);
      },
      { token: presenter.participantToken, jt: joinToken },
    );
    await page.reload();
    await page.getByRole('button', { name: '詳細' }).click();
    await page
      .getByText('プレゼンターが Presenter パネルで入力したテイスティングのみを表示しています')
      .first()
      .waitFor({ timeout: 30000 });
    await expect(
      page.getByRole('heading', { level: 4, name: /フレーバー・ナイチンゲール・ローズ・チャート/ }).first(),
    ).toBeVisible();
    const chartCard = page
      .locator('.ui-card')
      .filter({ hasText: 'プレゼンターが Presenter パネルで入力したテイスティングのみ' })
      .first();
    await testInfo.attach('flavor-chart-screenshot.png', {
      body: await chartCard.screenshot(),
      contentType: 'image/png',
    });
  });

  test('Round回答画面: サイレントポーリング後の提出でもフレーバーがナイチンゲール・ローズに反映される（参加者向け退行防止）', async ({
    page,
  }) => {
    const helpers = new TestHelpers(page);
    const result = await helpers.createEvent('フレーダーRoundポーリングE2E', 'sequential');
    const joinToken = result.joinToken!;
    const ownerToken = result.ownerToken!;
    const participant = await helpers.createMockParticipant(joinToken, 'Roundテスター', 1, ['Sample A']);

    await helpers.waitForParticipantsToAppear(ownerToken);
    await page.waitForTimeout(2000);
    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);
    await page.waitForTimeout(2000);

    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const samples = samplesResult?.data?.samples || [];
    if (!samples.length) throw new Error('サンプルがありません');
    const sampleId = samples[0].id as string;

    await helpers.startRound(joinToken, sampleId, participant.participantToken);

    await helpers.submitAnswerWithNoseTier1AfterPoll(
      joinToken,
      sampleId,
      participant.participantToken,
      {
        guessed_cask: 'シェリー樽',
        guessed_region: 'スコットランド（スペイサイド）',
        guessed_age: 12,
        guessed_abv: 43,
        guessed_distillery: 'マッカラン',
      },
      'りんご・洋梨',
      4000,
    );

    await helpers.submitTruth(joinToken, sampleId, participant.participantToken, {
      true_cask: 'シェリー樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43,
      true_distillery: 'マッカラン',
    });

    await helpers.finishRound(joinToken, sampleId, participant.participantToken);

    await page.request.post('/api/round-result/click-next', {
      data: { participant_token: participant.participantToken, sample_id: sampleId },
    });
    const startLast = await page.request.post('/api/round-result/start-next', {
      data: { participant_token: participant.participantToken, sample_id: sampleId },
    });
    expect(startLast.ok()).toBeTruthy();

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
    await helpers.publishResults(ownerToken);

    const apiRes = await page.request.get(`/api/results/get?join_token=${joinToken}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiJson = await apiRes.json();
    const data = apiJson.data as { flavor_radar?: { tier1_counts: Record<string, number> } };
    expect(data.flavor_radar?.tier1_counts?.['りんご・洋梨'] ?? 0).toBeGreaterThanOrEqual(3);
  });
});
