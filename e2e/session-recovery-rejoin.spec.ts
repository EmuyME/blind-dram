import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 別ブラウザ相当（localStorage なし）から参加者名を選んで復帰できること。
 */
test.describe('セッション復帰（別端末・参加者選択）', () => {
  test('participant_token なしでも参加者一覧から復帰できる', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const label = `別端末復帰E2E-${Date.now()}`;
    const displayName = '別端末太郎';
    const { joinToken } = await helpers.createEvent(label, 'sequential');
    expect(joinToken).toBeTruthy();

    await helpers.joinSession(joinToken!, displayName, 0, []);

    await expect(page.locator(`text=${displayName}`).first()).toBeVisible({ timeout: 20000 });

    // 別端末相当: 参加トークンとオーナートークンを消す
    await page.evaluate((jt) => {
      localStorage.removeItem(`bd:participant_token:${jt}`);
      localStorage.removeItem(`bd:owner_token:${jt}`);
    }, joinToken);

    await page.goto(`/session/${joinToken}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'おかえりなさい' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: new RegExp(displayName) })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: new RegExp(displayName) }).click();

    await expect(page.getByText('参加登録完了')).toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=参加者: ${displayName}`)).toBeVisible();

    const tokenAfter = await page.evaluate(
      (jt) => localStorage.getItem(`bd:participant_token:${jt}`),
      joinToken,
    );
    expect(tokenAfter).toBeTruthy();
  });

  test('参加締切後も /s から参加者選択で復帰できる', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const label = `締切後復帰E2E-${Date.now()}`;
    const displayName = '締切後花子';
    const { joinToken, ownerToken } = await helpers.createEvent(label, 'sequential');
    expect(joinToken).toBeTruthy();
    expect(ownerToken).toBeTruthy();

    await helpers.joinSession(joinToken!, displayName, 0, []);

    await helpers.closeRegistration(ownerToken!, joinToken!);

    await page.evaluate((jt) => {
      localStorage.removeItem(`bd:participant_token:${jt}`);
      localStorage.removeItem(`bd:owner_token:${jt}`);
    }, joinToken);

    await page.goto(`/s/${joinToken}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('参加登録は締め切られています')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: new RegExp(displayName) }).click();

    await expect(page.getByText('順番決め中')).toBeVisible({ timeout: 20000 });
    await expect(page.locator(`text=参加者: ${displayName}`)).toBeVisible();
  });
});
