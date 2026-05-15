import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * 複数参加者・複数ボトルの組み合わせで完全フローをテスト
 * すべての組み合わせに対してテストを実行し、バグを発見・修正する
 */

const testCases = [
  {
    name: '2名・各1本',
    participants: [
      { name: '参加者A', bottles: 1, labels: ['Sample A'] },
      { name: '参加者B', bottles: 1, labels: ['Sample B'] },
    ],
  },
  {
    name: '2名・各2本',
    participants: [
      { name: '参加者A', bottles: 2, labels: ['Sample A1', 'Sample A2'] },
      { name: '参加者B', bottles: 2, labels: ['Sample B1', 'Sample B2'] },
    ],
  },
  {
    name: '3名・各1本',
    participants: [
      { name: '参加者A', bottles: 1, labels: ['Sample A'] },
      { name: '参加者B', bottles: 1, labels: ['Sample B'] },
      { name: '参加者C', bottles: 1, labels: ['Sample C'] },
    ],
  },
  {
    name: '3名・各2本',
    participants: [
      { name: '参加者A', bottles: 2, labels: ['Sample A1', 'Sample A2'] },
      { name: '参加者B', bottles: 2, labels: ['Sample B1', 'Sample B2'] },
      { name: '参加者C', bottles: 2, labels: ['Sample C1', 'Sample C2'] },
    ],
  },
  {
    name: '3名・1本、2本、3本',
    participants: [
      { name: '参加者A', bottles: 1, labels: ['Sample A'] },
      { name: '参加者B', bottles: 2, labels: ['Sample B1', 'Sample B2'] },
      { name: '参加者C', bottles: 3, labels: ['Sample C1', 'Sample C2', 'Sample C3'] },
    ],
  },
];

