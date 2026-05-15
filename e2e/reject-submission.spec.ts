import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 仕様: Presenter は提出を差し戻せ、参加者は再編集できる
 * - answers.status: submitted -> draft
 * - samples.state: grading -> answering（編集可能に戻す）
 * - distillery_grades: 該当参加者分は無効化（削除）
 */
test.describe('Presenter: 差し戻し（提出を解除）', () => {
  test.describe.configure({ mode: 'serial' });

  test('差し戻し後、参加者が再編集→再提出できる', async ({ page, context }) => {
    test.setTimeout(180000);
    const helpers = new TestHelpers(page);

    const created = await helpers.createEvent(`reject-submission-${Date.now()}`, 'sequential');
    const ownerToken = created.ownerToken!;
    const joinToken = created.joinToken!;

    // Presenter + Answerer
    const presenter = await helpers.createMockParticipant(joinToken, 'Presenter', 1, ['Sample A']);
    await page.waitForTimeout(300);
    const answerer = await helpers.createMockParticipant(joinToken, 'Answerer', 0, []);
    await page.waitForTimeout(300);

    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);

    const sampleId = await helpers.getSampleIdForPresenter(ownerToken, presenter.participantId);
    expect(sampleId).toBeTruthy();

    // Round開始 → 回答提出 → Truth入力 → gradingへ
    await helpers.startRound(joinToken, sampleId!, presenter.participantToken);
    await helpers.submitAnswer(joinToken, sampleId!, answerer.participantToken, {
      guessed_cask: 'バーボン樽',
      guessed_region: 'スコットランド',
      guessed_age: 12,
      guessed_abv: 43,
      guessed_distillery: 'D-OLD',
    });
    await helpers.submitTruth(joinToken, sampleId!, presenter.participantToken, {
      true_cask: 'バーボン樽',
      true_region: 'スコットランド',
      true_age: 12,
      true_abv: 43,
      true_distillery: 'D-TRUE',
    });

    // grading になるまで待つ（API）
    const gradingWaitStart = Date.now();
    while (Date.now() - gradingWaitStart < 30000) {
      const s = await page.request.get(`/api/round/status?sample_id=${sampleId}&participant_token=${presenter.participantToken}`);
      const j = await s.json().catch(() => ({}));
      if (j?.data?.state === 'grading') break;
      await page.waitForTimeout(1000);
    }

    // 採点（差し戻し時に消えるべき対象を作る）
    const gradeRes = await page.request.post('/api/distillery/grade', {
      data: {
        participant_token: presenter.participantToken,
        sample_id: sampleId,
        target_participant_id: answerer.participantId,
        is_correct: true,
      },
    });
    expect(gradeRes.ok()).toBeTruthy();

    // 差し戻し（API）
    const rejectRes = await page.request.post('/api/distillery/reject-submission', {
      data: {
        participant_token: presenter.participantToken,
        sample_id: sampleId,
        target_participant_id: answerer.participantId,
      },
    });
    const rejectJson = await rejectRes.json().catch(() => ({}));
    expect(rejectRes.ok(), JSON.stringify(rejectJson)).toBeTruthy();

    // Round 状態が answering に戻り、回答者の status が draft になること
    const statusAfter = await page.request.get(`/api/round/status?sample_id=${sampleId}&participant_token=${presenter.participantToken}`);
    const statusAfterJson = await statusAfter.json().catch(() => ({}));
    expect(statusAfterJson?.data?.state).toBe('answering');
    const progress = (statusAfterJson?.data?.participant_progress || []) as Array<any>;
    const answererRow = progress.find((p) => p.participant_id === answerer.participantId);
    expect(answererRow?.status).toBe('draft');

    // 採点が消えている（Presenter目線では is_correct が undefined になる）
    expect(answererRow?.is_correct).toBeUndefined();

    // 参加者が再編集できる（フォームが表示される = answering）
    const answererPage = await context.newPage();
    await answererPage.goto(`/session/${joinToken}/round/${sampleId}?debug_participant_token=${answerer.participantToken}`);
    await answererPage.waitForLoadState('domcontentloaded');
    const cask = answererPage.locator('select[name="guessed_cask"]');
    await expect(cask).toBeVisible({ timeout: 20000 });

    // 再提出
    await cask.selectOption({ label: 'シェリー樽' }).catch(async () => {
      await cask.selectOption({ index: 1 });
    });
    const distillery = answererPage.locator('input[name="guessed_distillery"]');
    await distillery.fill('D-NEW');
    await answererPage.locator('button:has-text("提出する")').click();

    // 再提出が反映され、再び grading に遷移する
    const gradingWaitStart2 = Date.now();
    while (Date.now() - gradingWaitStart2 < 30000) {
      const s = await answererPage.request.get(`/api/round/status?sample_id=${sampleId}&participant_token=${answerer.participantToken}`);
      const j = await s.json().catch(() => ({}));
      if (j?.data?.state === 'grading') break;
      await answererPage.waitForTimeout(1000);
    }
    const finalStatus = await page.request.get(`/api/round/status?sample_id=${sampleId}&participant_token=${presenter.participantToken}`);
    const finalJson = await finalStatus.json().catch(() => ({}));
    expect(finalJson?.data?.state).toBe('grading');

    await answererPage.close();
  });
});

