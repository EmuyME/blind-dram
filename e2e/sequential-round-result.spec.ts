import { test, expect, type Page } from '@playwright/test';
import { TestHelpers } from './helpers';

/** 手採点（蒸留所）を API で済ませてから Round 終了ボタンを押す */
async function gradeDistilleryAndFinishRound(
  page: Page,
  helpers: TestHelpers,
  joinToken: string,
  sampleId: string,
  presenterToken: string,
  grades: { participantId: string; correct: boolean }[],
) {
  for (const g of grades) {
    await helpers.postDistilleryGrade(presenterToken, sampleId, g.participantId, g.correct);
  }
  await page.goto(`/session/${joinToken}/presenter/${sampleId}`);
  await page.evaluate(({ token, jt }) => {
    localStorage.setItem(`bd:participant_token:${jt}`, token);
  }, { token: presenterToken, jt: joinToken });
  await page.reload();
  await page.waitForTimeout(2000);
  const finishBtn = page.locator('button:has-text("Roundを終了する")').filter({ hasNotText: '採点未完了' });
  await awaitFinishRoundButtonEnabled(page, finishBtn);
  const finishResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/api/round/finish') &&
      res.request().method() === 'POST' &&
      res.ok(),
    { timeout: 30000 },
  );
  await finishBtn.click();
  await finishResponsePromise;
  await page.waitForTimeout(1500);
}

async function awaitFinishRoundButtonEnabled(
  page: Page,
  finishBtn: ReturnType<Page['locator']>,
  timeoutMs = 30000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await finishBtn.isEnabled().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Round終了ボタンが有効になりませんでした（採点未完了のまま）');
}

const openOwnerPanelAndStartSession = async (helpers: TestHelpers, ownerToken: string, joinToken: string) => {
  await helpers.startSession(ownerToken, joinToken);
};

const getSampleIdForPresenter = async (
  page: any,
  ownerToken: string,
  presenterId?: string
) => {
  const samplesResponse = await page.request.get(
    `/api/owner/get-samples?owner_token=${ownerToken}`
  );
  const samplesResult = await samplesResponse.json();
  const targetSample =
    (presenterId
      ? samplesResult?.data?.samples?.find((sample: any) => sample.presenter_participant_id === presenterId)
      : null) ?? samplesResult?.data?.samples?.[0];
  return targetSample?.id as string | undefined;
};

/**
 * 逐次モードのラウンド結果表示機能のテスト
 */
