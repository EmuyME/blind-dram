# 状態遷移仕様書

## 概要

本ドキュメントは、Blind Dramアプリケーションにおける逐次モードと一斉モードの理想的な状態遷移、トリガー、条件を定義します。

## 用語定義

### Session状態
- `registering`: 参加者登録中
- `ordering`: サンプル順番決め中
- `running`: セッション実行中（ラウンド進行中）
- `aggregating`: 集計中（全ラウンド完了後、最終結果公開前）
- `published`: 最終結果公開済み
- `closed`: セッション終了

### Sample状態
- `pending`: 待機中（まだ開始されていない）
- `answering`: 回答受付中（参加者が回答を提出中）
- `grading`: 採点中（プレゼンターが採点中）
- `revealed`: 公開済み（逐次モードのみ、中間結果が公開された状態）
- `closed`: 終了（一斉モードのみ、ラウンド終了後）

## 逐次モード（Sequential Mode）

### 特徴
- 1つのサンプルずつ順番に進行
- 各ラウンド終了後に中間結果を表示
- 全員が「次へ」を押すまで次のラウンドに進まない

### Session状態遷移

```
registering → ordering → running → aggregating → published → closed
```

#### 状態遷移の詳細

1. **registering → ordering**
   - **トリガー**: オーナーが「参加登録を締め切る」をクリック
   - **条件**: 
     - 参加者が1人以上登録されている
     - セッション状態が`registering`
   - **API**: `POST /api/owner/close-registration`

2. **ordering → running**
   - **トリガー**: オーナーが「Sessionを開始する」をクリック
   - **条件**:
     - すべてのサンプルの順番が決定されている（`sort_order`が設定されている）
     - セッション状態が`ordering`
   - **API**: `POST /api/owner/start-session`
   - **副作用**: 最初のサンプル（`sort_order`が最小）が`answering`状態に遷移

3. **running → aggregating**
   - **トリガー**: すべてのサンプルが完了したとき
   - **条件**:
     - すべてのサンプルが`revealed`状態
     - セッション状態が`running`
   - **API**: `POST /api/session/check-complete` または `POST /api/round-result/start-next`（最後のラウンドで次のサンプルがない場合）

4. **aggregating → published**
   - **トリガー**: オーナーが「結果を公開する」をクリック
   - **条件**:
     - セッション状態が`aggregating`
   - **API**: `POST /api/owner/publish`

5. **published → closed**
   - **トリガー**: オーナーが「セッションを終了する」をクリック
   - **条件**:
     - セッション状態が`published`
   - **API**: `POST /api/owner/force-close`

### Sample状態遷移

```
pending → answering → grading → revealed → (次のサンプルへ)
```

#### 状態遷移の詳細

1. **pending → answering**
   - **トリガー**: 
     - 最初のサンプル: セッション開始時（自動）
     - 2番目以降のサンプル: 全員が「次へ」を押した後、「次のラウンドへ進む」ボタンをクリック
   - **条件**:
     - サンプル状態が`pending`
     - 前のサンプルが`revealed`状態（2番目以降の場合）
     - 前のサンプルで全員が「次へ」を押している（2番目以降の場合）
   - **API**: 
     - 最初のサンプル: `POST /api/owner/start-session`
     - 2番目以降: `POST /api/round-result/start-next`
   - **権限**: 
     - 最初のサンプル: オーナーのみ
     - 2番目以降: 参加者（全員が「次へ」を押した後）

2. **answering → grading**
   - **トリガー**: 自動（全員提出済み + Truth入力済み）
   - **条件**:
     - サンプル状態が`answering`
     - プレゼンター以外の全参加者が回答を提出済み（`status = 'submitted'`）
     - プレゼンターがTruthを入力済み
   - **API**: `POST /api/answers/upsert` または `POST /api/truths/upsert`（条件満たしたとき自動遷移）
   - **権限**: 自動（条件満たしたとき）

3. **grading → revealed**
   - **トリガー**: プレゼンターが「Roundを終了する」をクリック
   - **条件**:
     - サンプル状態が`grading`
     - プレゼンター以外の全参加者が採点済み（`distillery_grades`テーブルに記録がある）
   - **API**: `POST /api/round/finish`
   - **権限**: プレゼンター（該当サンプルの持ち込み主）のみ
   - **副作用**: 
     - サンプル状態が`revealed`に変更
     - 参加者は自動的に中間結果ページ（`/session/[joinToken]/round-result/[sampleId]`）にリダイレクト

