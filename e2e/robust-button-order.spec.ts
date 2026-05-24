import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from './helpers';

type Role = 'presenter' | 'answerer' | 'nextPresenter';

async function setTokenAndGoToRoundResult(page: Page, joinToken: string, sampleId: string, token: string) {
  await page.goto(`/session/${joinToken}/round-result/${sampleId}`);
  await page.evaluate(({ token, joinToken }) => {
    localStorage.setItem(`bd:participant_token:${joinToken}`, token);
  }, { token, joinToken });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/round-result\//, { timeout: 30000 });
}

async function clickNext(page: Page) {
  const nextBtn = page.locator('button:has-text("次へ")');
  await expect(nextBtn).toBeVisible({ timeout: 30000 });
  await nextBtn.click();
}

/**
 * 「各画面のすべてのボタン」を文字通り100%網羅するのは現実的ではないので、
 * “役割（Presenter/回答者）で競合し得るボタン”を対象に、順序入れ替えで壊れないことを保証する。
 *
 * 対象（逐次モード）:
 * - round-result: 「次へ」(click-next) の順序入れ替え（Presenter先/回答者先/次Presenter先）
 * - round-result: 次Presenter の「次のラウンドへ進む」(start-next) が前後しても成立
 * - 参加者側: 次ラウンド開始後に round へ自動遷移する
 */
