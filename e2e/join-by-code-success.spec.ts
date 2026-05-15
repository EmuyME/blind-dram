import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 仕様: 参加コードで joinToken を引けて参加登録へ進める
 */
test.describe('参加コードで参加（成功）', () => {
  test('正しい参加コードで /s/[joinToken] に遷移できる', async ({ page }) => {
    test.setTimeout(120000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`join-code-${Date.now()}`, 'sequential');
    const ownerToken = created.ownerToken!;

    // owner から join_code を取得
    const sessionRes = await page.request.get(`/api/session/get?owner_token=${ownerToken}`);
    const sessionJson = await sessionRes.json().catch(() => ({}));
    expect(sessionRes.ok(), JSON.stringify(sessionJson)).toBeTruthy();

    const joinCode = sessionJson?.data?.join_code;
    expect(joinCode).toBeTruthy();

    await page.goto('/join');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('#joinCode', String(joinCode));
    await page.click('button:has-text("参加する")');

    await expect(page).toHaveURL(/\/s\/[a-f0-9-]+/, { timeout: 30000 });
    // join ページは「参加登録」見出しを持たないことがあるため、登録フォームの存在で判定する
    await expect(page.locator('#displayName')).toBeVisible({ timeout: 30000 });
  });
});

