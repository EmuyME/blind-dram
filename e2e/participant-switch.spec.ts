import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 仕様/UX: 参加者は「参加者を変更する」で参加登録画面へ戻れ、トークンがクリアされる
 */
test.describe('参加者を変更する', () => {
  test('トークンがクリアされ /s/[joinToken] に戻れる', async ({ page }) => {
    test.setTimeout(120000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`switch-${Date.now()}`, 'sequential');
    const joinToken = created.joinToken!;

    // 実際に join して localStorage に token を持たせる
    const joined = await helpers.joinSession(joinToken, 'User1', 0, []);
    expect(joined.participantToken).toBeTruthy();

    await page.goto(`/session/${joinToken}`);
    await page.waitForLoadState('domcontentloaded');

    await page.click('button:has-text("参加者を変更する")');
    await expect(page).toHaveURL(new RegExp(`/s/${joinToken}`), { timeout: 30000 });

    // localStorage key が消えていること
    const tokenAfter = await page.evaluate((jt) => localStorage.getItem(`bd:participant_token:${jt}`), joinToken);
    expect(tokenAfter).toBeNull();
  });
});

