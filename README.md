# Blind Dram

ブラインドテイスティング（ウイスキー等）向けのセッション管理アプリです。Next.js（App Router）と Supabase を使います。

## 必要なもの

- Node.js 20 系推奨
- [Supabase](https://supabase.com/) プロジェクト（本番用 DB・Storage）

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local を編集して Supabase の URL と service_role キーを設定
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### データベース

ベースとなるテーブルが Supabase にある前提です。差分マイグレーションは [supabase/migrations](./supabase/migrations/README.md) を参照し、**本番・開発で同じ手順**を踏んでください。

## Vercel へのデプロイ（友人向けβ）

1. [Vercel](https://vercel.com) で Git リポジトリを Import し、フレームワークは **Next.js** のままデプロイ。
2. **Settings → Environment Variables** の **Production** に次を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`（**Encrypted** のまま。`NEXT_PUBLIC_` は付けない）
3. （任意）Upstash を使う場合は `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` も Production に追加。未設定でもアプリは動作します（API レート制限のみ無効）。
4. デプロイ完了後、**Production URL** でセッション作成〜参加〜1 ラウンドまで通し確認。
5. 画像アップロードを使う場合は、本番 URL でもアップロードを試し、Supabase Storage のポリシーを必要に応じて調整。

詳細なスタック説明は [docs/stack.md](./docs/stack.md) を参照してください。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー（`build` 後） |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright E2E |

## ライセンス

プライベートプロジェクトの場合はリポジトリのライセンス表記に従ってください。
