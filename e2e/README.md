# Blind Dram E2Eテスト

このディレクトリには、Blind DramアプリケーションのE2E（End-to-End）テストが含まれています。

## セットアップ

```bash
# Playwrightのインストール（既に完了している場合）
npm install -D @playwright/test playwright

# ブラウザのインストール
npx playwright install --with-deps chromium
```

## テストの実行

### すべてのテストを実行
```bash
npm run test:e2e
```

### UIモードで実行（推奨）
```bash
npm run test:e2e:ui
```

### デバッグモードで実行
```bash
npm run test:e2e:debug
```

### 自動デバッグテストのみ実行
```bash
npm run test:e2e:auto
```

## テストファイル

- `full-flow.spec.ts`: 完全なE2Eテストフロー（シナリオ1-3）
- `debug-auto.spec.ts`: 自動デバッグテスト（エラー検出と修正試行）
- `helpers.ts`: テストヘルパー関数

## テストシナリオ

### シナリオ1: 参加登録→順番決め→開始
- イベント作成
- 参加登録（複数参加者）
- 参加登録締切
- Session開始

### シナリオ2: Round進行
- Round開始
- 回答入力
- Truth入力
- 採点
- Round終了

### シナリオ3: 集計・公開→結果表示
- 集計実行
- 結果公開
- 結果表示
- CSV出力

## 自動デバッグ・修正機能

### 自動修正機能 (`auto-fix.ts`)

以下のエラーパターンを自動検出して修正します：

1. **ReferenceError（変数名の不一致）**
   - `all_submitted is not defined` → `allSubmitted`に修正
   - `truth_entered is not defined` → `truthEntered`に修正
   - 複数のファイルを自動検索して修正

2. **ModuleNotFound（パッケージの欠落）**
   - `Can't resolve 'uuid'` → `generateUUID()`に置換、インポートを修正

3. **MissingColumn（データベースカラムの欠落）**
   - エラーメッセージからカラム名を抽出
   - マイグレーションが必要な場合は案内を表示

4. **MissingTable（データベーステーブルの欠落）**
   - エラーメッセージからテーブル名を抽出
   - マイグレーションが必要な場合は案内を表示

5. **ServerError（サーバーエラー）**
   - エラーの詳細を取得
   - スクリーンショットを自動取得
   - ログに記録

6. **UIError（UI上のエラー）**
   - エラーメッセージを検出
   - ページリロードで解決を試みる
   - スクリーンショットを取得

### テストファイル

- `debug-auto.spec.ts`: 基本的な自動デバッグテスト
- `auto-fix-full.spec.ts`: 完全な自動修正テスト（全フローをテストしてエラーを自動修正）

### 使用方法

```bash
# 自動修正テストを実行
npm run test:e2e:fix

# 自動デバッグテストを実行
npm run test:e2e:auto
```

### 修正の流れ

1. **エラー検出**: コンソールエラー、ページエラー、UIエラーを検出
2. **パターン認識**: エラーメッセージからエラータイプを特定
3. **自動修正**: エラータイプに応じた修正を自動適用
4. **検証**: 修正後にエラーが解消されたか確認
5. **ログ記録**: 修正結果をログに記録

## エラーレポートの自動修正

### エラーレポートを確認して修正

```bash
# エラーレポートを分析
npm run fix-errors

# エラーレポートから自動修正を試みる
npm run test:e2e:fix-reports
```

このコマンドで：
1. `test-results/` フォルダ内のエラーレポートを自動検出
2. エラーパターンを分析
3. 自動修正可能なエラーを修正
4. 修正結果を `e2e/fix-results/` に保存

### 修正可能なエラー

- **ReferenceError**: 変数名の不一致（例: `all_submitted` → `allSubmitted`）
- **ModuleNotFound**: モジュールの欠落（例: `uuid` → `generateUUID()`）
- **LoadingStuck**: ページが「読み込み中...」で止まる（開発サーバーの確認）

### 手動修正が必要なエラー

- **SelectorNotFound**: セレクタが見つからない（スクリーンショットを確認して修正）
- **Timeout**: タイムアウトエラー（タイムアウト設定を延長）
- **ConnectionRefused**: 開発サーバーに接続できない（開発サーバーを起動）

## 注意事項

- テスト実行前に、開発サーバーが起動している必要があります（`npm run dev`）
- テストは自動的に開発サーバーを起動しますが、既に起動している場合は再利用されます
- テストは実際のデータベースを使用するため、テストデータが作成されます
