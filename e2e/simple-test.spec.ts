import { test, expect } from '@playwright/test';

/**
 * シンプルなテスト
 * 基本的な動作を確認
 */
test.describe('Simple Tests', () => {
  test('トップページが表示される', async ({ page }) => {
    await page.goto('/');
    // ページが読み込まれるまで待つ
    await page.waitForLoadState('domcontentloaded');
    // 何らかの要素が表示されることを確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('イベント作成ページが表示される', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('h1:has-text("新しいイベントを作成")')).toBeVisible();
  });
});