4. **revealed → (次のサンプルへ)**
   - **トリガー**: 全員が「次へ」を押した後、「次のラウンドへ進む」ボタンをクリック
   - **条件**:
     - サンプル状態が`revealed`
     - 全参加者が「次へ」を押している（`round_next_clicks`テーブルに記録がある）
     - 次のサンプルが存在し、`pending`状態
   - **API**: `POST /api/round-result/start-next`
   - **権限**: 参加者（全員が「次へ」を押した後）
   - **副作用**: 
     - 次のサンプルが`answering`状態に遷移
     - 最後のサンプルの場合、セッションが`aggregating`状態に遷移

### 中間結果表示フロー

1. **ラウンド終了時**
   - サンプルが`revealed`状態になると、参加者は自動的に中間結果ページにリダイレクト
   - 中間結果ページでは以下を表示:
     - 現在の順位表（完了したサンプルまでの集計）
     - 当該ラウンドの詳細情報（Truth、参加者別回答、フレーバーレーダー）
     - 「次へ」ボタン

2. **「次へ」ボタンの動作**
   - 各参加者が「次へ」ボタンをクリック
   - クリックは`round_next_clicks`テーブルに記録
   - 全員がクリックすると、「次のラウンドへ進む」ボタンが表示される
   - 「次のラウンドへ進む」ボタンをクリックすると、次のサンプルが`answering`状態に遷移

3. **次のプレゼンターの待機**
   - 次のサンプルのプレゼンターは、前のラウンドで全員が「次へ」を押すまで「Roundを開始」ボタンが表示されない
   - 代わりに「次のラウンド待機中」メッセージが表示される

## 一斉モード（Simultaneous Mode）

### 特徴
- すべてのサンプルを同時に進行
- 中間結果は表示しない
- すべてのラウンド終了後に最終結果のみ表示

### Session状態遷移

```
registering → ordering → running → aggregating → published → closed
```

#### 状態遷移の詳細

1. **registering → ordering**
   - **トリガー**: オーナーが「参加登録を締め切る」をクリック
   - **条件**: 
     - 参加者が1人以上登録されている
     - セッション状態が`registering`
   - **API**: `POST /api/owner/close-registration`

2. **ordering → running**
   - **トリガー**: オーナーが「Sessionを開始する」をクリック
   - **条件**:
     - すべてのサンプルの順番が決定されている（`sort_order`が設定されている）
     - セッション状態が`ordering`
   - **API**: `POST /api/owner/start-session`
   - **副作用**: すべてのサンプルが`answering`状態に遷移（同時に開始）

3. **running → aggregating**
   - **トリガー**: すべてのサンプルが完了したとき
   - **条件**:
     - すべてのサンプルが`closed`状態
     - セッション状態が`running`
   - **API**: `POST /api/session/check-complete`

4. **aggregating → published**
   - **トリガー**: オーナーが「結果を公開する」をクリック
   - **条件**:
     - セッション状態が`aggregating`
   - **API**: `POST /api/owner/publish`

5. **published → closed**
   - **トリガー**: オーナーが「セッションを終了する」をクリック
   - **条件**:
     - セッション状態が`published`
   - **API**: `POST /api/owner/force-close`

### Sample状態遷移

```
pending → answering → grading → closed
```

#### 状態遷移の詳細

1. **pending → answering**
   - **トリガー**: セッション開始時（自動、すべてのサンプルが同時に）
   - **条件**:
     - サンプル状態が`pending`
     - セッション状態が`ordering`から`running`に遷移
   - **API**: `POST /api/owner/start-session`
   - **権限**: オーナーのみ
   - **注意**: すべてのサンプルが同時に`answering`状態になる

2. **answering → grading**
   - **トリガー**: 自動（全員提出済み + Truth入力済み）
   - **条件**:
     - サンプル状態が`answering`
     - プレゼンター以外の全参加者が回答を提出済み（`status = 'submitted'`）
     - プレゼンターがTruthを入力済み
   - **API**: `POST /api/answers/upsert` または `POST /api/truths/upsert`（条件満たしたとき自動遷移）
   - **権限**: 自動（条件満たしたとき）
   - **注意**: 各サンプルは独立して遷移する（他のサンプルの状態に依存しない）

3. **grading → closed**
   - **トリガー**: プレゼンターが「Roundを終了する」をクリック
   - **条件**:
     - サンプル状態が`grading`
     - プレゼンター以外の全参加者が採点済み（`distillery_grades`テーブルに記録がある）
   - **API**: `POST /api/round/finish`
   - **権限**: プレゼンター（該当サンプルの持ち込み主）のみ
   - **副作用**: 
     - サンプル状態が`closed`に変更
     - 中間結果は表示されない（最終結果のみ）

