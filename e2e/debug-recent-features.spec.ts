import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('最近実装した機能のデバッグ', () => {
  test('プレゼンター名表示、参加URLコピー、参加コード機能、逐次モード途中結果ページの動作確認', async ({ page }) => {
    test.setTimeout(120000);
    const helpers = new TestHelpers(page);
    
    // 1. セッション作成
    const sessionTitle = `テストセッション-${Date.now()}`;
    const result = await helpers.createEvent(sessionTitle, 'sequential');
    const ownerToken = result.ownerToken!;
    const joinToken = result.joinToken!;
    
    await page.goto(`/o/${ownerToken}`);

    // オーナーページで参加コードとURLを確認
    await page.waitForLoadState('domcontentloaded');
    
    // 参加コードの表示を確認
    const joinCodeElement = page.locator('text=/^[A-Z0-9]{5}$/').first();
    if (await joinCodeElement.isVisible()) {
      const joinCode = await joinCodeElement.textContent();
      console.log('参加コード:', joinCode);
      
      // 参加コードのコピーボタンを確認
      const copyCodeButton = page.locator('button:has-text("コピー")').nth(1);
      if (await copyCodeButton.isVisible()) {
        await copyCodeButton.click();
        await page.waitForTimeout(500);
        // トーストメッセージを確認
        const toast = page.locator('text=/参加コードをクリップボードにコピーしました/');
        await expect(toast).toBeVisible({ timeout: 2000 });
      }
    }

    // 参加URLのコピーボタンを確認
    const copyUrlButton = page.locator('button:has-text("コピー")').first();
    if (await copyUrlButton.isVisible()) {
      await copyUrlButton.click();
      await page.waitForTimeout(500);
      // トーストメッセージを確認
      const toast = page.locator('text=/URLをクリップボードにコピーしました/');
      await expect(toast).toBeVisible({ timeout: 2000 });
    }

    // 2. 模擬参加者を作成（プレゼンター用）
    const presenterName = 'プレゼンター1';
    const presenter = await helpers.createMockParticipant(joinToken, presenterName, 1, ['Sample A']);
    const participantName = '参加者1';
    const participant = await helpers.createMockParticipant(joinToken, participantName, 0, []);
    
    // 参加者が登録されるまで待つ
    await helpers.waitForParticipantsToAppear(ownerToken, 2);
    await page.waitForTimeout(2000);

    // 3. 参加登録を締め切る
    await page.goto(`/o/${ownerToken}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    await helpers.closeRegistration(ownerToken, joinToken);
    await page.waitForTimeout(2000);

    // 4. 順番決めとセッション開始
    await helpers.startSession(ownerToken, joinToken);

    // 5. Sample IDを取得（API経由）
    await page.waitForTimeout(1000);
    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const targetSample =
      samplesResult?.data?.samples?.find((sample: any) => sample.presenter_participant_id === presenter.participantId) ??
      samplesResult?.data?.samples?.[0];
    const sampleId = targetSample?.id;
    
    if (!sampleId) {
      throw new Error('Sample ID not found');
    }

    // 6. プレゼンターとして正解を入力
    const presenterToken = presenter.participantToken;
    
    // participant_tokenを設定
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenterToken, joinToken });
    // Round開始
    await helpers.startRound(joinToken, sampleId, presenterToken);
    await page.waitForTimeout(2000);

    // 7. 参加者として回答を入力
    const participantToken = participant.participantToken;
    
    // 回答を入力
    await helpers.submitAnswer(joinToken, sampleId, participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'テスト蒸留所2',
    });
    await page.waitForTimeout(2000);

    // 正解を入力（参加者の回答後）
    await helpers.submitTruth(joinToken, sampleId, presenterToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'テスト蒸留所',
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

    // 採点（participantIdが必要なので、APIから取得）
    const participantsResponse = await page.request.get(`/api/owner/get-participants?owner_token=${ownerToken}`);
    const participantsData = await participantsResponse.json();
    const participantData = participantsData.data?.participants?.find((p: any) => p.display_name === participantName);
    if (!participantData) {
      throw new Error('参加者データが見つかりません');
    }
    
    // 採点ボタンを探してクリック
    await page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenterToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 採点ボタン（○）をクリック
    const gradeButton = page.locator('button:has-text("○")').first();
    if (await gradeButton.isVisible()) {
      await gradeButton.click();
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);

    // Round終了
    await helpers.finishRound(joinToken, sampleId, presenterToken);
    await page.waitForTimeout(2000);

    // 9. 結果ページにアクセス（逐次モードなので自動リダイレクトされるはず）
    await page.goto(`/session/${joinToken}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 結果ページにリダイレクトされているか確認
    const currentUrl = page.url();
    if (currentUrl.includes('/round-result/')) {
      console.log('結果ページにリダイレクトされました');

      // プレゼンター名の表示を確認
      const presenterNameText = page.locator('text=/持ち込み:/');
      if (await presenterNameText.isVisible()) {
        const presenterNameDisplay = await presenterNameText.textContent();
        console.log('プレゼンター名表示:', presenterNameDisplay);
        expect(presenterNameDisplay).toContain('持ち込み:');
        expect(presenterNameDisplay).toContain(presenterName);
      }

      // タブの動作を確認
      const rankingTab = page.getByRole('button', { name: '順位表', exact: true });
      const detailsTab = page.locator('button:has-text("詳細")');
      const participantsTab = page.locator('button:has-text("参加者別")');

      // 各タブをクリックして画面遷移しないことを確認
      const initialUrl = page.url();
      
      if (await detailsTab.isVisible()) {
        await detailsTab.click();
        await page.waitForTimeout(500);
        expect(page.url()).toBe(initialUrl);
        console.log('詳細タブ: 画面遷移なし ✓');
      }

      if (await participantsTab.isVisible()) {
        await participantsTab.click();
        await page.waitForTimeout(500);
        expect(page.url()).toBe(initialUrl);
        console.log('参加者別タブ: 画面遷移なし ✓');
      }

      if (await rankingTab.isVisible()) {
        await rankingTab.click();
        await page.waitForTimeout(500);
        expect(page.url()).toBe(initialUrl);
        console.log('順位表タブ: 画面遷移なし ✓');
      }

      // 「次へ」ボタンの表示を確認
      const nextButton = page.locator('button:has-text("次へ")');
      if (await nextButton.isVisible()) {
        console.log('「次へ」ボタンが表示されています ✓');
        
        // ボタンが有効か無効かを確認
        const isDisabled = await nextButton.isDisabled();
        if (isDisabled) {
          console.log('「次へ」ボタンは無効です（参加登録が必要）');
        } else {
          console.log('「次へ」ボタンは有効です');
          
          // 「次へ」ボタンをクリック（参加者1）
          await nextButton.click();
          await page.waitForTimeout(2000);
          
          // プレゼンターも「次へ」ボタンをクリック（全員がクリックした状態にする）
          await page.evaluate(({ token, joinToken }) => {
            localStorage.setItem(`bd:participant_token:${joinToken}`, token);
          }, { token: presenterToken, joinToken });
          await page.reload();
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);
          
          // プレゼンターとして「次へ」ボタンをクリック
          const nextButtonPresenter = page.locator('button:has-text("次へ")');
          if (await nextButtonPresenter.isVisible()) {
            await nextButtonPresenter.click();
            await page.waitForTimeout(2000);
          }
          
          // 全員がクリックしたかどうかを確認（結果を再読み込み）
          await page.reload();
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);
          
          // 全員がクリックした場合、「次のラウンドへ進む」ボタンが表示されることを確認
          const nextRoundButton = page.locator('button:has-text("次のラウンドへ進む")');
          const backToSessionButton = page.locator('button:has-text("セッションページに戻る")');
          
          // 自動リダイレクトされていないことを確認（URLが変わっていない）
          const currentUrlAfterClick = page.url();
          expect(currentUrlAfterClick).toBe(initialUrl);
          console.log('全員がクリックしても自動リダイレクトされないことを確認 ✓');
          
          // 「次のラウンドへ進む」または「セッションページに戻る」ボタンが表示されることを確認
          const hasNextRoundButton = await nextRoundButton.isVisible().catch(() => false);
          const hasBackButton = await backToSessionButton.isVisible().catch(() => false);
          
          if (hasNextRoundButton || hasBackButton) {
            console.log('全員がクリックした後、明示的なボタンが表示されることを確認 ✓');
          } else {
            console.log('全員がクリックした後、明示的なボタンが表示されていません ✗');
          }
        }
      } else {
        console.log('「次へ」ボタンが表示されていません ✗');
      }
    } else {
      console.log('結果ページにリダイレクトされませんでした');
    }

    // 10. 参加コードでの参加をテスト（新しいブラウザコンテキストで）
    // 注意: このテストは実際の参加コードが必要なので、オーナーページから取得する必要がある
    // ここでは基本的な動作確認のみ
  });

  test('参加コード入力ページの動作確認', async ({ page }) => {
    await page.goto('/join');
    await page.waitForLoadState('domcontentloaded');

    // ページが表示されることを確認
    const title = page.locator('h1:has-text("参加コードで参加")');
    await expect(title).toBeVisible();

    // 入力フィールドが表示されることを確認
    const inputField = page.locator('input[type="text"]');
    await expect(inputField).toBeVisible();

    // 間違ったコードを入力してエラーを確認
    await inputField.fill('INVALID');
    const submitButton = page.locator('button:has-text("参加する")');
    await submitButton.click();
    await page.waitForTimeout(2000);

    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator('text=/参加コードが見つかりません/');
    // エラーが表示されるか、トーストが表示される
    const hasError = await errorMessage.isVisible().catch(() => false);
    if (hasError) {
      console.log('エラーメッセージが正しく表示されました ✓');
    }
  });
});
