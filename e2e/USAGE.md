# 自動デバッグ・修正機能の使い方

## 基本的な使い方

### 1. 開発サーバーを起動（別ターミナル）

```bash
npm run dev
```

開発サーバーは自動的に起動されますが、既に起動している場合は再利用されます。

### 2. 自動修正テストを実行

```bash
# 自動修正テスト（推奨）
npm run test:e2e:fix
```

このコマンドで以下が実行されます：
- アプリケーション全体のフローをテスト
- エラーを自動検出
- 検出したエラーを自動修正
- 修正後の動作を検証

### 3. UIモードで実行（視覚的に確認）

```bash
npm run test:e2e:ui
```

ブラウザが開き、テストの実行を視覚的に確認できます：
- テストの進行状況を確認
- エラー発生時の画面を確認
- 修正の適用を確認

### 4. デバッグモードで実行（ステップ実行）

```bash
npm run test:e2e:debug
```

ステップ実行でデバッグできます：
- 各ステップで一時停止
- 変数の状態を確認
- 手動で操作を追加

## 実行例

### 例1: 回答提出時のエラーを自動修正

```bash
npm run test:e2e:auto
```

このコマンドで：
1. セッションを作成
2. 参加登録
3. 回答提出を試みる
4. エラーが発生した場合、自動修正を試みる
5. 修正結果をログに記録

### 例2: 全フローをテストしてエラーを自動修正

```bash
npm run test:e2e:fix
```

このコマンドで：
1. イベント作成から結果公開まで全フローをテスト
2. 各ステップでエラーを検出
3. エラーを自動修正
4. 修正後の動作を検証

## 修正されるエラー

### 1. ReferenceError（変数名の不一致）

**検出されるエラー:**
```
ReferenceError: all_submitted is not defined
ReferenceError: truth_entered is not defined
```

**自動修正:**
- `all_submitted` → `allSubmitted`
- `truth_entered` → `truthEntered`
- 複数のファイルを自動検索して修正

### 2. ModuleNotFound（パッケージの欠落）

**検出されるエラー:**
```
Module not found: Can't resolve 'uuid'
```

**自動修正:**
- `uuid`パッケージのインポートを削除
- `uuidv4()` → `generateUUID()`に置換
- `generateUUID`のインポートを追加

### 3. サーバーエラー

**検出されるエラー:**
- UI上に「サーバーエラーが発生しました」が表示
- コンソールにエラーメッセージ

**自動修正:**
- エラーの詳細をログに記録
- スクリーンショットを取得
- ページリロードで解決を試みる

## 修正結果の確認

### ログファイル

修正結果は以下の場所に保存されます：

```
e2e/error-logs/error-{timestamp}.json
```

### スクリーンショット

エラー発生時のスクリーンショットは以下に保存されます：

```
e2e/screenshots/
  - answer-submit-error.png
  - server-error-{timestamp}.png
  - ui-error-{timestamp}.png
  - auto-fix-failed.png
```

### コンソール出力

テスト実行中に、以下のようなログが表示されます：

```
[AutoFix] Fixing ReferenceError: all_submitted -> allSubmitted
[AutoFix] Fixed all_submitted -> allSubmitted in app/api/answers/upsert/route.ts
[AutoFix] Fix verified successfully
```

## トラブルシューティング

### 修正が適用されない場合

1. **開発サーバーを再起動**
   ```bash
   # 開発サーバーを停止（Ctrl+C）
   # .nextフォルダを削除
   rm -rf .next
   # 開発サーバーを再起動
   npm run dev
   ```

2. **テストを再実行**
   ```bash
   npm run test:e2e:fix
   ```

### 修正できないエラーの場合

修正できないエラーは、以下の情報とともにログに記録されます：

- エラーメッセージ
- エラーの種類
- 修正案（マイグレーションが必要な場合など）
- スクリーンショット

これらの情報を確認して、手動で修正してください。

## 注意事項

- **自動修正は慎重に**: 自動修正はコードを変更するため、Gitでコミット前に確認してください
- **バックアップ**: 重要な変更前はバックアップを取ることを推奨します
- **データベースエラー**: データベースのマイグレーションが必要なエラーは自動修正できません

## 次のステップ

1. テストを実行して動作確認
2. エラーが検出された場合、自動修正の結果を確認
3. 修正できないエラーは、ログとスクリーンショットを確認して手動で修正