## 状態遷移図

### 逐次モード

```
Session: registering → ordering → running → aggregating → published → closed
                                                              ↑
                                                              |
Sample1: pending → answering → grading → revealed ──────────┘
Sample2: pending ────────────→ answering → grading → revealed ──┘
Sample3: pending ───────────────────────→ answering → grading → revealed ──┘
...
```

### 一斉モード

```
Session: registering → ordering → running → aggregating → published → closed
                                                              ↑
                                                              |
Sample1: pending → answering → grading → closed ─────────────┘
Sample2: pending → answering → grading → closed ─────────────┘
Sample3: pending → answering → grading → closed ─────────────┘
...
（すべて同時に進行）
```

## 重要な制約とルール

### 逐次モード

1. **順次進行の保証**
   - 前のサンプルが`revealed`状態になるまで、次のサンプルは`answering`状態にならない
   - 全員が「次へ」を押すまで、次のサンプルは開始されない

2. **中間結果の表示**
   - 各サンプルが`revealed`状態になると、中間結果ページが表示される
   - 中間結果ページでは「次へ」ボタンが必須

3. **次のプレゼンターの保護**
   - 前のラウンドで全員が「次へ」を押すまで、次のサンプルのプレゼンターは「Roundを開始」ボタンを表示しない

### 一斉モード

1. **同時進行の保証**
   - すべてのサンプルが同時に`answering`状態になる
   - 各サンプルは独立して進行する（他のサンプルの状態に依存しない）

2. **中間結果の非表示**
   - 中間結果は表示されない
   - すべてのサンプルが`closed`状態になった後、最終結果のみ表示

3. **並行処理**
   - 複数のサンプルが同時に`answering`、`grading`、`closed`状態になることがある

## エラーケースと例外処理

### 共通

1. **状態不一致エラー**
   - 不正な状態からの遷移を試みた場合、エラーを返す
   - 例: `grading`状態のサンプルに対して`answering`への遷移を試みる

2. **権限エラー**
   - 適切な権限がない場合、エラーを返す
   - 例: プレゼンター以外が`grading`→`revealed`/`closed`への遷移を試みる

3. **条件未満足エラー**
   - 必要な条件が満たされていない場合、エラーを返す
   - 例: 全員が提出していない状態で`answering`→`grading`への遷移を試みる

### 逐次モード固有

1. **前のラウンド未完了エラー**
   - 前のサンプルが`revealed`状態でない場合、次のサンプルを開始できない

2. **「次へ」未完了エラー**
   - 全員が「次へ」を押していない場合、「次のラウンドへ進む」ボタンは機能しない

## APIエンドポイント一覧

### Session状態遷移

- `POST /api/owner/close-registration`: `registering` → `ordering`
- `POST /api/owner/start-session`: `ordering` → `running`
- `POST /api/session/check-complete`: `running` → `aggregating`（自動チェック）
- `POST /api/owner/publish`: `aggregating` → `published`
- `POST /api/owner/force-close`: `published` → `closed`

### Sample状態遷移（逐次モード）

- `POST /api/owner/start-session`: 最初のサンプル `pending` → `answering`
- `POST /api/round-result/start-next`: 2番目以降のサンプル `pending` → `answering`
- `POST /api/answers/upsert` または `POST /api/truths/upsert`: `answering` → `grading`（自動）
- `POST /api/round/finish`: `grading` → `revealed`
- `POST /api/round-result/click-next`: 「次へ」クリックの記録
- `POST /api/round-result/start-next`: `revealed` → 次のサンプル `answering`（またはセッション `aggregating`）

### Sample状態遷移（一斉モード）

- `POST /api/owner/start-session`: すべてのサンプル `pending` → `answering`（同時）
- `POST /api/answers/upsert` または `POST /api/truths/upsert`: `answering` → `grading`（自動、各サンプル独立）
- `POST /api/round/finish`: `grading` → `closed`

## 実装上の注意点

1. **状態の整合性**
   - 状態遷移は必ずAPI経由で行う
   - 直接データベースを更新しない

2. **並行処理の考慮**
   - 複数のリクエストが同時に来た場合、状態の整合性を保つ
   - トランザクションを使用する

3. **エラーハンドリング**
   - 不正な状態遷移を試みた場合、適切なエラーメッセージを返す
   - ログを記録する

4. **UXの考慮**
   - 状態遷移のタイミングで適切なメッセージを表示する
   - 誤操作を防ぐためのUI制御を行う

## 変更履歴

- 2025-01-XX: 初版作成
