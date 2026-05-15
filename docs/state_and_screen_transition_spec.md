# 状態遷移・画面遷移仕様書

## 概要

本ドキュメントは、Blind Dramアプリケーションにおける状態遷移と画面遷移の条件を明確に定義します。

## 1. Session状態とSample状態

### 1.1 Session状態

| 状態 | 状態名 | 説明 |
|------|--------|------|
| `created` | 作成直後 | セッション作成直後 |
| `registering` | 参加登録中 | 参加者登録受付中 |
| `ordering` | 順番決め中 | サンプル順番決め中 |
| `running` | 進行中 | ラウンド進行中 |
| `aggregating` | 集計中 | 全ラウンド完了後、最終結果公開前 |
| `published` | 結果公開済み | 最終結果が公開された状態 |
| `closed` | 終了 | セッション終了 |

### 1.2 Sample状態

| 状態 | 状態名 | 説明 |
|------|--------|------|
| `pending` | 待機中 | まだ開始されていない |
| `answering` | 回答受付中 | 参加者が回答を提出中 |
| `grading` | 採点中 | プレゼンターが採点中 |
| `revealed` | 公開済み（逐次モードのみ） | 中間結果が公開された状態 |
| `closed` | 終了 | ラウンド終了（一斉モードのみ、または逐次モードで最後の結果確認後） |

## 2. 画面遷移条件

### 2.1 SessionHomePage (`/session/[joinToken]`)

#### 表示条件

| Session状態 | 表示内容 | 条件 |
|------------|---------|------|
| `created` | エラー画面 | 通常はこの状態でアクセスされない |
| `registering` | 参加登録画面 | 参加者トークンがない場合は参加登録ページへリダイレクト |
| `ordering` | 待機画面 | 「順番決め中です。しばらくお待ちください」 |
| `running` | セッションホーム | 現在のラウンド情報、回答入力など |
| `aggregating` | 集計待ち画面 | 「結果を集計しています。しばらくお待ちください」 |
| `published` | **結果ページへ自動リダイレクト** | `/session/[joinToken]/results` |
| `closed` | 結果ページ | 結果を閲覧可能 |

#### running状態での詳細表示条件

##### 逐次モード（Sequential）

| 現在のSample状態 | 自分のロール | 表示内容 |
|----------------|------------|---------|
| `pending` | Presenter（現在のSample） | Presenterパネルへのリンク |
| `pending` | Presenter（次のSample） | **条件次第**（後述） |
| `pending` | 参加者 | 「プレゼンターがRoundを開始するまでお待ちください」 |
| `answering` | Presenter（現在のSample） | Presenterパネルへのリンク |
| `answering` | Presenter（次のSample） | 待機メッセージ「次のラウンド待機中」 |
| `answering` | 参加者 | 回答入力カード |
| `grading` | Presenter（現在のSample） | Presenterパネルへのリンク |
| `grading` | Presenter（次のSample） | 待機メッセージ「次のラウンド待機中」 |
| `grading` | 参加者 | 「採点中です。しばらくお待ちください」 |
| `revealed` | 全員 | **結果ページへ自動リダイレクト** | `/session/[joinToken]/round-result/[sampleId]` |
| `closed` | 全員 | 次のSampleへ（まだある場合）または集計待ち |

##### 一斉モード（Simultaneous）

| 現在のSample状態 | 自分のロール | 表示内容 |
|----------------|------------|---------|
| `pending` | Presenter | Presenterパネルへのリンク（すべてのSample） |
| `pending` | 参加者 | 「プレゼンターがRoundを開始するまでお待ちください」 |
| `answering` | Presenter | Presenterパネルへのリンク（担当するすべてのSample） |
| `answering` | 参加者 | 回答入力カード（すべてのSampleに回答可能） |
| `grading` | Presenter | Presenterパネルへのリンク（担当するすべてのSample） |
| `grading` | 参加者 | 「採点中です。しばらくお待ちください」 |
| `closed` | 全員 | 次のSampleへ（まだある場合）または集計待ち |

##### 逐次モードでの「次のSampleのPresenter」表示条件

