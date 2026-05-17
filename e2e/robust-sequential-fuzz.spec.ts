import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 逐次モードのロバスト性検証
 * - クリック順序・タイミングの揺れ
 * - click-next / start-next の二重実行
 * - 次ラウンド開始後の結果ページ自動遷移
 */
test.describe('逐次モード: ロバスト性（順序/タイミング揺れ）', () => {
  test.describe.configure({ mode: 'serial' });

  test('クリック順序・遅延が変わっても進行できる', async ({ page, context }) => {
    test.setTimeout(180000);
    const helpers = new TestHelpers(page);

    const result = await helpers.createEvent(`fuzz-${Date.now()}`, 'sequential');
    const ownerToken = result.ownerToken!;
    const joinToken = result.joinToken!;

    // Presenter1, Presenter2, Participant
    const p1 = await helpers.createMockParticipant(joinToken, 'P1', 1, ['A']);
    await page.waitForTimeout(500);
    const p2 = await helpers.createMockParticipant(joinToken, 'P2', 1, ['B']);
    await page.waitForTimeout(500);
    const u1 = await helpers.createMockParticipant(joinToken, 'U1', 0, []);
    await page.waitForTimeout(500);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const s1 = await helpers.getSampleIdForPresenter(ownerToken, p1.participantId);
    const s2 = await helpers.getSampleIdForPresenter(ownerToken, p2.participantId);
    expect(s1).toBeTruthy();
    expect(s2).toBeTruthy();

    // Round1 start & submit
    await helpers.startRound(joinToken, s1!, p1.participantToken);
    await page.waitForTimeout(500);
    await helpers.submitTruth(joinToken, s1!, p1.participantToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'D1',
    });
    await page.waitForTimeout(500);

    // answers: u1 & p2 are both non-presenters for round1
    await helpers.submitAnswer(joinToken, s1!, u1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'D2',
    });
    await page.waitForTimeout(300);
    await helpers.submitAnswer(joinToken, s1!, p2.participantToken, {
      guessed_cask: 'バーボン樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 12,
      guessed_abv: 43.0,
      guessed_distillery: 'D1',
    });
    await page.waitForTimeout(300);

    await helpers.finishRound(joinToken, s1!, p1.participantToken);
    await page.waitForTimeout(1000);

    // Participant page on result
    const participantPage = await context.newPage();
    await participantPage.goto(`/session/${joinToken}`);
    await participantPage.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: u1.participantToken, joinToken });
    await participantPage.reload();
    await participantPage.waitForLoadState('domcontentloaded');
    await participantPage.waitForTimeout(1500);
    // リダイレクトはポーリング/描画状況で遅れることがあるため、明示的に待つ
    await expect(participantPage).toHaveURL(/\/round-result\//, { timeout: 30000 });

    // Fuzz: click order & timing
    const order = Math.random() < 0.5 ? ['u1', 'p2', 'p1'] : ['p2', 'u1', 'p1'];
    for (const who of order) {
      const token = who === 'u1' ? u1.participantToken : who === 'p2' ? p2.participantToken : p1.participantToken;
      const target = who === 'u1' ? participantPage : page; // p1/p2 operate on main page
      await target.evaluate(({ token, joinToken }) => {
        localStorage.setItem(`bd:participant_token:${joinToken}`, token);
      }, { token, joinToken });
      await target.reload();
      await target.waitForLoadState('domcontentloaded');
      await target.waitForTimeout(500 + Math.floor(Math.random() * 800));
      const nextBtn = target.locator('button:has-text("次へ")');
      await expect(nextBtn).toBeVisible({ timeout: 15000 });
      await nextBtn.click();
      // double click-next tolerance (reload & click again sometimes)
      if (Math.random() < 0.4) {
        await target.waitForTimeout(300);
        await target.reload();
        await target.waitForLoadState('domcontentloaded');
        const nextBtn2 = target.locator('button:has-text("次へ")');
        if (await nextBtn2.isVisible().catch(() => false)) {
          await nextBtn2.click().catch(() => null);
        }
      }
    }

    // start-next should be available for P2 (next presenter)
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: p2.participantToken, joinToken });
    await page.goto(`/session/${joinToken}/round-result/${s1}`);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const startBtn = page.locator('button:has-text("次のラウンドへ進む")');
    await expect(startBtn).toBeVisible({ timeout: 30000 });
    await startBtn.click();

    // idempotent: calling start-next twice should not break
    await page.waitForTimeout(300);
    await page.request.post('/api/round-result/start-next', {
      data: { participant_token: p2.participantToken, sample_id: s1 },
    });

    // Presenter2 should be in presenter page; participant should auto move to round s2
    await expect(page).toHaveURL(new RegExp(`/session/${joinToken}/presenter/`), { timeout: 30000 });
    await expect(participantPage).toHaveURL(new RegExp(`/session/${joinToken}/round/${s2}`), { timeout: 30000 });

    await participantPage.close();
  });

  test('start-next 早押し/連打が混ざっても壊れない', async ({ page, context }) => {
    test.setTimeout(180000);
    const helpers = new TestHelpers(page);

    const result = await helpers.createEvent(`start-next-spam-${Date.now()}`, 'sequential');
    const ownerToken = result.ownerToken!;
    const joinToken = result.joinToken!;

    const p1 = await helpers.createMockParticipant(joinToken, 'P1', 1, ['A']);
    await page.waitForTimeout(300);
    const p2 = await helpers.createMockParticipant(joinToken, 'P2', 1, ['B']);
    await page.waitForTimeout(300);
    const u1 = await helpers.createMockParticipant(joinToken, 'U1', 0, []);
    await page.waitForTimeout(300);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const s1 = await helpers.getSampleIdForPresenter(ownerToken, p1.participantId);
    const s2 = await helpers.getSampleIdForPresenter(ownerToken, p2.participantId);
    expect(s1).toBeTruthy();
    expect(s2).toBeTruthy();

    await helpers.startRound(joinToken, s1!, p1.participantToken);
    await page.waitForTimeout(300);
    await helpers.submitTruth(joinToken, s1!, p1.participantToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'D1',
    });
    await page.waitForTimeout(300);

    await helpers.submitAnswer(joinToken, s1!, u1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'D2',
    });
    await page.waitForTimeout(300);
    await helpers.submitAnswer(joinToken, s1!, p2.participantToken, {
      guessed_cask: 'バーボン樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 12,
      guessed_abv: 43.0,
      guessed_distillery: 'D1',
    });
    await page.waitForTimeout(300);

    await helpers.finishRound(joinToken, s1!, p1.participantToken);
    await page.waitForTimeout(800);

    // Participant on round-result (ポーリング/遷移の揺れがあるので待つ)
    const participantPage = await context.newPage();
    await participantPage.goto(`/session/${joinToken}`);
    await participantPage.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: u1.participantToken, joinToken });
    await participantPage.reload();
    await participantPage.waitForLoadState('domcontentloaded');
    await participantPage.waitForTimeout(1000);
    await expect(participantPage).toHaveURL(/\/round-result\//, { timeout: 30000 });

    // Early start-next spam BEFORE all clicks are done: should not crash app, should return 400 or ok,
    // and UI must remain usable afterwards.
    await page.request.post('/api/round-result/start-next', {
      data: { participant_token: p2.participantToken, sample_id: s1 },
    }).catch(() => null);
    await page.request.post('/api/round-result/start-next', {
      data: { participant_token: p2.participantToken, sample_id: s1 },
    }).catch(() => null);

    // Now do clicks (random order) and double-clicks
    const order = Math.random() < 0.5 ? ['u1', 'p2', 'p1'] : ['p2', 'u1', 'p1'];
    for (const who of order) {
      const token = who === 'u1' ? u1.participantToken : who === 'p2' ? p2.participantToken : p1.participantToken;
      const target = who === 'u1' ? participantPage : page;
      await target.evaluate(({ token, joinToken }) => {
        localStorage.setItem(`bd:participant_token:${joinToken}`, token);
      }, { token, joinToken });
      await target.reload();
      await target.waitForLoadState('domcontentloaded');
      await target.waitForTimeout(400);
      const nextBtn = target.locator('button:has-text("次へ")');
      await expect(nextBtn).toBeVisible({ timeout: 15000 });
      await nextBtn.click();
      // spam click-next via UI again after reload
      await target.waitForTimeout(200);
      await target.reload();
      await target.waitForLoadState('domcontentloaded');
      const nextBtn2 = target.locator('button:has-text("次へ")');
      if (await nextBtn2.isVisible().catch(() => false)) {
        await nextBtn2.click().catch(() => null);
      }
      await target.waitForTimeout(200);
    }

    // start-next spam AFTER all clicked: should succeed and be idempotent
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: p2.participantToken, joinToken });
    await page.goto(`/session/${joinToken}/round-result/${s1}`);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const startBtn = page.locator('button:has-text("次のラウンドへ進む")');
    await expect(startBtn).toBeVisible({ timeout: 30000 });
    await startBtn.click();
    await page.waitForTimeout(300);

    await page.request.post('/api/round-result/start-next', {
      data: { participant_token: p2.participantToken, sample_id: s1 },
    });

    await expect(page).toHaveURL(new RegExp(`/session/${joinToken}/presenter/`), { timeout: 30000 });
    await expect(participantPage).toHaveURL(new RegExp(`/session/${joinToken}/round/${s2}`), { timeout: 30000 });

    await participantPage.close();
  });

  test('最終ラウンド後: 戻る/再入場/連打しても詰まらない', async ({ page, context }) => {
    test.setTimeout(180000);
    const helpers = new TestHelpers(page);

    const result = await helpers.createEvent(`final-round-${Date.now()}`, 'sequential');
    const ownerToken = result.ownerToken!;
    const joinToken = result.joinToken!;

    // 2 participants total: P1 presenter with 1 sample; U1 answerer
    const p1 = await helpers.createMockParticipant(joinToken, 'P1', 1, ['A']);
    await page.waitForTimeout(300);
    const u1 = await helpers.createMockParticipant(joinToken, 'U1', 0, []);
    await page.waitForTimeout(300);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const s1 = await helpers.getSampleIdForPresenter(ownerToken, p1.participantId);
    expect(s1).toBeTruthy();

    await helpers.startRound(joinToken, s1!, p1.participantToken);
    await page.waitForTimeout(300);
    await helpers.submitTruth(joinToken, s1!, p1.participantToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'D1',
    });
    await page.waitForTimeout(300);

    await helpers.submitAnswer(joinToken, s1!, u1.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'D2',
    });
    await page.waitForTimeout(300);

    await helpers.finishRound(joinToken, s1!, p1.participantToken);
    await page.waitForTimeout(800);

    // U1 result page
    const p = await context.newPage();
    await p.goto(`/session/${joinToken}`);
    await p.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: u1.participantToken, joinToken });
    await p.reload();
    await p.waitForLoadState('domcontentloaded');
    await expect(p).toHaveURL(/\/round-result\//, { timeout: 30000 });

    // click-next spam
    const nextBtn = p.locator('button:has-text("次へ")');
    await expect(nextBtn).toBeVisible({ timeout: 15000 });
    await nextBtn.click();
    await p.waitForTimeout(300);
    await p.reload();
    await p.waitForLoadState('domcontentloaded');
    const nextBtn2 = p.locator('button:has-text("次へ")');
    if (await nextBtn2.isVisible().catch(() => false)) await nextBtn2.click().catch(() => null);

    // P1 also clicks next
    await page.goto(`/session/${joinToken}/round-result/${s1}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: p1.participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await page.locator('button:has-text("次へ")').click();
    await page.waitForTimeout(800);

    // Now should show completion UI; press back-to-session repeatedly
    const backBtn = p.locator('button:has-text("セッションページに戻る")');
    await expect(backBtn).toBeVisible({ timeout: 30000 });
    await backBtn.click();
    await p.waitForTimeout(500);
    // re-enter result page and back again (simulates user bouncing)
    await p.goto(`/session/${joinToken}/round-result/${s1}`);
    await p.waitForLoadState('domcontentloaded');
    await p.waitForTimeout(500);
    const backBtn2 = p.locator('button:has-text("セッションページに戻る")');
    if (await backBtn2.isVisible().catch(() => false)) {
      await backBtn2.click();
    }

    // end state: session page should become aggregating or published eventually
    await expect(p).toHaveURL(new RegExp(`/session/${joinToken}`), { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.close();
  });
});

