import { test, expect } from '@playwright/test';

test('プレビューURLでイベント作成フロー', async ({ page }) => {
  await page.goto('/create');
  await page.fill('input#title', `プレビューテスト ${Date.now()}`);
  await page.click('text=一斉モード');

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/session/create') && res.request().method() === 'POST',
    { timeout: 30000 },
  );

  await page.click('button:has-text("イベントを作成")');
  const response = await responsePromise;
  const body = await response.json().catch(() => ({}));

  console.log('create status:', response.status(), JSON.stringify(body));

  if (!response.ok()) {
    throw new Error(`作成API失敗: ${response.status()} ${JSON.stringify(body)}`);
  }

  await page.waitForURL(/\/o\/[a-f0-9-]+/, { timeout: 30000 });
  expect(page.url()).toMatch(/\/o\/[a-f0-9-]+/);
});