**重要**: 次のSampleのPresenterパネルへのリンクを表示する条件：

```
条件 = (次のSampleが存在する) AND
       (次のSampleのstate === 'pending') AND
       (
         (session.mode === 'simultaneous') OR
         (
           (session.mode === 'sequential') AND
           (前のSampleが存在しない OR 前のSample.state === 'closed') AND
           (前のSampleがない OR 前のSampleで全員が「次へ」を押した)
         )
       )
```

つまり：
- **一斉モード**: 常に次のSampleのPresenterパネルへのリンクを表示可能
- **逐次モード**: 前のSampleが`closed`状態で、かつ全員が「次へ」を押すまで、次のSampleのPresenterパネルへのリンクを表示**しない**

### 2.2 Presenterパネル (`/session/[joinToken]/presenter/[sampleId]`)

#### アクセス制御

**前提条件**:
- 参加者トークンが有効であること
- 該当SampleのPresenter権限があること（`participant_id === sample.presenter_participant_id`）

#### 画面遷移条件

| Sample状態 | 逐次モードでの追加条件 | 表示内容 |
|-----------|-------------------|---------|
| `pending` | **前のSampleが`closed`で全員が「次へ」を押した** | Round開始画面（開始ボタンは条件次第で無効化） |
| `pending` | 上記条件を満たさない | **待機画面**（「前のラウンド完了待ち」） |
| `answering` | なし | Truth入力、提出状況確認、提出済み回答閲覧 |
| `grading` | なし | 採点画面（全員採点済みでRound終了可能） |
| `revealed` | なし | **結果ページへ自動リダイレクト** | `/session/[joinToken]/round-result/[sampleId]` |
| `closed` | なし | 次のSampleへ（まだある場合）または集計待ち |

#### 待機画面の表示条件（逐次モードのみ）

```
条件 = (session.mode === 'sequential') AND
       (sample.state === 'pending') AND
       NOT (
         (前のSampleが存在しない) OR
         (
           (前のSample.state === 'closed') AND
           (前のSampleで全員が「次へ」を押した)
         )
       )
```

待機画面では：
- 「前のラウンド完了待ち」メッセージを表示
- Round開始ボタンは表示しない
- 「セッションページに戻る」ボタンを表示

### 2.3 回答入力画面 (`/session/[joinToken]/round/[sampleId]`)

#### アクセス制御

**前提条件**:
- 参加者トークンが有効であること
- Sample状態が`answering`であること
- 自分の担当Sampleでないこと（Presenterは回答入力しない）

#### 画面遷移

| Sample状態 | 遷移先 |
|-----------|--------|
| `answering` | そのまま回答入力画面を表示 |
| `grading` | **セッションページへリダイレクト** |
| `revealed` | **結果ページへリダイレクト** | `/session/[joinToken]/round-result/[sampleId]` |

### 2.4 結果ページ (`/session/[joinToken]/round-result/[sampleId]`)

#### アクセス制御

**前提条件**:
- Sample状態が`revealed`であること（逐次モード）
- Session状態が`published`であること（最終結果）

#### 画面遷移

| Session状態 | Sample状態 | 遷移先 |
|------------|-----------|--------|
| `running` | `revealed` | そのまま結果ページを表示 |
| `running` | `closed` | **セッションページへリダイレクト** |
| `published` | なし | そのまま最終結果ページを表示 |

### 2.5 最終結果ページ (`/session/[joinToken]/results`)

#### アクセス制御

**前提条件**:
- Session状態が`published`または`closed`であること

#### 画面遷移

| Session状態 | 遷移先 |
|------------|--------|
| `published` | そのまま結果ページを表示 |
| `closed` | そのまま結果ページを表示 |
| その他 | エラーまたはセッションページへリダイレクト |

## 3. 逐次モードの重要な制約

### 3.1 プレゼンターパネルへのアクセス制御

**絶対条件**:
1. 前のSampleが存在しない場合、または
2. 前のSampleが`closed`状態で、かつ
3. 前のSampleで全員が「次へ」を押した場合

