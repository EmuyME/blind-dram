import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestHelpers } from './helpers';

const IMAGE_PATH = resolve(__dirname, 'fixtures/glenallachie-12.png');

test('GlenAllachie ボトル写真: Presenter パネルからアップロード・保存できる', async ({ page }) => {
  const helpers = new TestHelpers(page);
  const imageBuffer = readFileSync(IMAGE_PATH);

  const result = await helpers.createEvent('ボトル写真UIテスト', 'simultaneous');
  const joinToken = result.joinToken!;
  const mock = await helpers.createMockParticipant(joinToken, 'Presenter', 1, ['GlenAllachie 12']);
  await helpers.closeRegistration(result.ownerToken!, joinToken);
  await helpers.startSession(result.ownerToken!, joinToken);

  const sampleId = await helpers.getSampleIdForPresenter(result.ownerToken!, mock.participantId);
  expect(sampleId).toBeTruthy();

  await page.goto(`/session/${joinToken}/presenter/${sampleId}`);
  await page.evaluate(
    ({ token, jt }) => localStorage.setItem(`bd:participant_token:${jt}`, token),
    { token: mock.participantToken, jt: joinToken },
  );
  await page.reload();

  const imageInput = page.locator('#bottle-image-upload');
  await expect(imageInput).toHaveCount(1, { timeout: 15000 });

  await imageInput.setInputFiles({
    name: 'glenallachie-12.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });

  await expect(page.locator('text=/画像をアップロード|アップロードしました/')).toBeVisible({
    timeout: 15000,
  });

  const preview = page.locator('img[alt*="ボトル"], img[src*="blob.vercel-storage"]').first();
  await expect(preview).toBeVisible({ timeout: 10000 });
  const src = await preview.getAttribute('src');
  expect(src).toMatch(/blob\.vercel-storage\.com/);

  await page.click('button:has-text("正解情報を保存")');
  await expect(page.locator('text=/正解情報を保存しました|正解情報とテイスティングを保存しました/')).toBeVisible({
    timeout: 10000,
  });

  const statusRes = await page.request.get(
    `/api/round/status?sample_id=${sampleId}&participant_token=${mock.participantToken}`,
  );
  expect(statusRes.ok()).toBeTruthy();
  const statusJson = await statusRes.json();
  expect(statusJson.data?.truth?.bottle_image_url).toMatch(/blob\.vercel-storage\.com/);
});
