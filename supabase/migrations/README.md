# データベースマイグレーション

`public` にベースとなるテーブル（`sessions`, `samples`, `participants` など）が既にあることを前提とした**差分**です。新規プロジェクトでは先にスキーマを作成してから、下記を**順に**適用してください。

## マイグレーションファイル一覧（推奨順）

| 順 | ファイル | 内容 |
|----|-----------|------|
| 1 | `add_join_code.sql` | `sessions.join_code`（参加用短コード） |
| 2 | `add_previous_session_id.sql` | `sessions.previous_session_id`（逐次セッション連鎖） |
| 3 | `add_public_results_to_sessions.sql` | `sessions.public_results`（結果公開範囲） |
| 4 | `add_round_next_clicks.sql` | `round_next_clicks` テーブル（逐次「次へ」記録） |

`add_join_code` と `add_round_next_clicks` はどちらも `uuid-ossp` を前提にしています。順序を入れ替えても多くは独立ですが、上表の順で揃えると説明と運用が一致しやすいです。

## 実行方法

### Supabase Dashboard

1. [SQL Editor](https://supabase.com/dashboard) を開く
2. 上の順で各ファイルの内容をコピー＆ペーストして実行

### Supabase CLI

プロジェクトで CLI を使っている場合:

```bash
supabase db push
# または個別に psql で -f を指定
```

## 注意事項

- `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` を多用しているため、二重実行しにくい設計です
- 本番に適用する前に、開発用プロジェクトまたはバックアップ取得後に実行することを推奨します