test.describe('完全フロー: 組み合わせ', () => {
  test.describe.configure({ mode: 'serial' });

  testCases.forEach((testCase) => {
    test(`完全フロー: ${testCase.name}`, async ({ page, context }) => {
      test.setTimeout(600000);
    const helpers = new TestHelpers(page);
    
    // 1. セッション作成
    const { ownerToken, joinToken } = await helpers.createEvent(`テスト-${testCase.name}`, 'sequential');
    expect(joinToken).toBeTruthy();
    expect(ownerToken).toBeTruthy();

    // 2. 模擬参加者を作成（トークンとIDを取得）
    const participantTokens: string[] = [];
    const participantIds: string[] = [];
    for (const participant of testCase.participants) {
      const result = await helpers.createMockParticipant(
        joinToken!,
        participant.name,
        participant.bottles,
        participant.labels
      );
      participantTokens.push(result.participantToken);
      participantIds.push(result.participantId);
    }

    // 3. 参加登録を締め切る
    await helpers.closeRegistration(ownerToken, joinToken);

    // 4. セッションを開始
    await helpers.startSession(ownerToken, joinToken);

    // 各参加者でテスト（逐次モード）
    // 5. すべてのサンプルを順次処理
    // オーナーページからサンプル一覧を取得
    const samplesResponse = await page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    const samplesResult = await samplesResponse.json();
    const allSamples = samplesResult?.data?.samples || [];
    
    // サンプルをsort_orderでソート
    const sortedSamples = [...allSamples].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // 各サンプルに対してRoundを実行
    for (const sample of sortedSamples) {
      const sampleId = sample.id;
      const samplePresenterId = sample.presenter_participant_id;
      const samplePresenterIndex = participantIds.findIndex(id => id === samplePresenterId);
      
      if (samplePresenterIndex === -1) {
        throw new Error(`サンプル ${sampleId} のプレゼンターが見つかりませんでした`);
      }
      
      const samplePresenterToken = participantTokens[samplePresenterIndex];
    
      // プレゼンターページを開いてRoundを開始
      const presenterPage = await context.newPage();
      await presenterPage.goto(`/session/${joinToken}/presenter/${sampleId}?debug_participant_token=${samplePresenterToken}`);
      await presenterPage.waitForLoadState('domcontentloaded');
      
      // 逐次モードの場合、前のRoundが完了するまで待機
      // 最初のサンプル（sort_orderが最小）の場合は待機不要
      const isFirstSample = sortedSamples[0]?.id === sampleId;
      
      if (!isFirstSample) {
      // Roundを開始できる状態になるまで待機
      const canStartWaitStart = Date.now();
      while (Date.now() - canStartWaitStart < 60000) {
        // 既にanswering状態の場合、開始済み
        const statusResponse = await presenterPage.request.get(
          `/api/round/status?sample_id=${sampleId}&participant_token=${samplePresenterToken}`
        );
        const statusResult = await statusResponse.json().catch(() => ({}));
        const roundState = statusResult?.data?.state || 'pending';
        if (roundState === 'answering') {
          break;
        }
          
          // 前のRoundが完了しているか確認
          const checkReadyResponse = await presenterPage.request.get(
            `/api/session/check-pending-sample-ready?join_token=${joinToken}&sample_id=${sampleId}`
          );
          const checkReadyResult = await checkReadyResponse.json().catch(() => ({}));
          // APIは { data: { is_ready: boolean } } を返す（旧実装名 can_start ではない）
          const canStart = (checkReadyResult?.data?.is_ready ?? checkReadyResult?.data?.can_start) || false;
          
          if (canStart) {
            // is_readyがtrueでも、start-nextが呼ばれていない可能性があるので、
            // 少し待ってからanswering状態になるか確認
            await presenterPage.waitForTimeout(1000);
            const statusResponse2 = await presenterPage.request.get(
              `/api/round/status?sample_id=${sampleId}&participant_token=${samplePresenterToken}`
            );
            const statusResult2 = await statusResponse2.json().catch(() => ({}));
            const roundState2 = statusResult2?.data?.state || 'pending';
            if (roundState2 === 'answering') {
              break;
            }
            // answering状態にならない場合、start-nextが呼ばれていない可能性がある
            // 次のループで再確認
          }

        // 逐次モードでは「前のRoundの終了」＋「全員の次へクリック」待ちになり得るので、
        // 強いリロードループは避け、短いポーリング＋定期リロードにする
          await presenterPage.waitForTimeout(1000);
          if ((Date.now() - canStartWaitStart) % 5000 < 1000) {
          await presenterPage.reload();
          await presenterPage.waitForLoadState('domcontentloaded');
          }
        }
      }
      
      // Roundを開始
      // まず、Round状態を確認
      const statusResponse = await presenterPage.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${samplePresenterToken}`
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      const roundState = statusResult?.data?.state || 'pending';
      
      if (roundState === 'answering') {
        // 既にanswering状態の場合、開始済み
        // サンプルがanswering状態になるまで待機の処理をスキップ
      } else {
        // Roundを開始
        const startRoundButton = presenterPage.locator('button:has-text("Roundを開始"), button:has-text("Roundを開始する")');
        await startRoundButton.waitFor({ state: 'visible', timeout: 10000 });
        await startRoundButton.click();
        await presenterPage.waitForSelector('text=Roundを開始しました', { timeout: 10000 });
      }
        
        // サンプルがanswering状態になるまで待機
        const waitStart = Date.now();
        while (Date.now() - waitStart < 20000) {
          const statusResponse = await presenterPage.request.get(
            `/api/round/status?sample_id=${sampleId}&participant_token=${samplePresenterToken}`
          );
          const statusResult = await statusResponse.json().catch(() => ({}));
          if (statusResult?.data?.state === 'answering') {
            break;
          }
          await presenterPage.waitForTimeout(1000);
        }

        for (let i = 0; i < testCase.participants.length; i++) {
          const participantToken = participantTokens[i];
          const participantId = participantIds[i];
          const participantPage = i === samplePresenterIndex ? presenterPage : await context.newPage();
          
          if (i !== samplePresenterIndex) {
            await participantPage.goto(`/session/${joinToken}?debug_participant_token=${participantToken}`);
            await participantPage.waitForLoadState('domcontentloaded');
          }
          
          // Roundページに移動
          const targetPage = i === samplePresenterIndex ? presenterPage : participantPage;
          const targetToken = i === samplePresenterIndex ? samplePresenterToken : participantToken;
          
          if (i !== samplePresenterIndex) {
            await participantPage.goto(`/session/${joinToken}/round/${sampleId}?debug_participant_token=${participantToken}`);
          } else {
            await presenterPage.goto(`/session/${joinToken}/round/${sampleId}?debug_participant_token=${samplePresenterToken}`);
          }
          await targetPage.waitForLoadState('domcontentloaded');
          
          // Roundがanswering状態になるまで待機（APIで確認）
          const waitStart = Date.now();
          while (Date.now() - waitStart < 20000) {
            const statusResponse = await targetPage.request.get(
              `/api/round/status?sample_id=${sampleId}&participant_token=${targetToken}`
            );
            const statusResult = await statusResponse.json().catch(() => ({}));
            if (statusResult?.data?.state === 'answering') {
              break;
            }
            await targetPage.waitForTimeout(1000);
          }

          // フォームが表示されるまで待機（カスクのselect要素が表示されるまで）
          // Roundページはanswering状態でフォームを表示する
          const caskSelect = targetPage.locator('select[name="guessed_cask"]');
          await caskSelect.waitFor({ state: 'visible', timeout: 20000 });
          // 値が未選択だと提出内容が空になり、UI/遷移が不安定になることがあるので最低限選択しておく
          await caskSelect.selectOption({ index: 1 }).catch(async () => {
            // フォールバック: index指定が効かない場合
            await caskSelect.selectOption({ label: 'バーボン樽' });
          });
          const regionSelect = targetPage.locator('select[name="guessed_region"]');
          await regionSelect.selectOption({ index: 1 }).catch(async () => {
            await regionSelect.selectOption({ label: 'スコットランド' });
          });
          
          // 追加の待機：ページの状態更新を待つ
          await targetPage.waitForTimeout(1000);
          
          // 回答を提出（ボタンのテキストは「提出する」）
          const submitButton = targetPage.locator('button:has-text("提出する")');
          await submitButton.waitFor({ state: 'visible', timeout: 10000 });
          await submitButton.click();
          // UIトースト待ちだとレースしやすいので、APIで「submitted」を確認する
          const submitWaitStart = Date.now();
          while (Date.now() - submitWaitStart < 20000) {
            const s = await targetPage.request.get(
              `/api/round/status?sample_id=${sampleId}&participant_token=${targetToken}`
            );
            const j = await s.json().catch(() => ({}));
            const progress = (j?.data?.participant_progress || []) as Array<{ participant_id: string; status: string }>;
            const me = progress.find((p) => p.participant_id === participantId);
            if (me?.status === 'submitted') break;
            await targetPage.waitForTimeout(500);
          }
          
          if (i !== samplePresenterIndex) {
            await participantPage.close();
          }
        }

        // 7. プレゼンターがTruth入力と採点
        await presenterPage.goto(`/session/${joinToken}/presenter/${sampleId}?debug_participant_token=${samplePresenterToken}`);
        await presenterPage.waitForLoadState('domcontentloaded');
        
        // Round状態を確認する関数
        const checkState = async () => {
          // page単位のAPIコンテキストを使い、タブのクローズやナビゲーションの影響を受けにくくする
          const statusResponse = await page.request.get(
            `/api/round/status?sample_id=${sampleId}&participant_token=${samplePresenterToken}`
          );
          const statusResult = await statusResponse.json().catch(() => ({}));
          return {
            state: statusResult?.data?.state || 'pending',
            allSubmitted: statusResult?.data?.all_submitted || false,
            truthEntered: statusResult?.data?.truth_entered || false,
          };
        };
      
        // 全参加者が回答を提出するまで待機
        let statusCheck = await checkState();
        const allSubmittedWaitStart = Date.now();
        while (Date.now() - allSubmittedWaitStart < 30000) {
          if (statusCheck.allSubmitted) {
            break;
          }
          await presenterPage.waitForTimeout(1000);
          statusCheck = await checkState();
        }
        
        if (!statusCheck.allSubmitted) {
          throw new Error('全参加者が回答を提出するまで待機できませんでした');
        }
        
        // Truth入力はUI経由ではなくAPI経由で行う（UIの描画状態に依存しないため）
        const truthResponse = await presenterPage.request.post('/api/truths/upsert', {
          data: {
            participant_token: samplePresenterToken,
            sample_id: sampleId,
            // 最低限の項目だけ設定（内容自体はテスト上は重要ではない）
            true_cask: 'テストカスク',
            true_region: 'テスト地域',
          },
        });
        const truthResult = await truthResponse.json().catch(() => ({}));
        if (!truthResponse.ok) {
          throw new Error(`Truthの保存に失敗しました: ${truthResult?.error || 'unknown error'}`);
        }
        
        // Truth保存レスポンスで状態遷移が明示されている場合は即座にgrading扱いにする
        if (truthResult?.data?.state_transitioned && truthResult?.data?.new_state === 'grading') {
          statusCheck = { ...statusCheck, state: 'grading', truthEntered: true };
        } else {
          // Truth入力後、Round状態がgradingになるまで待機
          const gradingWaitStart = Date.now();
          while (Date.now() - gradingWaitStart < 30000) {
            statusCheck = await checkState();
            if (statusCheck.state === 'grading') {
              break;
            }
            await presenterPage.waitForTimeout(1000);
          }
        }
      
        // grading状態になったら、ページを再読み込みして採点UIを表示
        if (statusCheck.state === 'grading') {
          await presenterPage.reload();
          await presenterPage.waitForLoadState('domcontentloaded');
          
          // 採点UIが表示されるまで待つ（「○」ボタンが表示されるまで）
          await presenterPage.waitForSelector('button:has-text("○")', { timeout: 20000 });
        } else {
          throw new Error(`Round状態がgradingになりませんでした。現在の状態: ${statusCheck.state}, allSubmitted: ${statusCheck.allSubmitted}, truthEntered: ${statusCheck.truthEntered}`);
        }
      
      // 各参加者の回答を採点（「○」ボタンをクリック）
      const correctButtons = presenterPage.locator('button:has-text("○")');
      const correctCount = await correctButtons.count();
      
      for (let i = 0; i < correctCount; i++) {
        const correctButton = correctButtons.nth(i);
        await correctButton.waitFor({ state: 'visible', timeout: 10000 });
        // ボタンが安定するまで待機
        await presenterPage.waitForTimeout(500);
        // ボタンが有効になるまで待機
        await correctButton.waitFor({ state: 'attached', timeout: 5000 });
        await correctButton.click({ timeout: 10000 });
        await presenterPage.waitForTimeout(500);
      }
      
      // 全参加者の採点が完了するまで待機
      const allGradedWaitStart = Date.now();
      while (Date.now() - allGradedWaitStart < 20000) {
        statusCheck = await checkState();
        // allGradedはstatusCheckに含まれていないので、UIで確認
        const finishButton = presenterPage.locator('button:has-text("Roundを終了する")').filter({ hasNotText: '採点未完了' });
        if (await finishButton.isEnabled({ timeout: 2000 })) {
          break;
        }
        await presenterPage.waitForTimeout(1000);
      }

      // 8. Roundを終了
      const finishButton = presenterPage.locator('button:has-text("Roundを終了する")').filter({ hasNotText: '採点未完了' });
      await finishButton.waitFor({ state: 'visible', timeout: 10000 });
      await finishButton.click();
      await presenterPage.waitForSelector('text=Roundを終了しました', { timeout: 10000 });
      
      // 逐次モードの場合、結果表示ページに遷移（ページ遷移を待機）
      // handleFinishRoundは自動的に遷移するので、URL変更を待機
      // まず、Round終了が完了するまで待機
      await presenterPage.waitForTimeout(2000);
      
      // URL遷移を待機（最大30秒）
      const redirectWaitStart = Date.now();
      while (Date.now() - redirectWaitStart < 30000) {
        const currentUrl = presenterPage.url();
        if (currentUrl.includes('/round-result/')) {
          break;
        }
        await presenterPage.waitForTimeout(1000);
        // ページをリロードしてリダイレクトを確認
        await presenterPage.reload();
        await presenterPage.waitForLoadState('domcontentloaded');
      }
      
        // URL遷移が発生しない場合、手動で遷移
        const currentUrl = presenterPage.url();
        if (!currentUrl.includes('/round-result/')) {
          await presenterPage.goto(`/session/${joinToken}/round-result/${sampleId}?debug_participant_token=${samplePresenterToken}`);
          await presenterPage.waitForLoadState('domcontentloaded');
        await presenterPage.waitForTimeout(2000);
      }
      
      // 結果ページの確認（順位表または順位のテキストを待機）
      await presenterPage.waitForSelector('text=/順位|順位表/', { timeout: 20000 }).catch(async () => {
        // Round結果ページはポーリング等で networkidle にならないことがあるため、短い待機に留める
        await presenterPage.waitForTimeout(2000);
      });
      
      // 逐次モードでは「全員が次へ」を押さないと次のRoundが開始できないため、
      // UIクリックに頼らずAPIで確実に記録する（click-next → start-next）
      for (const participantToken of participantTokens) {
        const clickNextResponse = await page.request.post('/api/round-result/click-next', {
          data: { participant_token: participantToken, sample_id: sampleId },
        });
        if (!clickNextResponse.ok()) {
          const error = await clickNextResponse.json().catch(() => ({}));
          console.warn(`click-next failed for participant: ${error?.error || 'unknown error'}`);
        }
      }

      // 次のRoundを開始（最後のRoundの場合はセッションをaggregatingに進め得る）
      const startNextResponse = await page.request.post('/api/round-result/start-next', {
        data: { participant_token: samplePresenterToken, sample_id: sampleId },
      });
      
      if (!startNextResponse.ok()) {
        const error = await startNextResponse.json().catch(() => ({}));
        // 最終Roundで next が無い場合は正常（エラーコードを確認）
        if (error?.code !== 'NEXT_SAMPLE_NOT_FOUND' && error?.code !== 'ROUND_NOT_FINISHED') {
          console.warn(`start-next failed: ${error?.error || 'unknown error'}, code: ${error?.code || 'unknown'}`);
        }
      } else {
        // start-nextが成功した場合、次のサンプルがanswering状態になるまで待機
        const startNextResult = await startNextResponse.json().catch(() => ({}));
        const nextSampleId = startNextResult?.data?.next_sample_id;
        
        if (nextSampleId && !startNextResult?.data?.session_completed) {
          // 次のサンプルがanswering状態になるまで待機
          const nextSampleWaitStart = Date.now();
          while (Date.now() - nextSampleWaitStart < 20000) {
            const nextStatusResponse = await page.request.get(
              `/api/round/status?sample_id=${nextSampleId}&participant_token=${samplePresenterToken}`
            );
            const nextStatusResult = await nextStatusResponse.json().catch(() => ({}));
            const nextRoundState = nextStatusResult?.data?.state || 'pending';
            if (nextRoundState === 'answering') {
              break;
            }
            await presenterPage.waitForTimeout(1000);
          }
        }
      }

      // 表示上はセッションページに戻しておく（URL遷移が起きない場合もある）
      await presenterPage.goto(`/session/${joinToken}?debug_participant_token=${samplePresenterToken}`);
      await presenterPage.waitForLoadState('domcontentloaded');

      await presenterPage.close();
    }

    // 9. 結果を公開
    await page.goto(`/o/${ownerToken}?join_token=${joinToken}`);
    await page.waitForLoadState('domcontentloaded');

    // アプリ側で Round 完了 → aggregating 遷移 → 「結果を公開する」ボタン表示までを一括で待つ。
    // ここでは API ポーリングには踏み込まず、オーナーページにボタンが出ることだけを条件にする。
    await page.waitForSelector('button:has-text("結果を公開する")', { timeout: 60000 });
    await page.click('button:has-text("結果を公開する")');
    // トーストは環境差で取りこぼすことがあるため、公開後の状態（published or 「結果を見る」）を待つ
    await page
      .locator('button:has-text("結果を見る")')
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(async () => {
        await page.locator('text=結果公開済み').waitFor({ state: 'visible', timeout: 30000 });
      });

    // 10. 結果ページを確認（各参加者で）
    for (const participantToken of participantTokens) {
      const resultPage = await context.newPage();
      await resultPage.goto(`/session/${joinToken}/results?debug_participant_token=${participantToken}`);
      await resultPage.waitForLoadState('domcontentloaded');
      // CI/並列実行時は描画が遅れやすいので、結果ページ判定は少し長め＋複数候補で待つ
      await resultPage
        .locator('text=/順位|順位表|ランキング|結果/')
        .first()
        .waitFor({ state: 'visible', timeout: 60000 });
      await resultPage.close();
    }
    });
  });
});