のみ、次のSampleのPresenterパネルにアクセス可能。

### 3.2 チェックポイント

以下の3箇所でチェックが必須：

1. **SessionHomePageでのリンク表示**
   ```typescript
   const canStartPendingSample = myPendingSample && 
     (isPendingSampleReady || session.mode !== 'sequential');
   
   // リンクを表示する条件
   (isMySample || (myPendingSample && canStartPendingSample))
   ```

2. **Presenterパネルページでのアクセス制御**
   ```typescript
   // 待機画面を表示する条件
   if (roundState === 'pending' && 
       sessionMode === 'sequential' && 
       !canStartPendingSample) {
     // 待機画面を表示
   }
   ```

3. **API `/api/round/start`での開始制御**
   ```typescript
   // 前のSampleがclosed状態で全員が「次へ」を押したかチェック
   if (session.mode === 'sequential') {
     // 前のSampleの状態チェック
     // 全員が「次へ」を押したかチェック
   }
   ```

### 3.3 `check-pending-sample-ready` API

`GET /api/session/check-pending-sample-ready?join_token={join_token}&sample_id={sample_id}`

**返り値**:
```json
{
  "success": true,
  "data": {
    "is_ready": boolean  // true: 開始可能, false: 開始不可
  }
}
```

**`is_ready = true`の条件**:
- 逐次モードでない場合: 常に`false`
- 逐次モードの場合:
  - 前のSampleが存在しない場合: `true`（ただし、より前のSampleが完了していない場合は`false`）
  - 前のSampleが`closed`状態で、かつ全員が「次へ」を押した場合: `true`
  - それ以外: `false`

## 4. 画面遷移フロー図

### 4.1 逐次モード - 正常フロー

```
SessionHomePage (/session/[joinToken])
  ├─ [Session状態 = running, Sample状態 = answering]
  │   ├─ Presenter（現在のSample）→ Presenterパネル
  │   └─ 参加者 → 回答入力画面
  │
  ├─ [Sample状態 = revealed]
  │   └─ 全員 → 結果ページ (round-result)
  │       └─ 「次へ」クリック → round_next_clicksに記録
  │           └─ 全員が「次へ」押した → 「次のラウンドへ進む」ボタン表示
  │               └─ クリック → 次のSampleがanswering状態へ
  │
  └─ [Session状態 = published]
      └─ 全員 → 最終結果ページ (results)

Presenterパネル (/session/[joinToken]/presenter/[sampleId])
  ├─ [Sample状態 = pending]
  │   ├─ 前のラウンド完了待ち → 待機画面を表示
  │   └─ 前のラウンド完了済み → Round開始画面
  │
  ├─ [Sample状態 = answering]
  │   └─ Truth入力、提出状況確認
  │
  ├─ [Sample状態 = grading]
  │   └─ 採点画面
  │       └─ Round終了 → Sample状態 = revealed
  │           └─ 自動リダイレクト → 結果ページ (round-result)
  │
  └─ [Sample状態 = revealed]
      └─ 自動リダイレクト → 結果ページ (round-result)
```

### 4.2 一斉モード - 正常フロー

```
SessionHomePage (/session/[joinToken])
  ├─ [Session状態 = running]
  │   ├─ Presenter → Presenterパネル（すべてのSample）
  │   └─ 参加者 → 回答入力画面（すべてのSampleに回答可能）
  │
  └─ [Session状態 = published]
      └─ 全員 → 最終結果ページ (results)

Presenterパネル (/session/[joinToken]/presenter/[sampleId])
  ├─ [Sample状態 = pending]
  │   └─ Round開始画面（常に開始可能）
  │
  ├─ [Sample状態 = answering]
  │   └─ Truth入力、提出状況確認
  │
  ├─ [Sample状態 = grading]
  │   └─ 採点画面
  │       └─ Round終了 → Sample状態 = closed
  │           └─ セッションページへリダイレクト
  │
  └─ [Sample状態 = closed]
      └─ セッションページへリダイレクト
```

## 5. 実装上の重要なチェックポイント

