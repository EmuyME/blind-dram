import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('逐次モード「次へ」ボタンの動作確認', () => {
  test('全員が「次へ」→次ラウンド開始後に自動で次へ進む', async ({ page }) => {
    test.setTimeout(120000);
    const helpers = new TestHelpers(page);
    
    // 1. セッション作成
    const sessionTitle = `テストセッション-${Date.now()}`;
    const result = await helpers.createEvent(sessionTitle, 'sequential');
    const ownerToken = result.ownerToken!;
    const joinToken = result.joinToken!;
    
    // 2. 模擬参加者を3人作成（Presenter2が次ラウンド開始できるように）
    const presenterName = 'プレゼンター1';
    const presenter2Name = 'プレゼンター2';
    const participantName = '参加者1';
    
    const presenter = await helpers.createMockParticipant(joinToken, presenterName, 1, ['Sample A']);
    await page.waitForTimeout(2000);

    const presenter2 = await helpers.createMockParticipant(joinToken, presenter2Name, 1, ['Sample B']);
    await page.waitForTimeout(2000);
    
    const participant = await helpers.createMockParticipant(joinToken, participantName, 0, []);
    await page.waitForTimeout(2000);
    
    // 3. 参加登録を締め切る
    await helpers.closeRegistration(ownerToken, joinToken);
    
    // 4. 順番決めとセッション開始
    await helpers.startSession(ownerToken, joinToken);
    
    // 5. Sample IDを取得（Round1: presenter1）
    const sampleId = await helpers.getSampleIdForPresenter(ownerToken, presenter.participantId);
    // Round2: presenter2
    const sampleId2 = await helpers.getSampleIdForPresenter(ownerToken, presenter2.participantId);
    
    if (!sampleId || !sampleId2) throw new Error('Sample ID not found');
    
    // 6. プレゼンターとして正解を入力
    const presenterToken = presenter.participantToken;
    
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenterToken, joinToken });
    
    // Round開始
    await helpers.startRound(joinToken, sampleId, presenterToken);
    await page.waitForTimeout(2000);
    
    // 正解を入力
    await helpers.submitTruth(joinToken, sampleId, presenterToken, {
      true_cask: 'バーボン',
      true_region: 'スコットランド',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'テスト蒸留所',
    });
    await page.waitForTimeout(2000);
    
    // 7. 参加者として回答を入力（Round1ではPresenter2も回答者になる）
    const participantToken = participant.participantToken;
    
    await helpers.submitAnswer(joinToken, sampleId, participantToken, {
      guessed_cask: 'シェリー',
      guessed_region: 'スコットランド',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'テスト蒸留所2',
    });
    await page.waitForTimeout(2000);

    await helpers.submitAnswer(joinToken, sampleId, presenter2.participantToken, {
      guessed_cask: 'バーボン',
      guessed_region: 'スコットランド',
      guessed_age: 12,
      guessed_abv: 43.0,
      guessed_distillery: 'テスト蒸留所',
    });
    await page.waitForTimeout(2000);
    
    // 8. プレゼンターとして採点とRound終了
    await page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenterToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 採点ボタン（○）をクリック
    const gradeButton = page.locator('button:has-text("○")').first();
    if (await gradeButton.isVisible({ timeout: 5000 })) {
      await gradeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Round終了
    await helpers.finishRound(joinToken, sampleId, presenterToken);
    await page.waitForTimeout(2000);
    
    // 9. 結果ページにアクセス（逐次モードなので自動リダイレクトされるはず）
    // 参加者用ページを別タブで用意（後で自動遷移を検証する）
    const participantPage = await page.context().newPage();
    await participantPage.goto(`/session/${joinToken}`);
    await participantPage.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participantToken, joinToken });
    await participantPage.reload();
    await participantPage.waitForLoadState('domcontentloaded');
    await participantPage.waitForTimeout(3000);
    // 結果ページにリダイレクトされているか確認
    expect(participantPage.url()).toContain('/round-result/');
    console.log('結果ページにリダイレクトされました ✓');

    // Presenter側（page）は Round1 の結果ページに移動して操作を続ける
    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const initialUrl = participantPage.url();
    
    // 「次へ」ボタンの表示を確認
    const nextButton = participantPage.locator('button:has-text("次へ")');
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    console.log('「次へ」ボタンが表示されています ✓');
    
    // 「次へ」ボタンをクリック（参加者1）
    await nextButton.click();
    await participantPage.waitForTimeout(2000);
    
    // 結果を再読み込み
    await participantPage.reload();
    await participantPage.waitForLoadState('domcontentloaded');
    await participantPage.waitForTimeout(2000);
    
    // この時点では全員が押していないので、結果ページに留まる
    const currentUrlAfterClick = participantPage.url();
    expect(currentUrlAfterClick).toBe(initialUrl);
    console.log('1人だけ「次へ」の時点では結果ページに留まる ✓');
    
    // Presenter2 も「次へ」をクリック（Round1の回答者としてカウントされるため）
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenter2.participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("次へ")').click();
    await page.waitForTimeout(2000);

    // Round1のPresenterとしても「次へ」をクリック（これで全員クリック状態になる）
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenterToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("次へ")').click();
    await page.waitForTimeout(2000);

    // Round2 の Presenter に切り替えると「次のラウンドへ進む」ボタンが出るので start-next を実行
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenter2.participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const nextRoundButton = page.locator('button:has-text("次のラウンドへ進む")');
    await expect(nextRoundButton).toBeVisible({ timeout: 30000 });
    await nextRoundButton.click();

    // Presenter2 は presenter 画面へ遷移する
    await expect(page).toHaveURL(new RegExp(`/session/${joinToken}/presenter/`), { timeout: 30000 });

    // 参加者ページは、自動で Round2 の回答画面へ遷移する
    await expect(participantPage).toHaveURL(new RegExp(`/session/${joinToken}/round/${sampleId2}`), { timeout: 30000 });
    console.log('次ラウンド開始後に参加者が自動で次へ進むことを確認 ✓');

    await participantPage.close();
  });
});
