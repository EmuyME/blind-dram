import { Page, expect } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

/**
 * テストヘルパー関数
 */
export class TestHelpers {
  constructor(private page: Page) {}

  private isRetryableNetworkError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
    return (
      message.includes('ECONNRESET') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('socket hang up')
    );
  }

  private async requestGetWithRetry(
    url: string,
    options?: Parameters<Page['request']['get']>[1],
    attempts = 5
  ): Promise<APIResponse> {
    let lastError: unknown = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.page.request.get(url, options as any);
      } catch (e) {
        lastError = e;
        if (!this.isRetryableNetworkError(e) || i === attempts - 1) {
          throw e;
        }
        await this.page.waitForTimeout(250 * (i + 1));
      }
    }
    throw lastError;
  }

  /**
   * イベントを作成する
   */
  async createEvent(eventName: string, mode: 'sequential' | 'simultaneous' = 'sequential') {
    await this.page.goto('/create');
    await this.page.fill('input[type="text"]', eventName);
    
    if (mode === 'sequential') {
      await this.page.click('text=逐次モード');
    } else {
      await this.page.click('text=一斉モード');
    }
    
    await this.page.click('button:has-text("イベントを作成")');
    await this.page.waitForURL(/\/o\/[a-f0-9-]+/, { timeout: 30000 });
    
    const ownerUrl = this.page.url();
    const ownerToken = ownerUrl.match(/\/o\/([a-f0-9-]+)/)?.[1] || null;
    let joinToken: string | null = null;
    
    if (ownerToken) {
      const response = await this.page.request.get(`/api/session/get?owner_token=${ownerToken}`);
      if (response.ok()) {
        const result = await response.json();
        joinToken = result?.data?.join_token || null;
      }
    }
    
    return { ownerToken, joinToken, ownerUrl };
  }

  /**
   * 参加登録する
   */
  async joinSession(joinToken: string, displayName: string, bottleCount: number, labels: string[]) {
    await this.page.goto(`/s/${joinToken}`);
    
    // ページが読み込まれるまで待つ
    await this.page.waitForLoadState('domcontentloaded');
    
    // 表示名を入力（displayName入力）
    const nameInput = this.page.locator('#displayName');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill(displayName);
    
    // 持参ボトル数を入力
    if (bottleCount > 0) {
      const countInput = this.page.locator('input[type="number"]');
      await countInput.waitFor({ state: 'visible', timeout: 10000 });
      await countInput.fill(bottleCount.toString());
      
      // ボトルラベルを入力（ラベル入力フィールドが表示されるまで待つ）
      await this.page.waitForTimeout(500); // ラベル入力フィールドが表示されるまで少し待つ
      
      for (let i = 0; i < labels.length; i++) {
        const labelInput = this.page.locator('input[placeholder^="Sample"]').nth(i);
        await labelInput.waitFor({ state: 'visible', timeout: 10000 });
        await labelInput.fill(labels[i]);
      }
    }
    
    // 参加登録ボタンをクリック
    const submitButton = this.page.locator('button:has-text("参加登録する")');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.click();
    
    // セッションページにリダイレクトされるまで待つ
    await this.page.waitForURL(/\/session\/[a-f0-9-]+/, { timeout: 30000 });
    
    // participant_tokenをlocalStorageから取得
    const participantToken = await this.page.evaluate((jt) => {
      if (!jt) return null;
      return localStorage.getItem(`bd:participant_token:${jt}`);
    }, joinToken);
    
    return { participantToken };
  }

  /**
   * デバッグ用：模擬参加者を作成する
   */
  async createMockParticipant(joinToken: string, displayName: string, bottleCount: number = 0, labels: string[] = []): Promise<{ participantToken: string; participantId: string }> {
    const response = await this.page.request.post('/api/participants/create-mock', {
      data: {
        join_token: joinToken,
        display_name: displayName,
        brought_count: bottleCount,
        bottle_labels: labels,
      },
    });

    if (!response.ok()) {
      const error = await response.json();
      const errorMessage = error.details 
        ? `模擬参加者の作成に失敗しました: ${error.error} (詳細: ${error.details})`
        : `模擬参加者の作成に失敗しました: ${error.error}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // 参加者がデータベースに反映されるまで少し待つ
    await this.page.waitForTimeout(1000);
    
    return {
      participantToken: result.data.participant_token,
      participantId: result.data.participant_id,
    };
  }

  /**
   * PresenterのSample IDを取得する
   */
  async getSampleIdForPresenter(ownerToken: string, presenterId?: string): Promise<string | null> {
    const response = await this.page.request.get(`/api/owner/get-samples?owner_token=${ownerToken}`);
    if (!response.ok()) {
      return null;
    }
    const result = await response.json().catch(() => ({}));
    const samples = result?.data?.samples || [];
    const target =
      (presenterId
        ? samples.find((sample: any) => sample.presenter_participant_id === presenterId)
        : null) ?? samples[0];
    return target?.id || null;
  }

  /**
   * オーナーページで参加者が表示されるまで待つ
   */
  async waitForParticipantsToAppear(ownerToken: string, expectedCount: number = 1, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    let lastError: string | null = null;
    
    while (Date.now() - startTime < timeout) {
      if (this.page.isClosed()) {
        throw new Error('ページが閉じられました');
      }
      
      try {
        // オーナーページのAPIを直接呼び出して参加者を確認
        const response = await this.page.request.get(`/api/owner/get-participants?owner_token=${ownerToken}`);
        
        if (response.ok()) {
          const result = await response.json();
          const participants = result.data?.participants || [];
          
          if (participants.length >= expectedCount) {
            // 参加者が表示されるまで少し待つ（UI更新のため）
            if (!this.page.isClosed()) {
              await this.page.waitForTimeout(1000);
            }
            return;
          }
          
          lastError = `参加者数が不足しています（現在: ${participants.length}人、期待: ${expectedCount}人）`;
        } else {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          lastError = `APIエラー: ${error.error || 'Unknown'}`;
        }
      } catch (error) {
        lastError = `リクエストエラー: ${error instanceof Error ? error.message : String(error)}`;
      }
      
      // 少し待ってから再試行
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(1000);
      } else {
        break;
      }
    }
    
    throw new Error(`参加者が表示されるまで待機がタイムアウトしました（期待: ${expectedCount}人）。最後のエラー: ${lastError || 'Unknown'}`);
  }

  /**
   * 参加登録を締め切る
   */
  async closeRegistration(ownerToken: string, joinToken?: string) {
    // まず、参加者が表示されるまで待つ（APIで確認）
    await this.waitForParticipantsToAppear(ownerToken, 1, 30000);

    const response = await this.page.request.post('/api/owner/close-registration', {
      data: { owner_token: ownerToken },
    });
    if (!response.ok()) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`参加登録の締切に失敗しました: ${error?.error || response.status()}`);
    }

    if (joinToken) {
      const start = Date.now();
      while (Date.now() - start < 15000) {
        const sessionResponse = await this.page.request.get(`/api/session/get?join_token=${joinToken}`);
        const sessionResult = await sessionResponse.json().catch(() => ({}));
        if (sessionResult?.data?.state === 'ordering') {
          break;
        }
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Sessionを開始する（Owner）
   */
  async startSession(ownerToken: string, joinToken?: string) {
    const response = await this.page.request.post('/api/owner/start-session', {
      data: { owner_token: ownerToken },
    });
    if (!response.ok()) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Session開始に失敗しました: ${error?.error || response.status()}`);
    }

    if (joinToken) {
      const start = Date.now();
      while (Date.now() - start < 15000) {
        const sessionResponse = await this.page.request.get(`/api/session/get?join_token=${joinToken}`);
        const sessionResult = await sessionResponse.json().catch(() => ({}));
        if (sessionResult?.data?.state === 'running') {
          break;
        }
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Roundを開始する（Presenter）
   */
  async startRound(joinToken: string, sampleId: string, participantToken: string) {
    // participant_tokenをlocalStorageに設定
    await this.page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();
    
    const startButton = this.page.locator('button:has-text("Roundを開始する")');
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    }

    // 念のためAPIでも開始（既にansweringなら無視）
    const response = await this.page.request.post('/api/round/start', {
      data: {
        participant_token: participantToken,
        sample_id: sampleId,
      },
    });
    if (!response.ok()) {
      const error = await response.json().catch(() => ({}));
      if (error?.code !== 'INVALID_STATE') {
        throw new Error(`Round開始に失敗しました: ${error?.error || response.status()}`);
      }
    }
    await this.page.waitForTimeout(2000);

    // 状態がansweringになるまで確認
    const verifyStart = Date.now();
    let lastState: string | undefined;
    while (Date.now() - verifyStart < 20000) {
      const statusResponse = await this.page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      lastState = statusResult?.data?.state;
      if (lastState === 'answering') {
        break;
      }
      await this.page.waitForTimeout(1000);
    }

    if (lastState !== 'answering') {
      throw new Error(`Round状態がansweringになりませんでした: ${lastState || 'unknown'}`);
    }
  }

  /**
   * 回答を入力する
   */
  async submitAnswer(
    joinToken: string,
    sampleId: string,
    participantToken: string,
    answer: {
      cask?: string;
      region?: string;
      age?: number;
      abv?: number;
      distillery?: string;
      score?: number;
    }
  ) {
    // Roundがansweringになるまで待機（遷移遅延対策）
    const waitStart = Date.now();
    while (Date.now() - waitStart < 20000) {
      const statusResponse = await this.page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      if (statusResult?.data?.state === 'answering') {
        break;
      }
      await this.page.waitForTimeout(1000);
    }

    await this.page.goto(`/session/${joinToken}/round/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();
    
    if (answer.cask) {
      await this.page.selectOption('select[name*="cask"]', answer.cask);
    }
    if (answer.region) {
      await this.page.selectOption('select[name*="region"]', answer.region);
    }
    if (answer.age) {
      await this.page.fill('input[name*="age"]', answer.age.toString());
    }
    if (answer.abv) {
      await this.page.fill('input[name*="abv"]', answer.abv.toString());
    }
    if (answer.distillery) {
      await this.page.fill('input[name*="distillery"]', answer.distillery);
    }
    if (answer.score) {
      await this.page.fill('input[name*="score"]', answer.score.toString());
    }
    
    await this.page.click('button:has-text("提出する")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * Truthを入力する（Presenter）
   */
  async submitTruth(
    joinToken: string,
    sampleId: string,
    participantToken: string,
    truth: {
      cask?: string;
      region?: string;
      age?: number;
      abv?: number;
      distillery?: string;
    }
  ) {
    await this.page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();
    
    if (truth.cask) {
      await this.page.selectOption('select[name*="cask"]', truth.cask);
    }
    if (truth.region) {
      await this.page.selectOption('select[name*="region"]', truth.region);
    }
    if (truth.age) {
      await this.page.fill('input[name*="age"]', truth.age.toString());
    }
    if (truth.abv) {
      await this.page.fill('input[name*="abv"]', truth.abv.toString());
    }
    if (truth.distillery) {
      await this.page.fill('input[name*="distillery"]', truth.distillery);
    }
    
    await this.page.click('button:has-text("正解情報を保存")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * 採点する（Presenter）
   */
  async gradeParticipant(
    joinToken: string,
    sampleId: string,
    participantToken: string,
    participantId: string,
    isCorrect: boolean
  ) {
    await this.page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();
    
    // 採点ボタン（正解・不正解）
    if (isCorrect) {
      await this.page.locator('button:has-text("正解")').first().click();
    } else {
      await this.page.locator('button:has-text("不正解")').first().click();
    }
    await this.page.waitForTimeout(1000);
  }

  /**
   * 採点を完了させる（Presenter）
   */
  async ensureAllGraded(joinToken: string, sampleId: string, participantToken: string) {
    const statusResponse = await this.requestGetWithRetry(
      `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`
    );
    if (!statusResponse.ok()) {
      return;
    }
    const statusResult = await statusResponse.json().catch(() => ({}));
    if (statusResult?.data?.all_graded) {
      return;
    }

    const participants = statusResult?.data?.participant_progress || [];
    for (const participant of participants) {
      await this.page.request.post('/api/distillery/grade', {
        data: {
          participant_token: participantToken,
          sample_id: sampleId,
          target_participant_id: participant.participant_id,
          is_correct: true,
        },
      });
    }
  }

  /**
   * Roundを終了する（Presenter）
   */
  async finishRound(joinToken: string, sampleId: string, participantToken: string) {
    await this.page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();

    await this.ensureAllGraded(joinToken, sampleId, participantToken);
    await this.page.click('button:has-text("Roundを終了する")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * 結果を公開する（Owner）
   */
  async publishResults(ownerToken: string) {
    await this.page.goto(`/o/${ownerToken}`);
    await this.page.click('button:has-text("結果を公開する")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * Toast通知を待つ
   */
  async waitForToast(message: string, timeout = 5000) {
    await this.page.waitForSelector(`text=${message}`, { timeout });
  }

  /**
   * エラーがないことを確認
   */
  async assertNoErrors() {
    const errorMessages = await this.page.locator('text=/エラー|error|Error/').count();
    expect(errorMessages).toBe(0);
  }
}
