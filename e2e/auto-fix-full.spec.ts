import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';
import { AutoFix } from './auto-fix';

/**
 * 完全な自動修正テスト
 * アプリケーション全体をテストして、エラーを自動検出・修正
 */
test.describe('Auto Fix Full Test', () => {
  test.setTimeout(120000); // 2分に設定
  
  test('全フローをテストしてエラーを自動修正', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const autoFix = new AutoFix(page);
    
    // エラーを監視
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const ignored =
          text.includes('ERR_CONNECTION_REFUSED') ||
          text.includes('Failed to load resource') ||
          text.includes('Failed to fetch');
        if (!ignored) {
          errors.push(text);
        }
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    try {
      // 1. イベント作成
      const result = await helpers.createEvent('自動修正テスト', 'sequential');
      const { ownerToken, joinToken } = result;
      
      // エラーチェック（エラーが検出された場合のみ）
      if (errors.length > 0) {
        console.log(`[AutoFix] Detected ${errors.length} error(s) during event creation`);
        const fixResult = await autoFix.detectAndFix();
        if (fixResult.fixed) {
          console.log('[AutoFix] Fixed error during event creation');
          await autoFix.verifyFix();
        }
      }

      // 2. 参加登録
      const p1 = await helpers.joinSession(joinToken!, 'テスト参加者', 1, ['Sample A']);
      const participantToken = p1.participantToken!;
      
      // エラーチェック
      if (errors.length > 0) {
        const fixResult = await autoFix.detectAndFix();
        if (fixResult.fixed) {
          console.log('[AutoFix] Fixed error during participant registration');
          await autoFix.verifyFix();
        }
      }

      // 3. 参加登録締切とSession開始
      await helpers.closeRegistration(ownerToken!);
      await helpers.startSession(ownerToken!, joinToken!);
      
      // エラーチェック
      if (errors.length > 0) {
        const fixResult = await autoFix.detectAndFix();
        if (fixResult.fixed) {
          console.log('[AutoFix] Fixed error during session start');
          await autoFix.verifyFix();
        }
      }

      // 4. Round開始
      const sampleId = await helpers.getSampleIdForPresenter(ownerToken!);
      
      if (sampleId) {
        await helpers.startRound(joinToken!, sampleId, participantToken);
        
        // エラーチェック
        if (errors.length > 0) {
          const fixResult = await autoFix.detectAndFix();
          if (fixResult.fixed) {
            console.log('[AutoFix] Fixed error during round start');
            await autoFix.verifyFix();
          }
        }

        // 5. 回答提出
        await helpers.submitAnswer(joinToken!, sampleId, participantToken, {
          age: 12,
          abv: 43,
          distillery: 'テスト蒸留所',
        });
        
        // エラーチェック
        if (errors.length > 0) {
          const fixResult = await autoFix.detectAndFix();
          if (fixResult.fixed) {
            console.log('[AutoFix] Fixed error during answer submission');
            await autoFix.verifyFix();
          }
        }

        // 6. Truth入力
        await helpers.submitTruth(joinToken!, sampleId, participantToken, {
          age: 12,
          abv: 43,
          distillery: 'テスト蒸留所',
        });
        
        // エラーチェック
        if (errors.length > 0) {
          const fixResult = await autoFix.detectAndFix();
          if (fixResult.fixed) {
            console.log('[AutoFix] Fixed error during truth submission');
            await autoFix.verifyFix();
          }
        }
      }

      // 最終的なエラーチェック
      const finalErrors = await page.locator('text=/エラー|error|Error|サーバーエラー/').count();
      if (finalErrors > 0 || errors.length > 0) {
        const fixResult = await autoFix.detectAndFix();
        if (!fixResult.fixed) {
          // 修正できなかったエラーを記録
          console.error('[AutoFix] Could not fix errors:', errors);
          console.error('[AutoFix] Fix result:', fixResult);
          
          // スクリーンショットを取得
          await page.screenshot({ path: 'e2e/screenshots/auto-fix-failed.png', fullPage: true });
        }
      }

      // すべてのエラーが修正されたことを確認
      expect(finalErrors).toBe(0);
      expect(errors.length).toBe(0);
    } catch (error) {
      // エラーが発生した場合、自動修正を試みる
      const fixResult = await autoFix.detectAndFix();
      console.error('[AutoFix] Error during test execution:', error);
      console.error('[AutoFix] Fix attempt result:', fixResult);
      
      // スクリーンショットを取得
      await page.screenshot({ path: 'e2e/screenshots/auto-fix-exception.png', fullPage: true });
      
      throw error;
    }
  });
});