### 5.1 SessionHomePage (`app/session/[joinToken]/page.tsx`)

#### Presenterパネルへのリンク表示条件

```typescript
// 現在のSampleのPresenterの場合
const isMySample = currentSample && 
  participantId && 
  (roundStatus as any).presenter_participant_id === participantId;

// 次のSampleのPresenterの場合（逐次モード）
const myPendingSample = mySamples.find((s) => s.state === 'pending');
const isPendingSampleReady = myPendingSample ? 
  pendingSampleReady[myPendingSample.id] : false;
const canStartPendingSample = myPendingSample && 
  (isPendingSampleReady || session.mode !== 'sequential');

// リンクを表示する条件
if (isMySample || (myPendingSample && canStartPendingSample)) {
  // Presenterパネルへのリンクを表示
}
```

#### 待機メッセージ表示条件

```typescript
if (myPendingSample && !canStartPendingSample && 
    session.mode === 'sequential') {
  // 「次のラウンド待機中」メッセージを表示
}
```

### 5.2 Presenterパネル (`app/session/[joinToken]/presenter/[sampleId]/page.tsx`)

#### 待機画面表示条件

```typescript
// 逐次モードでpending状態の場合、前のラウンドが完了していない場合は待機画面を表示
if (roundState === 'pending' && 
    sessionMode === 'sequential' && 
    !canStartPendingSample) {
  // 待機画面を表示
  return (
    <div>
      {/* 待機画面の内容 */}
    </div>
  );
}
```

### 5.3 API `/api/round/start` (`app/api/round/start/route.ts`)

#### 開始制御条件

```typescript
// 逐次モードの場合、前のラウンドがclosed状態で全員が「次へ」を押すまで開始できない
if (session.mode === 'sequential') {
  // 前のSampleを取得
  const previousSample = /* ... */;
  
  // 前のSampleがclosed状態かチェック
  if (previousSample && previousSample.state !== 'closed') {
    return errorResponse('前のラウンドが完了していません', ...);
  }
  
  // 全員が「次へ」を押したかチェック
  const allClicked = /* ... */;
  if (!allClicked) {
    return errorResponse('前のラウンドの結果確認が完了していません', ...);
  }
}
```

## 6. バグ修正のチェックリスト

### 6.1 プレゼンターパネルが表示されてしまう問題

以下の3箇所すべてで正しくチェックされているか確認：

- [ ] SessionHomePageで`canStartPendingSample`が正しく計算されている
- [ ] Presenterパネルページで待機画面の条件が正しく動作している
- [ ] API `/api/round/start`で開始制御が正しく動作している

### 6.2 `check-pending-sample-ready` APIの動作確認

- [ ] 前のSampleが`closed`状態であることをチェックしている
- [ ] 前のSampleで全員が「次へ」を押したことをチェックしている
- [ ] 最初のSample（前のSampleがない場合）の処理が正しい

### 6.3 画面遷移の動作確認

- [ ] Sample状態が`revealed`の場合、自動的に結果ページへリダイレクトされる
- [ ] Session状態が`published`の場合、自動的に結果ページへリダイレクトされる
- [ ] 待機画面から「セッションページに戻る」ボタンが正しく動作する

## 7. テストシナリオ

### 7.1 逐次モード - 正常フロー

1. SessionHomePageで次のSampleのPresenterパネルへのリンクが表示されない（前のラウンド未完了時）
2. 前のラウンドが`closed`状態で全員が「次へ」を押すまで、次のSampleのPresenterパネルに直接アクセスしても待機画面が表示される
3. 前のラウンドが完了した後、SessionHomePageで次のSampleのPresenterパネルへのリンクが表示される
4. PresenterパネルでRound開始ボタンが有効になる

### 7.2 エラーケース

1. 前のラウンドが`closed`状態でない場合、`/api/round/start`が409エラーを返す
2. 全員が「次へ」を押していない場合、`/api/round/start`が409エラーを返す
3. 待機画面が正しく表示される

## 8. 変更履歴

- 2025-01-XX: 初版作成（状態遷移と画面遷移の条件を明確化）
