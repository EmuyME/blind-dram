import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestHelpers } from './helpers';

const IMAGE_PATH = resolve(__dirname, 'fixtures/glenallachie-12.png');

async function gradeAndFinish(
  page: import('@playwright/test').Page,
  helpers: TestHelpers,
  joinToken: string,
  sampleId: string,
  presenterToken: string,
  grades: { participantId: string; correct: boolean }[],
) {
  for (const g of grades) {
    await page.request.post('/api/distillery/grade', {
      data: {
        participant_token: presenterToken,
        sample_id: sampleId,
        target_participant_id: g.participantId,
        is_correct: g.correct,
      },
    });
  }
  await helpers.finishRound(joinToken, sampleId, presenterToken);
}

test.describe('直近修正のローカル検証', () => {
  test.setTimeout(180000);

  test('部分点バッジが結果詳細に表示される', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const { joinToken, ownerToken } = await helpers.createEvent('部分点検証', 'sequential');
    const p1 = await helpers.createMockParticipant(joinToken!, 'P1', 1, ['Sample A']);
    const p2 = await helpers.createMockParticipant(joinToken!, 'P2', 0, []);

    await helpers.closeRegistration(ownerToken!, joinToken!);
    await helpers.startSession(ownerToken!, joinToken!);

    const samplesRes = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const sampleId = (await samplesRes.json()).data.samples[0].id as string;

    await helpers.startRound(joinToken!, sampleId, p1.participantToken);
    await helpers.submitAnswer(joinToken!, sampleId, p1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 14,
      guessed_abv: 44,
      guessed_distillery: 'マッカラン',
    });
    await helpers.submitAnswer(joinToken!, sampleId, p2.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 14,
      guessed_abv: 44,
      guessed_distillery: '山崎',
    });
    await helpers.submitTruth(joinToken!, sampleId, p1.participantToken, {
      true_cask: 'シェリー樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43,
      true_distillery: 'マッカラン',
    });

    await gradeAndFinish(page, helpers, joinToken!, sampleId, p1.participantToken, [
      { participantId: p1.participantId, correct: true },
      { participantId: p2.participantId, correct: false },
    ]);

    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.evaluate(
      ({ token, jt }) => localStorage.setItem(`bd:participant_token:${jt}`, token),
      { token: p1.participantToken, jt: joinToken },
    );
    await page.reload();
    await page.getByRole('button', { name: '詳細' }).click();

    await expect(page.getByText('部分点 (1)').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('正解').first()).toBeVisible();
    await expect(page.getByText('不正解').first()).toBeVisible();
  });

  test('選択式度数が範囲ラベルとしてAPI保存される', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const { joinToken, ownerToken } = await helpers.createEvent('選択式度数検証', 'simultaneous');
    const p1 = await helpers.createMockParticipant(joinToken!, 'P1', 1, ['Sample A']);
    await helpers.closeRegistration(ownerToken!, joinToken!);
    await helpers.startSession(ownerToken!, joinToken!);

    const samplesRes = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const sampleId = (await samplesRes.json()).data.samples[0].id as string;
    await helpers.startRound(joinToken!, sampleId, p1.participantToken);

    const upsert = await page.request.post('/api/answers/upsert', {
      data: {
        participant_token: p1.participantToken,
        sample_id: sampleId,
        status: 'draft',
        guessed_abv: '50.0-54.9',
      },
    });
    expect(upsert.ok()).toBeTruthy();

    const getRes = await page.request.get(
      `/api/answers/get?participant_token=${p1.participantToken}&sample_id=${sampleId}`,
    );
    expect(getRes.ok()).toBeTruthy();
    const answer = (await getRes.json()).data?.answer;
    expect(answer?.guessed_abv).toBe('50.0-54.9');
  });

  test('ボトル写真タップで拡大表示される', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const imageBuffer = readFileSync(IMAGE_PATH);
    const { joinToken, ownerToken } = await helpers.createEvent('写真拡大検証', 'sequential');
    const p1 = await helpers.createMockParticipant(joinToken!, 'Presenter', 1, ['GlenAllachie']);
    const p2 = await helpers.createMockParticipant(joinToken!, 'P2', 0, []);
    await helpers.closeRegistration(ownerToken!, joinToken!);
    await helpers.startSession(ownerToken!, joinToken!);

    const sampleId = (await helpers.getSampleIdForPresenter(ownerToken!, p1.participantId))!;
    await helpers.startRound(joinToken!, sampleId, p1.participantToken);

    await page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await page.evaluate(
      ({ token, jt }) => localStorage.setItem(`bd:participant_token:${jt}`, token),
      { token: p1.participantToken, jt: joinToken },
    );
    await page.reload();

    await page.locator('#bottle-image-upload').setInputFiles({
      name: 'glenallachie-12.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    });
    await expect(page.locator('text=/アップロードしました/')).toBeVisible({ timeout: 15000 });

    await page.locator('select[name="true_cask"], input[name="true_cask"]').first().selectOption({ label: 'シェリー樽' });
    await page.locator('select[name="true_region"], input[name="true_region"]').first().selectOption({
      label: 'スコットランド（スペイサイド）',
    });
    await page.fill('input[name="true_age"]', '12');
    await page.fill('input[name="true_abv"]', '43');
    await page.fill('input[name="true_distillery"]', 'GlenAllachie');
    await page.click('button:has-text("正解情報を保存")');
    await expect(page.locator('text=/正解情報を保存しました|正解情報とテイスティングを保存しました/')).toBeVisible({
      timeout: 10000,
    });

    await helpers.submitAnswer(joinToken!, sampleId, p1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 12,
      guessed_abv: 43,
      guessed_distillery: 'GlenAllachie',
    });
    await helpers.submitAnswer(joinToken!, sampleId, p2.participantToken, {
      guessed_cask: 'バーボン樽',
      guessed_region: '日本',
      guessed_age: 10,
      guessed_abv: 40,
      guessed_distillery: '山崎',
    });

    await gradeAndFinish(page, helpers, joinToken!, sampleId, p1.participantToken, [
      { participantId: p1.participantId, correct: true },
      { participantId: p2.participantId, correct: false },
    ]);

    await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
    await page.evaluate(
      ({ token, jt }) => localStorage.setItem(`bd:participant_token:${jt}`, token),
      { token: p2.participantToken, jt: joinToken },
    );
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: '詳細' }).click();

    const enlargeBtn = page.getByRole('button', { name: /ボトル画像を拡大表示/ });
    await expect(enlargeBtn).toBeVisible({ timeout: 15000 });
    await enlargeBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('img')).toBeVisible();
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('直近修正のローカル検証（モバイル入力）', () => {
  test('度数入力が type=text（iOS/Android対応）', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const { joinToken, ownerToken } = await helpers.createEvent('モバイル入力検証', 'simultaneous');
    const p1 = await helpers.createMockParticipant(joinToken!, 'P1', 1, ['Sample A']);
    await helpers.closeRegistration(ownerToken!, joinToken!);
    await helpers.startSession(ownerToken!, joinToken!);

    const samplesRes = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const sampleId = (await samplesRes.json()).data.samples[0].id as string;
    await helpers.startRound(joinToken!, sampleId, p1.participantToken);

    await page.goto(`/session/${joinToken}/round/${sampleId}`);
    await page.evaluate(
      ({ token, jt }) => localStorage.setItem(`bd:participant_token:${jt}`, token),
      { token: p1.participantToken, jt: joinToken },
    );
    await page.reload();

    const abvInput = page.locator('input[name="guessed_abv"]');
    await expect(abvInput).toHaveAttribute('type', 'text');
    await expect(abvInput).toHaveAttribute('inputmode', 'decimal');

    await abvInput.fill('50');
    await abvInput.fill('50.5');
    await abvInput.blur();
    await expect(abvInput).toHaveValue('50.5');
  });
});