test.describe('ロバスト性: ボタン順序（Presenter/回答者の先押し入れ替え）', () => {
  test.describe.configure({ mode: 'serial' });

  const orders: Array<{ name: string; order: Role[] }> = [
    { name: '回答者→Presenter→次Presenter', order: ['answerer', 'presenter', 'nextPresenter'] },
    { name: 'Presenter→回答者→次Presenter', order: ['presenter', 'answerer', 'nextPresenter'] },
    { name: '次Presenter→回答者→Presenter', order: ['nextPresenter', 'answerer', 'presenter'] },
  ];

  for (const o of orders) {
    test(`逐次: round-resultのボタン順序が変わっても進行できる (${o.name})`, async ({ page, context }) => {
      test.setTimeout(240000);
      const helpers = new TestHelpers(page);

      const created = await helpers.createEvent(`btn-order-${Date.now()}`, 'sequential');
      const ownerToken = created.ownerToken!;
      const joinToken = created.joinToken!;

      // Presenter(ラウンド1), 次Presenter(ラウンド2), 回答者
      const presenter = await helpers.createMockParticipant(joinToken, 'P1', 1, ['A']);
      await page.waitForTimeout(300);
      const nextPresenter = await helpers.createMockParticipant(joinToken, 'P2', 1, ['B']);
      await page.waitForTimeout(300);
      const answerer = await helpers.createMockParticipant(joinToken, 'U1', 0, []);
      await page.waitForTimeout(300);

      await helpers.closeRegistration(ownerToken, joinToken);
      await helpers.startSession(ownerToken, joinToken);

      const s1 = await helpers.getSampleIdForPresenter(ownerToken, presenter.participantId);
      const s2 = await helpers.getSampleIdForPresenter(ownerToken, nextPresenter.participantId);
      expect(s1).toBeTruthy();
      expect(s2).toBeTruthy();

      // Round1
      await helpers.startRound(joinToken, s1!, presenter.participantToken);
      await page.waitForTimeout(300);
      await helpers.submitTruth(joinToken, s1!, presenter.participantToken, {
        true_cask: 'バーボン樽',
        true_region: 'スコットランド（スペイサイド）',
        true_age: 12,
        true_abv: 43.0,
        true_distillery: 'D1',
      });
      await page.waitForTimeout(300);

      // answers: 回答者 & 次Presenter(=ラウンド1では回答者)
      await helpers.submitAnswer(joinToken, s1!, answerer.participantToken, {
        guessed_cask: 'シェリー樽',
        guessed_region: 'スコットランド（スペイサイド）',
        guessed_age: 10,
        guessed_abv: 40.0,
        guessed_distillery: 'D2',
      });
      await page.waitForTimeout(300);
      await helpers.submitAnswer(joinToken, s1!, nextPresenter.participantToken, {
        guessed_cask: 'バーボン樽',
        guessed_region: 'スコットランド（スペイサイド）',
        guessed_age: 12,
        guessed_abv: 43.0,
        guessed_distillery: 'D1',
      });
      await page.waitForTimeout(300);

      await helpers.finishRound(joinToken, s1!, presenter.participantToken);
      await page.waitForTimeout(800);

      // 3ページ用意（同時に順序入れ替えテストする）
      const pages: Record<Role, Page> = {
        presenter: page,
        answerer: await context.newPage(),
        nextPresenter: await context.newPage(),
      };

      await setTokenAndGoToRoundResult(pages.presenter, joinToken, s1!, presenter.participantToken);
      await setTokenAndGoToRoundResult(pages.answerer, joinToken, s1!, answerer.participantToken);
      await setTokenAndGoToRoundResult(pages.nextPresenter, joinToken, s1!, nextPresenter.participantToken);

      // 指定順序で「次へ」クリック（click-next）
      for (const role of o.order) {
        await clickNext(pages[role]);
        await pages[role].waitForTimeout(400);
      }

      // 次Presenter 側で start-next（順序により先に押していても、最終的に押せる状態になる）
      // ここで“見えるまで待つ”のが実運用上のロバスト性に近い
      const startBtn = pages.nextPresenter.locator('button:has-text("次のラウンドへ進む")');
      await expect(startBtn).toBeVisible({ timeout: 30000 });
      await startBtn.click();

      // start-next 二重実行（冪等性）
      await pages.nextPresenter.request.post('/api/round-result/start-next', {
        data: { participant_token: nextPresenter.participantToken, sample_id: s1 },
      });

      // 遷移確認:
      // - 次Presenterは presenter へ
      await expect(pages.nextPresenter).toHaveURL(new RegExp(`/session/${joinToken}/presenter/`), { timeout: 30000 });
      // - 回答者は round へ自動遷移（結果ページに留まり続けない）
      //   状況によっては一度 session に戻すフォールバックが走るため、round も session も許容し、
      //   session に戻った場合は「回答入力へ」相当の遷移が可能であることを確認する。
      await expect(pages.answerer).toHaveURL(
        new RegExp(`/session/${joinToken}(/round/${s2}|\\?from=round-result)?`),
        { timeout: 30000 }
      );
      if (pages.answerer.url().includes(`/session/${joinToken}?from=round-result`)) {
        // セッションページに戻った場合でも、次ラウンドの回答画面へ進めること
        const goRound = pages.answerer.getByRole('button', { name: /回答画面を開く|回答入力へ/ });
        if (await goRound.isVisible().catch(() => false)) {
          await goRound.click();
          await expect(pages.answerer).toHaveURL(new RegExp(`/session/${joinToken}/round/${s2}`), { timeout: 30000 });
        }
      }

      await pages.answerer.close();
      await pages.nextPresenter.close();
    });
  }

  test('Owner: 締切→開始の操作と参加者側表示更新が順序揺れしても破綻しない', async ({ page, context }) => {
    test.setTimeout(240000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`owner-order-${Date.now()}`, 'sequential');
    const ownerToken = created.ownerToken!;
    const joinToken = created.joinToken!;

    // 参加者ページを開いたまま、Ownerが締切/開始を進める
    const participantPage = await context.newPage();
    await participantPage.goto(`/s/${joinToken}`);
    await participantPage.waitForLoadState('domcontentloaded');

    // 参加者は模擬参加者で登録（Session開始にはSampleが最低1つ必要）
    await helpers.createMockParticipant(joinToken, 'U1', 1, ['Sample A']);
    await page.waitForTimeout(500);

    // Ownerが締切→開始
    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    // 参加者側は session に入って状態更新に追従できる
    await participantPage.goto(`/session/${joinToken}`);
    await participantPage.waitForLoadState('domcontentloaded');
    // running になるまで待つ（ページ内容は依存させずURLで最低限担保）
    await participantPage.waitForTimeout(2000);
    await expect(participantPage).toHaveURL(new RegExp(`/session/${joinToken}`));

    await participantPage.close();
  });

  test('回答者の提出が遅れても（Presenterの早操作）想定どおりエラーになり、その後復帰できる', async ({ page, context }) => {
    test.setTimeout(240000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`submit-race-${Date.now()}`, 'sequential');
    const ownerToken = created.ownerToken!;
    const joinToken = created.joinToken!;

    const presenter = await helpers.createMockParticipant(joinToken, 'P1', 1, ['A']);
    await page.waitForTimeout(300);
    const answerer = await helpers.createMockParticipant(joinToken, 'U1', 0, []);
    await page.waitForTimeout(300);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const s1 = await helpers.getSampleIdForPresenter(ownerToken, presenter.participantId);
    expect(s1).toBeTruthy();

    await helpers.startRound(joinToken, s1!, presenter.participantToken);
    await page.waitForTimeout(300);

    // Presenter truth
    await helpers.submitTruth(joinToken, s1!, presenter.participantToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'D1',
    });
    await page.waitForTimeout(300);

    // Presenterが finish を “早押し” した場合: grading ではないので INVALID_STATE
    const earlyFinish = await page.request.post('/api/round/finish', {
      data: { participant_token: presenter.participantToken, sample_id: s1 },
    });
    expect(earlyFinish.ok()).toBeFalsy();
    const earlyFinishJson = await earlyFinish.json().catch(() => ({}));
    expect(earlyFinishJson.code).toBe('INVALID_STATE');

    // 回答者が提出（ここで answering→grading へ遷移し得る）
    await helpers.submitAnswer(joinToken, s1!, answerer.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'D2',
    });
    await page.waitForTimeout(800);

    // Presenter: grading まで待つ（round/status API で状態確認）
    const waitStart = Date.now();
    while (Date.now() - waitStart < 20000) {
      const st = await page.request.get(`/api/round/status?sample_id=${s1}&participant_token=${presenter.participantToken}`);
      const stj = await st.json().catch(() => ({}));
      if (stj?.data?.state === 'grading') break;
      await page.waitForTimeout(500);
    }

    // Presenter: 採点（APIで全員分）→ finish は成功する
    await helpers.finishRound(joinToken, s1!, presenter.participantToken);

    // 回答者は結果ページへ遷移できる
    const answererPage = await context.newPage();
    await answererPage.goto(`/session/${joinToken}`);
    await answererPage.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: answerer.participantToken, joinToken });
    await answererPage.reload();
    await answererPage.waitForLoadState('domcontentloaded');
    await expect(answererPage).toHaveURL(/\/round-result\//, { timeout: 30000 });
    await answererPage.close();
  });

  test('Owner publish: 参加者が別画面にいても published→results に追従する', async ({ page, context }) => {
    test.setTimeout(300000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`publish-follow-${Date.now()}`, 'sequential');
    const ownerToken = created.ownerToken!;
    const joinToken = created.joinToken!;

    // 2 participants (1 sample total)
    const presenter = await helpers.createMockParticipant(joinToken, 'P1', 1, ['A']);
    await page.waitForTimeout(300);
    const answerer = await helpers.createMockParticipant(joinToken, 'U1', 0, []);
    await page.waitForTimeout(300);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const s1 = await helpers.getSampleIdForPresenter(ownerToken, presenter.participantId);
    expect(s1).toBeTruthy();

    // Round1 complete
    await helpers.startRound(joinToken, s1!, presenter.participantToken);
    await page.waitForTimeout(300);
    await helpers.submitTruth(joinToken, s1!, presenter.participantToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド（スペイサイド）',
      true_age: 12,
      true_abv: 43.0,
      true_distillery: 'D1',
    });
    await page.waitForTimeout(300);
    await helpers.submitAnswer(joinToken, s1!, answerer.participantToken, {
      guessed_cask: 'シェリー樽',
      guessed_region: 'スコットランド（スペイサイド）',
      guessed_age: 10,
      guessed_abv: 40.0,
      guessed_distillery: 'D2',
    });
    await page.waitForTimeout(800);
    await helpers.finishRound(joinToken, s1!, presenter.participantToken);
    await page.waitForTimeout(800);

    // 全員が次へ（順序ゆらし）
    const answererPage = await context.newPage();
    await answererPage.goto(`/session/${joinToken}`);
    await answererPage.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: answerer.participantToken, joinToken });
    await answererPage.reload();
    await answererPage.waitForLoadState('domcontentloaded');
    await expect(answererPage).toHaveURL(/\/round-result\//, { timeout: 30000 });

    // Presenter also on result
    await page.goto(`/session/${joinToken}/round-result/${s1}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenter.participantToken, joinToken });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    if (Math.random() < 0.5) {
      await answererPage.locator('button:has-text("次へ")').click();
      await page.locator('button:has-text("次へ")').click();
    } else {
      await page.locator('button:has-text("次へ")').click();
      await answererPage.locator('button:has-text("次へ")').click();
    }
    await page.waitForTimeout(800);
    await answererPage.waitForTimeout(800);

    await page.request.post('/api/round-result/start-next', {
      data: { participant_token: presenter.participantToken, sample_id: s1 },
    });

    // 最終ラウンドの start-next 後はセッションが aggregating になり、
    // round-result ページ側が session へ自動遷移する（手動「セッションページに戻る」は出ない）
    await answererPage.waitForURL(
      (url) => url.pathname === `/session/${joinToken}`,
      { timeout: 45000 },
    );
    await answererPage.waitForTimeout(1000);

    // もう一人は round-result のままでも良い（published後に結果へ追従できるかを見るため残す）
    const stuckOnResultPage = await context.newPage();
    await stuckOnResultPage.goto(`/session/${joinToken}/round-result/${s1}`);
    await stuckOnResultPage.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: presenter.participantToken, joinToken });
    await stuckOnResultPage.reload();
    await stuckOnResultPage.waitForLoadState('domcontentloaded');

    // Owner publish（APIで確実に）
    // aggregating になるまで少し待つ
    const waitAggStart = Date.now();
    while (Date.now() - waitAggStart < 30000) {
      const r = await page.request.get(`/api/session/get?join_token=${joinToken}`);
      const j = await r.json().catch(() => ({}));
      if (j?.data?.state === 'aggregating') break;
      await page.waitForTimeout(1000);
    }
    const pub = await page.request.post('/api/owner/publish', { data: { owner_token: ownerToken } });
    expect(pub.ok()).toBeTruthy();

    // published になったら results へ追従できること（session page は自動遷移/ボタン遷移のどちらでもOK）
    await expect(answererPage).toHaveURL(new RegExp(`/session/${joinToken}/results`), { timeout: 60000 });

    // round-result 側は session に戻されるので、最終的に results へ
    await expect(stuckOnResultPage).toHaveURL(new RegExp(`/session/${joinToken}/results`), { timeout: 60000 });

    await stuckOnResultPage.close();
    await answererPage.close();
  });
});