test.describe('Sequential Round Result Tests', () => {
  test('ラウンド終了時に結果ページにリダイレクトされる', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成（逐次モード）
    const result = await helpers.createEvent('逐次モードテスト', 'sequential');
    const joinToken = result.joinToken!;
    
    // 模擬参加者を2人作成
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    // 参加登録締切とSession開始
    await helpers.closeRegistration(result.ownerToken!, result.joinToken!);
    await openOwnerPanelAndStartSession(helpers, result.ownerToken!, joinToken);
    
    // Sample IDを取得
    const sampleId = await getSampleIdForPresenter(page, result.ownerToken!, participant1.participantId);
    
    if (!sampleId) {
      test.skip();
      return;
    }
    
    // Round開始
    await helpers.startRound(joinToken, sampleId, participant1.participantToken);
    
    // 参加者1が回答提出
    await helpers.submitAnswer(joinToken, sampleId, participant1.participantToken, {
      cask: 'シェリー樽',
      region: 'スコットランド（スペイサイド）',
      age: 12,
      abv: 43,
      distillery: 'マッカラン',
    });
    
    // 参加者2が回答提出
    await helpers.submitAnswer(joinToken, sampleId, participant2.participantToken, {
      cask: 'バーボン樽',
      region: '日本',
      age: 15,
      abv: 40,
      distillery: '山崎',
    });
    
    // PresenterがTruth入力
    await helpers.submitTruth(joinToken, sampleId, participant1.participantToken, {
      cask: 'シェリー樽',
      region: 'スコットランド（スペイサイド）',
      age: 12,
      abv: 43,
      distillery: 'マッカラン',
    });
    
    await gradeDistilleryAndFinishRound(page, helpers, joinToken, sampleId, participant1.participantToken, [
      { participantId: participant1.participantId, correct: true },
      { participantId: participant2.participantId, correct: false },
    ]);
    
    // トークンを先に保存してからセッションホームへ（初回ロードから round/status をマージできるようにする）
    await page.goto('/');
    await page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participant1.participantToken, jt: joinToken });
    await page.goto(`/session/${joinToken}`);
    await page.waitForURL(new RegExp(`/session/${joinToken}/round-result/${sampleId}`), { timeout: 30000 });
  });

  test('結果ページが正しく表示される', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成とラウンド終了までの準備（前のテストと同様）
    const result = await helpers.createEvent('結果表示テスト', 'sequential');
    const joinToken = result.joinToken!;
    
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    await helpers.closeRegistration(result.ownerToken!, result.joinToken!);
    await openOwnerPanelAndStartSession(helpers, result.ownerToken!, joinToken);
    
    const sampleId = await getSampleIdForPresenter(page, result.ownerToken!, participant1.participantId);
    
    if (!sampleId) {
      test.skip();
      return;
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
    
    await gradeDistilleryAndFinishRound(page, helpers, joinToken, sampleId, participant1.participantToken, [
      { participantId: participant1.participantId, correct: true },
      { participantId: participant2.participantId, correct: false },
    ]);
    
    // 結果ページに直接アクセス
    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participant1.participantToken, jt: joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 順位表が表示されることを確認
    await expect(page.getByRole('button', { name: '順位表', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '現段階での順位表' })).toBeVisible();
    
    // 詳細タブが表示されることを確認
    await page.click('button:has-text("詳細")');
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /Sample/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '正解' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '参加者の回答' })).toBeVisible();
    
    // 参加者別タブが表示されることを確認
    await page.click('button:has-text("参加者")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=参加者選択')).toBeVisible();
  });

  test('「次へ」ボタンが機能する', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成とラウンド終了までの準備
    const result = await helpers.createEvent('次へボタンテスト', 'sequential');
    const joinToken = result.joinToken!;
    
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    await helpers.closeRegistration(result.ownerToken!, result.joinToken!);
    await openOwnerPanelAndStartSession(helpers, result.ownerToken!, joinToken);
    
    const sampleId = await getSampleIdForPresenter(page, result.ownerToken!, participant1.participantId);
    
    if (!sampleId) {
      test.skip();
      return;
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
    
    await gradeDistilleryAndFinishRound(page, helpers, joinToken, sampleId, participant1.participantToken, [
      { participantId: participant1.participantId, correct: true },
      { participantId: participant2.participantId, correct: false },
    ]);
    
    // 結果ページにアクセス
    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participant1.participantToken, jt: joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 「次へ」ボタンが表示されることを確認
    const nextButton = page.locator('button:has-text("次へ")');
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    
    // 「次へ」ボタンをクリック
    await nextButton.click();
    await page.waitForTimeout(2000);
    
    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=/次へ.*押しました|他の参加者を待っています/')).toBeVisible({ timeout: 5000 });
  });

  test('一斉モードでは結果ページにリダイレクトされない', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成（一斉モード）
    const result = await helpers.createEvent('一斉モードテスト', 'simultaneous');
    const joinToken = result.joinToken!;
    
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 1, ['Sample A']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    await helpers.closeRegistration(result.ownerToken!, result.joinToken!);
    await openOwnerPanelAndStartSession(helpers, result.ownerToken!, joinToken);
    
    const sampleId = await getSampleIdForPresenter(page, result.ownerToken!, participant1.participantId);
    
    if (!sampleId) {
      test.skip();
      return;
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
    
    await gradeDistilleryAndFinishRound(page, helpers, joinToken, sampleId, participant1.participantToken, [
      { participantId: participant1.participantId, correct: true },
      { participantId: participant2.participantId, correct: false },
    ]);
    
    // セッションページにアクセス（一斉モードでは結果ページにリダイレクトされない）
    await page.goto(`/session/${joinToken}`);
    await page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participant1.participantToken, jt: joinToken });
    await page.reload();
    await page.waitForTimeout(3000);
    
    // 結果ページにリダイレクトされていないことを確認
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/round-result/');
    expect(currentUrl).toContain(`/session/${joinToken}`);
  });
});
