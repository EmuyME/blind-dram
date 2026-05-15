import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * タブ／ブラウザを閉じたのと同義になりやすい「フルリロード」後も、
 * localStorage 上のトークンとオーナーURLで復帰できることのスモークテスト。
 */
test.describe('セッション復帰（リロード相当）', () => {
  test('参加者は participant_token 保持のままセッションホームに戻れる', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const label = `復帰E2E-${Date.now()}`;
    const { joinToken } = await helpers.createEvent(label, 'sequential');
    expect(joinToken).toBeTruthy();

    await helpers.joinSession(joinToken!, '復帰太郎', 0, []);

    await expect(page.locator('text=復帰太郎').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: label })).toBeVisible();

    const tokenBefore = await page.evaluate(
      (jt) => localStorage.getItem(`bd:participant_token:${jt}`),
      joinToken,
    );
    expect(tokenBefore).toBeTruthy();

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=参加登録が必要です')).toHaveCount(0);
    await expect(page.locator('text=復帰太郎').first()).toBeVisible({ timeout: 20000 });

    const tokenAfter = await page.evaluate(
      (jt) => localStorage.getItem(`bd:participant_token:${jt}`),
      joinToken,
    );
    expect(tokenAfter).toBe(tokenBefore);
  });

  test('オーナーは /o/[ownerToken] のみ（クエリなし）でもリロード後にセッション表示に復帰できる', async ({
    page,
  }) => {
    const helpers = new TestHelpers(page);
    const label = `オーナー復帰E2E-${Date.now()}`;
    const { ownerToken, joinToken } = await helpers.createEvent(label, 'sequential');
    expect(ownerToken).toBeTruthy();
    expect(joinToken).toBeTruthy();

    await page.goto(`/o/${ownerToken}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: label })).toBeVisible({ timeout: 25000 });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: label })).toBeVisible({ timeout: 25000 });
  });
});
