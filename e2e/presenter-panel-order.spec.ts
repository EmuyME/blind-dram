import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('逐次モード: Presenterパネルは順番が来た時のみ表示', () => {
  test.describe.configure({ mode: 'serial' });

  test('次のPresenterに「Roundを開始できます」を表示しない', async ({ page, context }) => {
    test.setTimeout(240000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`presenter-panel-${Date.now()}`, 'sequential');
    const ownerToken = created.ownerToken!;
    const joinToken = created.joinToken!;

    // 2 presenters + 1 answerer
    const p1 = await helpers.createMockParticipant(joinToken, 'P1', 1, ['Sample A']);
    await page.waitForTimeout(300);
    const p2 = await helpers.createMockParticipant(joinToken, 'P2', 1, ['Sample B']);
    await page.waitForTimeout(300);
    await helpers.createMockParticipant(joinToken, 'U1', 0, []);
    await page.waitForTimeout(300);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const s1 = await helpers.getSampleIdForPresenter(ownerToken, p1.participantId);
    const s2 = await helpers.getSampleIdForPresenter(ownerToken, p2.participantId);
    expect(s1).toBeTruthy();
    expect(s2).toBeTruthy();

    // P2（順番待ち）は session を開いても「開始できます」系の文言が出ない
    const p2Page = await context.newPage();
    await p2Page.goto(`/session/${joinToken}?debug_participant_token=${p2.participantToken}`);
    await p2Page.waitForLoadState('domcontentloaded');
    await p2Page.waitForTimeout(1500);

    await expect(p2Page.locator('text=Roundを開始できます')).toHaveCount(0);
    await expect(p2Page.locator('text=/あなたはSample .*のPresenterです。Roundを開始できます。/')).toHaveCount(0);

    // P1 は自分の順番なので Presenterパネルが出る（開くボタンが見える）
    await page.goto(`/session/${joinToken}?debug_participant_token=${p1.participantToken}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await expect(page.locator('button:has-text("Presenterパネルを開く")')).toBeVisible({ timeout: 30000 });

    await p2Page.close();
  });
});

