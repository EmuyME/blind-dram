import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 逐次モードでセッション終了時に結果が表示されるかのテスト
 */
test.describe('Sequential Mode Results Display Test', () => {
  test.setTimeout(120000);
  test('逐次モード: セッション終了時に結果が表示される', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // セッション作成（逐次モード）
    const result = await helpers.createEvent('結果表示テスト', 'sequential');
    const joinToken = result.joinToken!;
    const ownerToken = result.ownerToken!;
    
    // 模擬参加者を2人作成
    const participant1 = await helpers.createMockParticipant(joinToken, '参加者1', 2, ['Sample A', 'Sample B']);
    const participant2 = await helpers.createMockParticipant(joinToken, '参加者2', 0, []);
    
    // 参加者が登録されるまで待つ
    await helpers.waitForParticipantsToAppear(ownerToken);
    await page.waitForTimeout(2000);
    
    // 参加登録締切とSession開始
    await helpers.closeRegistration(ownerToken, joinToken);
    await helpers.startSession(ownerToken, joinToken);
    await page.waitForTimeout(2000);
    
    // すべてのサンプルを処理する
    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const samples = samplesResult?.data?.samples || [];
    
    for (const sample of samples) {
      const sampleId = sample.id;
      
      // Round開始
      await helpers.startRound(joinToken, sampleId, participant1.participantToken);
      
      // 参加者1が回答提出
      await helpers.submitAnswer(joinToken, sampleId, participant1.participantToken, {
        guessed_cask: 'シェリー樽',
        guessed_region: 'スコットランド',
        guessed_age: 12,
        guessed_abv: 43,
        guessed_distillery: 'マッカラン',
      });
      
      // 参加者2が回答提出
      await helpers.submitAnswer(joinToken, sampleId, participant2.participantToken, {
        guessed_cask: 'バーボン樽',
        guessed_region: '日本',
        guessed_age: 15,
        guessed_abv: 40,
        guessed_distillery: '山崎',
      });
      
      // Truth入力（Presenter）
      await helpers.submitTruth(joinToken, sampleId, participant1.participantToken, {
        true_cask: 'シェリー樽',
        true_region: 'スコットランド',
        true_age: 12,
        true_abv: 43,
        true_distillery: 'マッカラン',
      });
      
      // 採点（両参加者）
      await page.request.post('/api/distillery/grade', {
        data: {
          participant_token: participant1.participantToken,
          sample_id: sampleId,
          target_participant_id: participant2.participantId,
          is_correct: true,
        },
      });
      await page.request.post('/api/distillery/grade', {
        data: {
          participant_token: participant1.participantToken,
          sample_id: sampleId,
          target_participant_id: participant1.participantId,
          is_correct: true,
        },
      });
      
      // Round終了
      await helpers.finishRound(joinToken, sampleId, participant1.participantToken);
      
      // 逐次モードの場合、結果ページを確認
      if (sample !== samples[samples.length - 1]) {
        // 最後のラウンド以外は、結果ページに遷移していることを確認
        await page.goto(`/session/${joinToken}`);
        await page.evaluate(({ token, joinToken }) => {
          localStorage.setItem(`bd:participant_token:${joinToken}`, token);
        }, { token: participant1.participantToken, joinToken });
        await page.reload();
        await page.waitForTimeout(2000);
        
        // 次のラウンドに進む（すべての参加者が「次へ」をクリック）
        await page.request.post('/api/round-result/click-next', {
          data: {
            participant_token: participant1.participantToken,
            sample_id: sampleId,
          },
        });
        await page.request.post('/api/round-result/click-next', {
          data: {
            participant_token: participant2.participantToken,
            sample_id: sampleId,
          },
        });
        
        // 次のラウンドを開始
        await page.request.post('/api/round-result/start-next', {
          data: {
            participant_token: participant1.participantToken,
            sample_id: sampleId,
          },
        });
        await page.waitForTimeout(2000);
      }
    }
    
    // すべてのラウンドが完了したら、セッションがaggregating状態になることを確認
    // check-complete APIを呼び出して、セッション状態を更新（join_tokenを使用）
    await page.request.post('/api/session/check-complete', {
      data: {
        join_token: joinToken,
      },
    });
    
    let sessionState = '';
    const waitStart = Date.now();
    while (Date.now() - waitStart < 30000) {
      const sessionResponse = await page.request.get(`/api/session/get?owner_token=${ownerToken}`);
      const sessionResult = await sessionResponse.json().catch(() => ({}));
      sessionState = sessionResult?.data?.state || '';
      if (sessionState === 'aggregating') {
        break;
      }
      // check-complete APIを再度呼び出す（join_tokenを使用）
      await page.request.post('/api/session/check-complete', {
        data: {
          join_token: joinToken,
        },
      });
      await page.waitForTimeout(2000);
    }
    
    expect(sessionState).toBe('aggregating');
    
    // 結果を公開
    await helpers.publishResults(ownerToken);
    
    // セッションページにアクセスして、自動的に結果ページにリダイレクトされることを確認
    await page.goto(`/session/${joinToken}`);
    await page.evaluate(({ token, joinToken }) => {
      localStorage.setItem(`bd:participant_token:${joinToken}`, token);
    }, { token: participant1.participantToken, joinToken });
    await page.reload();
    
    // 結果ページにリダイレクトされることを確認（10秒待つ）
    await expect(page).toHaveURL(new RegExp(`/session/${joinToken}/results`), { timeout: 15000 });
    
    // 結果ページで結果が表示されることを確認
    await expect(page.locator('text=/結果|ランキング|順位/').first()).toBeVisible({ timeout: 10000 });
    
    // セッションタイトルが表示されることを確認
    await expect(page.locator('text=結果表示テスト').first()).toBeVisible({ timeout: 5000 });
  });
});
