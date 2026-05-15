# クイックスタートガイド

## 自動修正テストの使い方

### 1. 開発サーバーを起動

**別のターミナルで実行：**

```bash
npm run dev
```

開発サーバーが `http://localhost:3000` で起動するまで待ちます。

### 2. テストを実行

#### シンプルなテスト（推奨：まずこれから）

```bash
npm run test:e2e -- e2e/simple-test.spec.ts --project=chromium
```

このテストは：
- トップページが表示されることを確認
- イベント作成ページが表示されることを確認

#### 自動修正テスト

```bash
npm run test:e2e:auto -- --project=chromium --timeout=120000
```

このテストは：
- イベント作成
- 参加登録
- 回答提出
- エラー検出と自動修正

#### UIモードで実行（視覚的に確認）

```bash
npm run test:e2e:ui
```

ブラウザが開き、テストの実行を視覚的に確認できます。

### 3. トラブルシューティング

#### 開発サーバーが起動していない場合

エラーメッセージ：
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```

**解決方法：**
1. 別のターミナルで `npm run dev` を実行
2. `http://localhost:3000` にアクセスできることを確認
3. テストを再実行

#### タイムアウトエラーが発生する場合

エラーメッセージ：
```
Test timeout of 60000ms exceeded
```

**解決方法：**
- タイムアウトを延長：`--timeout=120000`
- 開発サーバーが正常に動作しているか確認
- データベース接続を確認

#### セレクタが見つからない場合

エラーメッセージ：
```
Error: locator.waitFor: Timeout 10000ms exceeded
```

**解決方法：**
1. スクリーンショットを確認：`test-results/` フォルダ内
2. 実際のUIとセレクタが一致しているか確認
3. ページが完全に読み込まれるまで待つ処理を追加

### 4. テスト結果の確認

#### スクリーンショット

エラー発生時のスクリーンショットは以下に保存されます：
```
test-results/[test-name]-[browser]/test-failed-1.png
```

#### ビデオ

テスト実行のビデオは以下に保存されます：
```
test-results/[test-name]-[browser]/video.webm
```

#### HTMLレポート

```bash
npx playwright show-report
```

### 5. 次のステップ

1. **シンプルなテストから始める**
   ```bash
   npm run test:e2e -- e2e/simple-test.spec.ts --project=chromium
   ```

2. **UIモードで動作確認**
   ```bash
   npm run test:e2e:ui
   ```

3. **自動修正テストを実行**
   ```bash
   npm run test:e2e:auto -- --project=chromium --timeout=120000
   ```

## 注意事項

- テストは実際のデータベースを使用するため、テストデータが作成されます
- テスト実行前に、開発サーバーが起動している必要があります
- テストは自動的に開発サーバーを起動しません（手動で起動が必要）
