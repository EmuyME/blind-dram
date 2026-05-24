import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 逐次モードと一斉モードの動作確認テスト
 */
test.describe('Sequential and Simultaneous Mode Debug Tests', () => {
  test('逐次モード: ラウンド終了時に結果ページにリダイレクトされる', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成（逐次モード）
    const result = await helpers.createEvent('逐次モードデバッグテスト', 'sequential');
    const joinToken = result.joinToken!;
    
    // 模擬参加者を2人作成
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 2, ['Sample A', 'Sample B']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    // 参加者が登録されるまで待つ
    await helpers.waitForParticipantsToAppear(result.ownerToken!);
    await page.waitForTimeout(2000);
    
    // 参加登録締切とSession開始
    await helpers.closeRegistration(result.ownerToken!, joinToken);
    const startResponse = await page.request.post('/api/owner/start-session', {
      data: { owner_token: result.ownerToken! },
    });
    if (!startResponse.ok()) {
      const startError = await startResponse.json().catch(() => ({}));
      throw new Error(`Session開始に失敗しました: ${startError.error || startResponse.status()}`);
    }
    await page.waitForTimeout(2000);
    
    // Sample IDを取得
    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${result.ownerToken!}`);
    const samplesResult = await samplesResponse.json();
    const targetSample =
      samplesResult?.data?.samples?.find((sample: any) => sample.presenter_participant_id === participant1.participantId) ??
      samplesResult?.data?.samples?.[0];
    const sampleId = targetSample?.id;
    
    if (!sampleId) {
      throw new Error('Sample ID not found');
    }
    
    // Round開始
    await helpers.startRound(joinToken, sampleId, participant1.participantToken);
    
    // 参加者1が回答提出
    await helpers.submitAnswer(joinToken, sampleId, participant1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 12,
      guessed_abv: 43,
      guessed_distillery: 'マッカラン',
    });
    
    // 参加者2が回答提出
    await helpers.submitAnswer(joinToken, sampleId, participant2.participantToken, {
      guessed_cask: 'バーボン樽',
      guessed_region: '日本',
      guessed_age: 15,
      guessed_abv: 40,
      guessed_distillery: '山崎',
    });
    
    // PresenterがTruth入力
    await helpers.submitTruth(joinToken, sampleId, participant1.participantToken, {
      true_cask: 'シェリー樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43,
      true_distillery: 'マッカラン',
    });
    
    // grading状態になるまで待機
    const waitStart = Date.now();
    while (Date.now() - waitStart < 20000) {
      const statusResponse = await page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participant1.participantToken}`
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      if (statusResult?.data?.state === 'grading') {
        break;
      }
      await page.waitForTimeout(1000);
    }

    // 提出者全員分の採点（API）。finish は全提出者に grade 行が必要
    await helpers.postDistilleryGrade(
      participant1.participantToken,
      sampleId,
      participant1.participantId,
      true,
    );
    await helpers.postDistilleryGrade(
      participant1.participantToken,
      sampleId,
      participant2.participantId,
      true,
    );

    // Round終了（API）
    const finishResponse = await page.request.post('/api/round/finish', {
      data: {
        participant_token: participant1.participantToken,
        sample_id: sampleId,
      },
    });
    expect(finishResponse.ok()).toBeTruthy();
    
    // セッションページにアクセス（revealed状態のサンプルがある場合、結果ページにリダイレクトされる）
    await page.goto(`/session/${joinToken}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participant1.participantToken, joinToken });
    await page.reload();
    await page.waitForTimeout(3000);
    
    // 結果ページにリダイレクトされていることを確認
    await expect(page).toHaveURL(new RegExp(`/session/${joinToken}/round-result/${sampleId}`), { timeout: 10000 });
  });

  test('逐次モード: 「次へ」ボタンが機能し、全員がクリックしたら次のラウンドに進む', async ({ page }) => {
    test.setTimeout(180000);
    const helpers = new TestHelpers(page);
    
    // セッション作成とラウンド終了までの準備
    const result = await helpers.createEvent('次へボタンデバッグテスト', 'sequential');
    const joinToken = result.joinToken!;
    
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    // 参加者が登録されるまで待つ
    await helpers.waitForParticipantsToAppear(result.ownerToken!);
    await page.waitForTimeout(2000);
    
    await helpers.closeRegistration(result.ownerToken!, joinToken);
    await page.goto(`/session/${joinToken}`);
    const ownerPanelToggle = page.locator('button:has-text("オーナー機能")').first();
    if (await ownerPanelToggle.isVisible().catch(() => false)) {
      await ownerPanelToggle.click();
    }
    const startResponse = await page.request.post('/api/owner/start-session', {
      data: { owner_token: result.ownerToken! },
    });
    if (!startResponse.ok()) {
      const startError = await startResponse.json().catch(() => ({}));
      throw new Error(`Session開始に失敗しました: ${startError.error || startResponse.status()}`);
    }
    await page.waitForTimeout(2000);
    
    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${result.ownerToken!}`);
    const samplesResult = await samplesResponse.json();
    const targetSample =
      samplesResult?.data?.samples?.find((sample: any) => sample.presenter_participant_id === participant1.participantId) ??
      samplesResult?.data?.samples?.[0];
    const sampleId = targetSample?.id;
    
    if (!sampleId) {
      throw new Error('Sample ID not found');
    }
    
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
    
    // grading状態になるまで待機
    const waitStart = Date.now();
    while (Date.now() - waitStart < 20000) {
      const statusResponse = await page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participant1.participantToken}`
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      if (statusResult?.data?.state === 'grading') {
        break;
      }
      await page.waitForTimeout(1000);
    }

    await helpers.postDistilleryGrade(
      participant1.participantToken,
      sampleId,
      participant1.participantId,
      true,
    );
    await helpers.postDistilleryGrade(
      participant1.participantToken,
      sampleId,
      participant2.participantId,
      true,
    );

    const finishResponse = await page.request.post('/api/round/finish', {
      data: {
        participant_token: participant1.participantToken,
        sample_id: sampleId,
      },
    });
    expect(finishResponse.ok()).toBeTruthy();
    
    // 結果ページにアクセス
    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participant1.participantToken, joinToken });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // 「次へ」ボタンが表示されることを確認
    const nextButton = page.locator('button:has-text("次へ")');
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    
    // 「次へ」ボタンをクリック（参加者1）
    await nextButton.click();
    // トーストは約3秒で消えるため、文言は待ち時間を短く／文言を実装に合わせる
    await expect(
      page.getByText(/他の参加者を待っています|次へ.*押しました/, { exact: false }).first(),
    ).toBeVisible({ timeout: 12000 });
    
    // 参加者1/2のクリックをAPIで確定
    const click1 = await page.request.post('/api/round-result/click-next', {
      data: {
        participant_token: participant1.participantToken,
        sample_id: sampleId,
      },
    });
    expect(click1.ok()).toBeTruthy();

    const click2 = await page.request.post('/api/round-result/click-next', {
      data: {
        participant_token: participant2.participantToken,
        sample_id: sampleId,
      },
    });
    expect(click2.ok()).toBeTruthy();

    // all_clicked を確認してから UI を更新
    let allClicked = false;
    for (let i = 0; i < 5; i++) {
      const resultResponse = await page.request.get(
        `/api/round-result/get?join_token=${joinToken}&sample_id=${sampleId}`
      );
      const resultData = await resultResponse.json().catch(() => ({}));
      allClicked = !!resultData?.data?.all_clicked_next;
      if (allClicked) {
        break;
      }
      await page.waitForTimeout(1000);
    }
    expect(allClicked).toBe(true);

    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participant1.participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const readyButton = page.locator(
      'button:has-text("次のラウンドへ進む"), button:has-text("セッションページに戻る")'
    );
    await expect(readyButton.first()).toBeVisible({ timeout: 20000 });
  });

  test('一斉モード: ラウンド終了時に結果ページにリダイレクトされない', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成（一斉モード）
    const result = await helpers.createEvent('一斉モードデバッグテスト', 'simultaneous');
    const joinToken = result.joinToken!;
    
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    // 参加者が登録されるまで待つ
    await helpers.waitForParticipantsToAppear(result.ownerToken!);
    await page.waitForTimeout(2000);
    
    await helpers.closeRegistration(result.ownerToken!, joinToken);
    await page.goto(`/session/${joinToken}`);
    const ownerPanelToggle = page.locator('button:has-text("オーナー機能")').first();
    if (await ownerPanelToggle.isVisible().catch(() => false)) {
      await ownerPanelToggle.click();
    }
    const startResponse = await page.request.post('/api/owner/start-session', {
      data: { owner_token: result.ownerToken! },
    });
    if (!startResponse.ok()) {
      const startError = await startResponse.json().catch(() => ({}));
      throw new Error(`Session開始に失敗しました: ${startError.error || startResponse.status()}`);
    }
    await page.waitForTimeout(2000);
    
    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${result.ownerToken!}`);
    const samplesResult = await samplesResponse.json();
    const targetSample =
      samplesResult?.data?.samples?.find((sample: any) => sample.presenter_participant_id === participant1.participantId) ??
      samplesResult?.data?.samples?.[0];
    const sampleId = targetSample?.id;
    
    if (!sampleId) {
      throw new Error('Sample ID not found');
    }
    
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
    
    // grading状態になるまで待機
    const waitStart = Date.now();
    while (Date.now() - waitStart < 20000) {
      const statusResponse = await page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participant1.participantToken}`
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      if (statusResult?.data?.state === 'grading') {
        break;
      }
      await page.waitForTimeout(1000);
    }

    await helpers.postDistilleryGrade(
      participant1.participantToken,
      sampleId,
      participant1.participantId,
      true,
    );
    await helpers.postDistilleryGrade(
      participant1.participantToken,
      sampleId,
      participant2.participantId,
      true,
    );

    const finishResponse = await page.request.post('/api/round/finish', {
      data: {
        participant_token: participant1.participantToken,
        sample_id: sampleId,
      },
    });
    expect(finishResponse.ok()).toBeTruthy();
    
    // セッションページにアクセス（一斉モードでは結果ページにリダイレクトされない）
    await page.goto(`/session/${joinToken}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participant1.participantToken, joinToken });
    await page.reload();
    await page.waitForTimeout(3000);
    
    // 結果ページにリダイレクトされていないことを確認
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/round-result/');
    expect(currentUrl).toContain(`/session/${joinToken}`);
  });

  test('一斉モード: 通常の動作が正しく機能する', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成（一斉モード）
    const result = await helpers.createEvent('一斉モード通常動作テスト', 'simultaneous');
    const joinToken = result.joinToken!;
    
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    // 参加者が登録されるまで待つ
    await helpers.waitForParticipantsToAppear(result.ownerToken!);
    await page.waitForTimeout(2000);
    
    await helpers.closeRegistration(result.ownerToken!, joinToken);
    await page.goto(`/session/${joinToken}`);
    const ownerPanelToggle = page.locator('button:has-text("オーナー機能")').first();
    if (await ownerPanelToggle.isVisible().catch(() => false)) {
      await ownerPanelToggle.click();
    }
    const startResponse = await page.request.post('/api/owner/start-session', {
      data: { owner_token: result.ownerToken! },
    });
    if (!startResponse.ok()) {
      const startError = await startResponse.json().catch(() => ({}));
      throw new Error(`Session開始に失敗しました: ${startError.error || startResponse.status()}`);
    }
    await page.waitForTimeout(2000);
    
    // セッションページが正しく表示されることを確認
    await page.goto(`/session/${joinToken}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participant1.participantToken, joinToken });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // セッションページが表示されることを確認
    await expect(page.getByRole('button', { name: /Presenter\s*パネルを開く/ })).toBeVisible({ timeout: 10000 });
  });
});
