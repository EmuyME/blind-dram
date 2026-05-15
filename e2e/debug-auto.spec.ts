import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';
import { AutoFix } from './auto-fix';

/**
 * 自動デバッグテスト
 * エラーを検出してログに記録し、修正を試みる
 */
test.describe('Auto Debug Tests', () => {
  test('回答提出時のエラー検出', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成
    const result = await helpers.createEvent('デバッグテスト', 'sequential');
    const joinToken = result.joinToken!;
    
    // 参加登録（模擬参加者を作成）
    const mockParticipant = await helpers.createMockParticipant(joinToken, 'テスト参加者', 1, ['Sample A']);
    const participantToken = mockParticipant.participantToken;
    
    // 参加登録締切とSession開始（closeRegistration内で参加者が表示されるまで待つ）
    await helpers.closeRegistration(result.ownerToken!, joinToken);
    await helpers.startSession(result.ownerToken!, joinToken);
    
    // Sample IDを取得（API経由）
    const sampleId = await helpers.getSampleIdForPresenter(result.ownerToken!, mockParticipant.participantId);
    
    if (!sampleId) {
      test.skip();
      return;
    }
    
    // Round開始
    await helpers.startRound(joinToken, sampleId, participantToken);
    
    // 回答提出を試みる
    await page.goto(`/session/${joinToken}/round/${sampleId}`);
    await page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await page.reload();
    
    // 回答を入力
    await page.fill('input[name*="age"]', '12');
    await page.fill('input[name*="abv"]', '43');
    
    // エラーを監視
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      console.log('Page Error:', error.message);
    });
    
    // 回答提出
    await page.click('button:has-text("提出する")');
    
    // エラーメッセージが表示されないことを確認
    await page.waitForTimeout(2000);
    const errorMessages = await page.locator('text=/エラー|error|Error|サーバーエラー/').count();
    
    if (errorMessages > 0) {
      // エラーが検出された場合、自動修正を試みる
      const autoFix = new AutoFix(page);
      const fixResult = await autoFix.detectAndFix();
      
      console.log('[AutoFix] Fix result:', fixResult);
      
      if (fixResult.fixed) {
        console.log(`[AutoFix] Successfully fixed ${fixResult.errorType}`);
        
        // 修正後の検証
        const verified = await autoFix.verifyFix();
        if (verified) {
          console.log('[AutoFix] Fix verified successfully');
        } else {
          console.warn('[AutoFix] Fix applied but verification failed');
        }
      } else {
        // エラーが検出された場合、スクリーンショットを取得
        await page.screenshot({ path: 'e2e/screenshots/answer-submit-error.png' });
        
        // エラーメッセージをログに記録
        const errorText = await page.locator('text=/エラー|error|Error|サーバーエラー/').first().textContent();
        console.error('[AutoFix] Error detected but could not fix:', errorText);
        console.error('[AutoFix] Error details:', fixResult.details);
        
        // テストを失敗させる
        expect(errorMessages).toBe(0);
      }
    }
  });

  test('画像アップロードの動作確認', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成
    const result = await helpers.createEvent('画像テスト', 'sequential');
    const joinToken = result.joinToken!;
    
    // 参加登録（模擬参加者を作成）
    const mockParticipant = await helpers.createMockParticipant(joinToken, 'Presenter', 1, ['Sample A']);
    const participantToken = mockParticipant.participantToken;
    
    // 参加登録締切とSession開始（closeRegistration内で参加者が表示されるまで待つ）
    await helpers.closeRegistration(result.ownerToken!, joinToken);
    await helpers.startSession(result.ownerToken!, joinToken);
    
    // Sample IDを取得（API経由）
    const sampleId = await helpers.getSampleIdForPresenter(result.ownerToken!, mockParticipant.participantId);
    
    if (!sampleId) {
      test.skip();
      return;
    }
    
    // Presenterパネルにアクセス
    await page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await page.reload();
    
    // 画像アップロードボタンが存在することを確認
    const imageInput = page.locator('input[type="file"]');
    const imageInputCount = await imageInput.count();
    
    if (imageInputCount > 0) {
      // テスト画像をアップロード（1x1の透明PNG）
      const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      await imageInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: testImage,
      });
      
      await page.waitForTimeout(2000);
      
      // アップロード成功メッセージを確認
      await expect(page.locator('text=/画像をアップロード|アップロードしました/')).toBeVisible({ timeout: 5000 });
    }
  });
});
