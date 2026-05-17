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
      /** API/型エイリアス（古いテスト互換） */
      guessed_cask?: string;
      guessed_region?: string;
      guessed_age?: number;
      guessed_abv?: number;
      guessed_distillery?: string;
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

    const cask = answer.cask ?? answer.guessed_cask;
    const region = answer.region ?? answer.guessed_region;
    const age = answer.age ?? answer.guessed_age;
    const abv = answer.abv ?? answer.guessed_abv;
    const distillery = answer.distillery ?? answer.guessed_distillery;

    await this.page.waitForSelector('select[name="guessed_cask"], input[name="guessed_cask"]', { timeout: 30000 });

    if (cask) {
      const caskLoc = this.page.locator('select[name="guessed_cask"], input[name="guessed_cask"]').first();
      const tag = await caskLoc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        await caskLoc.selectOption({ label: cask });
      } else {
        await caskLoc.fill(cask);
      }
    }
    if (region) {
      const regionLoc = this.page.locator('select[name="guessed_region"], input[name="guessed_region"]').first();
      const tag = await regionLoc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        await regionLoc.selectOption({ label: region });
      } else {
        await regionLoc.fill(region);
      }
    }
    if (age != null) {
      await this.page.fill('input[name="guessed_age"]', String(age));
    }
    if (abv != null) {
      await this.page.fill('input[name="guessed_abv"]', String(abv));
    }
    if (distillery) {
      await this.page.fill('input[name="guessed_distillery"]', distillery);
    }
    if (answer.score) {
      await this.page.fill('input[name*="score"]', answer.score.toString());
    }
    
    await this.page.click('button:has-text("提出する")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * Round 画面で推測＋Nose の Tier1 を UI で選択し、下書き保存はせず
   * サイレントポーリング（約3秒）を踏んだ後に提出する。
   * ※一般参加者向け Round の退行防止用。プレゼンターの本番フローは Presenter パネルでのテイスティング保存。
   */
  async submitAnswerWithNoseTier1AfterPoll(
    joinToken: string,
    sampleId: string,
    participantToken: string,
    answer: {
      guessed_cask?: string;
      guessed_region?: string;
      guessed_age?: number;
      guessed_abv?: number;
      guessed_distillery?: string;
    },
    noseTier1Label: string,
    /** ポーリングを挟む待機 ms（デフォルト 4000） */
    waitBeforeSubmitMs = 4000,
  ) {
    const waitStart = Date.now();
    while (Date.now() - waitStart < 20000) {
      const statusResponse = await this.page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`,
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

    await this.page.waitForSelector('select[name="guessed_cask"], input[name="guessed_cask"]', {
      timeout: 30000,
    });

    const cask = answer.guessed_cask;
    const region = answer.guessed_region;
    const age = answer.guessed_age;
    const abv = answer.guessed_abv;
    const distillery = answer.guessed_distillery;

    if (cask) {
      const caskLoc = this.page.locator('select[name="guessed_cask"], input[name="guessed_cask"]').first();
      const tag = await caskLoc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        await caskLoc.selectOption({ label: cask });
      } else {
        await caskLoc.fill(cask);
      }
    }
    if (region) {
      const regionLoc = this.page.locator('select[name="guessed_region"], input[name="guessed_region"]').first();
      const tag = await regionLoc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        await regionLoc.selectOption({ label: region });
      } else {
        await regionLoc.fill(region);
      }
    }
    if (age != null) {
      await this.page.fill('input[name="guessed_age"]', String(age));
    }
    if (abv != null) {
      await this.page.fill('input[name="guessed_abv"]', String(abv));
    }
    if (distillery) {
      await this.page.fill('input[name="guessed_distillery"]', distillery);
    }

    const noseSection = this.page.locator('#section-nose');
    await noseSection.getByRole('button', { name: noseTier1Label, exact: true }).click();

    await this.page.waitForTimeout(waitBeforeSubmitMs);

    await this.page.click('button:has-text("提出する")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * Presenterパネルで「テイスティング（任意）」を開き、Nose の Tier1 を選んで「テイスティングを保存」する。
   * 想定: grading かつプレゼンター本人が提出済み（正解保存後など）。
   */
  async savePresenterNoseTier1ViaPresenterPanel(
    joinToken: string,
    sampleId: string,
    participantToken: string,
    noseTier1Label: string,
    waitBeforeSaveMs = 4000,
  ) {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const statusResponse = await this.page.request.get(
        `/api/round/status?sample_id=${sampleId}&participant_token=${participantToken}`,
      );
      const statusResult = await statusResponse.json().catch(() => ({}));
      if (statusResult?.data?.state === 'grading') break;
      await this.page.waitForTimeout(800);
    }

    await this.page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();

    await this.page.getByRole('heading', { name: 'Presenterパネル' }).waitFor({ timeout: 30000 });

    await this.page.locator('#presenter-tasting-toggle').click();

    const noseSection = this.page.locator('#section-presenter-nose');
    await noseSection.getByRole('button', { name: noseTier1Label, exact: true }).click();

    await this.page.waitForTimeout(waitBeforeSaveMs);

    await this.page.getByRole('button', { name: 'テイスティングを保存' }).click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * 提出済み回答にテイスティング（nose/palate/finish）だけを API でマージ
   */
  async mergeAnswerTastingViaApi(
    sampleId: string,
    participantToken: string,
    tasting: {
      nose?: Record<string, unknown>;
      palate?: Record<string, unknown>;
      finish?: Record<string, unknown>;
    },
  ) {
    const getRes = await this.page.request.get(
      `/api/answers/get?sample_id=${encodeURIComponent(sampleId)}&participant_token=${encodeURIComponent(participantToken)}`,
    );
    const body = await getRes.json().catch(() => ({}));
    if (!getRes.ok()) {
      throw new Error(`answers/get: ${(body as { error?: string })?.error || getRes.status()}`);
    }
    const a = (body as { data?: { answer?: Record<string, unknown> } })?.data?.answer;
    if (!a) throw new Error('mergeAnswerTastingViaApi: 回答が見つかりません');

    const postRes = await this.page.request.post('/api/answers/upsert', {
      data: {
        participant_token: participantToken,
        sample_id: sampleId,
        status: a.status,
        guessed_cask: a.guessed_cask,
        guessed_region: a.guessed_region,
        guessed_age: a.guessed_age,
        guessed_abv: a.guessed_abv,
        guessed_distillery: a.guessed_distillery,
        guessed_other1: a.guessed_other1 ?? null,
        guessed_other2: a.guessed_other2 ?? null,
        nose: tasting.nose ?? a.nose ?? null,
        palate: tasting.palate ?? a.palate ?? null,
        finish: tasting.finish ?? a.finish ?? null,
        score_0_100: a.score_0_100 ?? null,
      },
    });
    if (!postRes.ok()) {
      const err = await postRes.json().catch(() => ({}));
      throw new Error(`answers/upsert: ${(err as { error?: string })?.error || postRes.status()}`);
    }
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
      true_cask?: string;
      true_region?: string;
      true_age?: number;
      true_abv?: number;
      true_distillery?: string;
    }
  ) {
    await this.page.goto(`/session/${joinToken}/presenter/${sampleId}`);
    await this.page.evaluate(({ token, jt }) => {
      localStorage.setItem(`bd:participant_token:${jt}`, token);
    }, { token: participantToken, jt: joinToken });
    await this.page.reload();

    const cask = truth.cask ?? truth.true_cask;
    const region = truth.region ?? truth.true_region;
    const age = truth.age ?? truth.true_age;
    const abv = truth.abv ?? truth.true_abv;
    const distillery = truth.distillery ?? truth.true_distillery;

    await this.page.waitForSelector('select[name="true_cask"], input[name="true_cask"]', { timeout: 30000 });

    if (cask) {
      const caskLoc = this.page.locator('select[name="true_cask"], input[name="true_cask"]').first();
      const tag = await caskLoc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        await caskLoc.selectOption({ label: cask });
      } else {
        await caskLoc.fill(cask);
      }
    }
    if (region) {
      const regionLoc = this.page.locator('select[name="true_region"], input[name="true_region"]').first();
      const tag = await regionLoc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        await regionLoc.selectOption({ label: region });
      } else {
        await regionLoc.fill(region);
      }
    }
    if (age != null) {
      await this.page.fill('input[name="true_age"]', String(age));
    }
    if (abv != null) {
      await this.page.fill('input[name="true_abv"]', String(abv));
    }
    if (distillery) {
      await this.page.fill('input[name="true_distillery"]', distillery);
    }

    await this.page.click('button:has-text("正解情報を保存")');
    await this.page.waitForTimeout(2000);
  }

  /**
   * 蒸留所など手採点を API で記録する（grading 中のみ）
   */
  async postDistilleryGrade(
    presenterToken: string,
    sampleId: string,
    targetParticipantId: string,
    isCorrect: boolean
  ) {
    const response = await this.page.request.post('/api/distillery/grade', {
      data: {
        participant_token: presenterToken,
        sample_id: sampleId,
        target_participant_id: targetParticipantId,
        is_correct: isCorrect,
      },
    });
    if (!response.ok()) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`採点API失敗: ${err?.error || response.status()}`);
    }
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
