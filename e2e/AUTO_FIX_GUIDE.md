# エラーレポートの自動修正ガイド

## 概要

エラーレポートを自動で確認して修正する機能を実装しました。この機能により、テスト実行後に生成されたエラーレポートを分析し、自動修正可能なエラーを修正できます。

## 使い方

### 1. エラーレポートを分析

```bash
npm run fix-errors
```

このコマンドで：
- `test-results/` フォルダ内のすべてのエラーレポートを検出
- エラーパターンを分析
- 自動修正可能なエラーと手動修正が必要なエラーを分類
- 修正結果を `e2e/fix-results/` に保存

### 2. エラーレポートから自動修正を試みる

```bash
npm run test:e2e:fix-reports
```

このコマンドで：
- 最新のエラーレポートを取得
- エラータイプを特定
- 自動修正可能なエラーを修正
- 修正結果を検証

## 修正可能なエラー

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

**修正されるファイル:**
- `app/api/answers/upsert/route.ts`
- `app/api/truths/upsert/route.ts`
- `app/api/round/finish/route.ts`

### 2. ModuleNotFound（パッケージの欠落）

**検出されるエラー:**
```
Module not found: Can't resolve 'uuid'
```

**自動修正:**
- `uuid`パッケージのインポートを削除
- `uuidv4()` → `generateUUID()`に置換
- `generateUUID`のインポートを追加

**修正されるファイル:**
- `app/api/images/upload/route.ts`

### 3. LoadingStuck（ページが「読み込み中...」で止まる）

**検出されるエラー:**
- ページが「読み込み中...」で止まる
- 開発サーバーに接続できない

**自動修正:**
- 開発サーバーが起動しているか確認
- 起動していない場合は案内を表示

**対処方法:**
```bash
# 別のターミナルで実行
npm run dev
```

## 手動修正が必要なエラー

### 1. SelectorNotFound（セレクタが見つからない）

**検出されるエラー:**
```
Error: locator.waitFor: Timeout 10000ms exceeded
Call log:
  - waiting for locator('button:has-text("参加登録を締め切る")')
```

**対処方法:**
1. スクリーンショットを確認: `test-results/[テスト名]-[ブラウザ]/test-failed-1.png`
2. 実際のUIとセレクタが一致しているか確認
3. `e2e/helpers.ts` の該当箇所を修正

### 2. Timeout（タイムアウトエラー）

**検出されるエラー:**
```
Test timeout of 60000ms exceeded
```

**対処方法:**
- タイムアウトを延長: `--timeout=120000`
- 開発サーバーのパフォーマンスを確認
- データベース接続を確認

### 3. ConnectionRefused（開発サーバーに接続できない）

**検出されるエラー:**
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```

**対処方法:**
1. 開発サーバーを起動: `npm run dev`
2. `http://localhost:3000` にアクセスできることを確認
3. ポートが使用されている場合は、プロセスを終了

## 修正結果の確認

### 修正結果ファイル

修正結果は以下に保存されます：
```
e2e/fix-results/analysis-{timestamp}.json
```

### 内容

```json
{
  "timestamp": "2024-01-15T10:00:00.000Z",
  "totalReports": 2,
  "autoFixable": 1,
  "manualFixable": 1,
  "fixes": [
    {
      "report": "debug-auto-Auto-Debug-Tests-回答提出時のエラー検出-chromium",
      "errorType": "LoadingStuck",
      "issues": ["ページが「読み込み中...」で止まっている"],
      "suggestions": ["開発サーバーが起動しているか確認してください", "npm run dev を実行してください"],
      "canAutoFix": true
    }
  ]
}
```

## ワークフロー

### 推奨されるワークフロー

1. **テストを実行**
   ```bash
   npm run test:e2e:auto
   ```

2. **エラーレポートを分析**
   ```bash
   npm run fix-errors
   ```

3. **自動修正を試みる**
   ```bash
   npm run test:e2e:fix-reports
   ```

4. **修正結果を確認**
   - `e2e/fix-results/` フォルダを確認
   - 修正されたファイルを確認

5. **テストを再実行**
   ```bash
   npm run test:e2e:auto
   ```

## トラブルシューティング

### エラーレポートが見つからない

**原因:**
- テストがまだ実行されていない
- `test-results/` フォルダが存在しない

**対処方法:**
```bash
# テストを実行してエラーレポートを生成
npm run test:e2e:auto
```

### 自動修正が適用されない

**原因:**
- エラータイプが自動修正対象外
- 修正ロジックが該当しない

**対処方法:**
1. エラーレポートの内容を確認
2. `e2e/ERROR_HANDLING.md` を参照
3. 手動で修正

### 修正後にエラーが再発する

**原因:**
- 修正が不完全
- 他の箇所にも同じエラーがある

**対処方法:**
1. 修正結果ファイルを確認
2. 修正されたファイルを確認
3. 他のファイルにも同じパターンがないか検索

## 関連ファイル

- `e2e/error-report-analyzer.ts`: エラーレポート分析ロジック
- `e2e/auto-fix.ts`: 自動修正ロジック
- `e2e/auto-fix-from-reports.spec.ts`: エラーレポートからの自動修正テスト
- `e2e/fix-all-errors.spec.ts`: すべてのエラーレポートを分析するテスト
- `e2e/ERROR_HANDLING.md`: エラーハンドリングガイド
