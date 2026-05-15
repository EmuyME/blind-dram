# Blind Dram – データベース設計ノート（MVP）

このドキュメントは、Supabase（PostgreSQL）のデータベーススキーマの概要、UNIQUE制約、インデックス一覧を記載する。

---

## 目次

1. [テーブル一覧](#1-テーブル一覧)
2. [UNIQUE制約一覧](#2-unique制約一覧)
3. [インデックス一覧](#3-インデックス一覧)
4. [外部キー制約](#4-外部キー制約)
5. [upsert対応](#5-upsert対応)
6. [自動更新トリガー](#6-自動更新トリガー)

---

## 1. テーブル一覧

### 1.1 sessions

**説明:** イベント（Session）情報。状態管理とフレーバーチャートスナップショットを保持

**カラム:**
- `id` UUID PRIMARY KEY
- `title` TEXT NOT NULL - イベント名
- `owner_token` TEXT NOT NULL UNIQUE - Owner認証用トークン
- `join_token` TEXT NOT NULL UNIQUE - 参加者用トークン
- `mode` TEXT NOT NULL CHECK - 'sequential' または 'simultaneous'
- `state` TEXT NOT NULL DEFAULT 'created' CHECK - Session状態
- `flavor_chart_id` UUID - フレーバーチャートID（将来用）
- `flavor_chart_snapshot` JSONB - フレーバーチャートスナップショット
- `created_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

**状態遷移:**
```
created → registering → ordering → running → aggregating → published → closed
```

---

### 1.2 participants

**説明:** 参加者情報。participant_tokenで認証

**カラム:**
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
- `display_name` TEXT NOT NULL - 表示名
- `is_attending` BOOLEAN NOT NULL DEFAULT true - 参加する/しない
- `brought_count` INTEGER NOT NULL DEFAULT 0 CHECK (>= 0) - 持ち込み本数
- `participant_token` TEXT NOT NULL UNIQUE - 参加者認証用トークン
- `created_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

---

### 1.3 samples

**説明:** テイスティング対象のボトル（Sample）。順番と状態を管理

**カラム:**
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
- `label` TEXT NOT NULL - ボトル名（A/B/Cなど）
- `presenter_participant_id` UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT - Presenter（持ち込み主）
- `sort_order` INTEGER NOT NULL DEFAULT 0 - 順番（0から始まる）
- `state` TEXT NOT NULL DEFAULT 'pending' CHECK - Round状態
- `created_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

**状態遷移:**
```
pending → answering → grading → revealed/closed
```

---

### 1.4 truths

**説明:** 正解（Truth）情報。Presenterが入力。session_idとsample_idで一意

**カラム:**
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
- `sample_id` UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE
- `presenter_participant_id` UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT - Presenter
- `true_cask` TEXT - 正解カスクタイプ
- `true_region` TEXT - 正解地域
- `true_age` INTEGER - 正解熟成年数
- `true_abv` NUMERIC(5, 2) - 正解度数
- `true_distillery` TEXT - 正解蒸留所名
- `notes` TEXT - 任意コメント（統計には含めない）
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

**注意:** `created_at`はない（upsert前提のため）

---

### 1.5 answers

**説明:** 参加者の回答。session_id、sample_id、participant_idで一意。upsert対応

**カラム:**
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
- `sample_id` UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE
- `participant_id` UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE
- `status` TEXT NOT NULL DEFAULT 'draft' CHECK - 'draft' または 'submitted'
- `guessed_cask` TEXT - 推測カスクタイプ
- `guessed_region` TEXT - 推測地域
- `guessed_age` INTEGER - 推測熟成年数
- `guessed_abv` NUMERIC(5, 2) - 推測度数
- `guessed_distillery` TEXT - 推測蒸留所名
- `nose` JSONB - Noseのフレーバー情報
- `palate` JSONB - Palateのフレーバー情報
- `finish` JSONB - Finishのフレーバー情報
- `score_0_100` INTEGER CHECK (0-100) - 自分用メモ（0-100点）
- `version` INTEGER NOT NULL DEFAULT 1 - 更新回数（訂正対応）
- `submitted_at` TIMESTAMP WITH TIME ZONE - 提出日時
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

**JSONB構造（nose/palate/finish）:**
```json
{
  "tier1_tags": ["フルーティ", "樽熟成"],
  "tier2_terms": ["レモン", "バニラ"],
  "text": "任意のコメント"
}
```

---

### 1.6 distillery_grades

**説明:** 蒸留所名の採点結果。session_id、sample_id、participant_idで一意

**カラム:**
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
- `sample_id` UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE
- `participant_id` UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE - 採点される側
- `is_correct` BOOLEAN NOT NULL - 正解かどうか（true=6点、false=0点）
- `graded_by_participant_id` UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT - 採点者（Presenter）
- `graded_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

---

### 1.7 aggregates

**説明:** 集計結果のスナップショット。将来の拡張用

**カラム:**
- `id` UUID PRIMARY KEY
- `session_id` UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
- `version_label` TEXT NOT NULL - バージョンラベル（例: "v1"）
- `snapshot_json` JSONB NOT NULL - 集計結果のJSON
- `created_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

**注意:** `updated_at`はない（スナップショットは不変）

---

## 2. UNIQUE制約一覧

| テーブル | 制約名 | カラム | 用途 |
|---------|--------|--------|------|
| sessions | sessions_owner_token_key | owner_token | Owner認証 |
| sessions | sessions_join_token_key | join_token | 参加者認証 |
| participants | participants_participant_token_key | participant_token | 参加者認証 |
| truths | unique_truth_session_sample | (session_id, sample_id) | 1Sampleに1Truth |
| answers | unique_answer_session_sample_participant | (session_id, sample_id, participant_id) | 1人1回答（upsert対応） |
| distillery_grades | unique_grade_session_sample_participant | (session_id, sample_id, participant_id) | 1人1採点結果 |

---

## 3. インデックス一覧

### 3.1 sessions

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_sessions_owner_token | owner_token | Owner認証検索 |
| idx_sessions_join_token | join_token | 参加者認証検索 |
| idx_sessions_state | state | 状態別検索 |

### 3.2 participants

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_participants_session_id | session_id | Session別参加者一覧 |
| idx_participants_participant_token | participant_token | 認証検索 |

### 3.3 samples

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_samples_session_id | session_id | Session別Sample一覧 |
| idx_samples_presenter_participant_id | presenter_participant_id | Presenter別Sample一覧 |
| idx_samples_session_sort_order | (session_id, sort_order) | 順番ソート |
| idx_samples_state | state | 状態別検索 |

### 3.4 truths

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_truths_session_id | session_id | Session別Truth一覧 |
| idx_truths_sample_id | sample_id | Sample別Truth検索 |
| idx_truths_presenter_participant_id | presenter_participant_id | Presenter別Truth一覧 |

### 3.5 answers

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_answers_session_id | session_id | Session別回答一覧 |
| idx_answers_sample_id | sample_id | Sample別回答一覧 |
| idx_answers_participant_id | participant_id | 参加者別回答一覧 |
| idx_answers_status | status | 状態別検索（draft/submitted） |
| idx_answers_session_sample | (session_id, sample_id) | Sample別回答一覧（集計用） |

### 3.6 distillery_grades

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_distillery_grades_session_id | session_id | Session別採点一覧 |
| idx_distillery_grades_sample_id | sample_id | Sample別採点一覧 |
| idx_distillery_grades_participant_id | participant_id | 参加者別採点一覧 |
| idx_distillery_grades_graded_by | graded_by_participant_id | 採点者別一覧 |
| idx_distillery_grades_session_sample | (session_id, sample_id) | Sample別採点一覧（集計用） |

### 3.7 aggregates

| インデックス名 | カラム | 用途 |
|--------------|--------|------|
| idx_aggregates_session_id | session_id | Session別集計一覧 |
| idx_aggregates_version_label | version_label | バージョン別検索 |

---

## 4. 外部キー制約

### 4.1 カスケード削除（ON DELETE CASCADE）

以下のテーブルは、親テーブル削除時に自動削除される：

- `participants` → `sessions` 削除時に削除
- `samples` → `sessions` 削除時に削除
- `truths` → `sessions` または `samples` 削除時に削除
- `answers` → `sessions`、`samples`、または `participants` 削除時に削除
- `distillery_grades` → `sessions`、`samples`、または `participants` 削除時に削除
- `aggregates` → `sessions` 削除時に削除

### 4.2 制限削除（ON DELETE RESTRICT）

以下のテーブルは、参照先が存在する限り削除できない：

- `samples.presenter_participant_id` → `participants` を参照（Presenterが存在する限り削除不可）
- `truths.presenter_participant_id` → `participants` を参照
- `distillery_grades.graded_by_participant_id` → `participants` を参照

---

## 5. upsert対応

### 5.1 truths テーブル

**UNIQUE制約:** `(session_id, sample_id)`

**upsert例（PostgreSQL）:**
```sql
INSERT INTO truths (
    session_id,
    sample_id,
    presenter_participant_id,
    true_cask,
    true_region,
    true_age,
    true_abv,
    true_distillery,
    notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
ON CONFLICT (session_id, sample_id)
DO UPDATE SET
    presenter_participant_id = EXCLUDED.presenter_participant_id,
    true_cask = EXCLUDED.true_cask,
    true_region = EXCLUDED.true_region,
    true_age = EXCLUDED.true_age,
    true_abv = EXCLUDED.true_abv,
    true_distillery = EXCLUDED.true_distillery,
    notes = EXCLUDED.notes,
    updated_at = NOW()
RETURNING *;
```

### 5.2 answers テーブル

**UNIQUE制約:** `(session_id, sample_id, participant_id)`

**upsert例（PostgreSQL）:**
```sql
INSERT INTO answers (
    session_id,
    sample_id,
    participant_id,
    status,
    guessed_cask,
    guessed_region,
    guessed_age,
    guessed_abv,
    guessed_distillery,
    nose,
    palate,
    finish,
    score_0_100,
    submitted_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
)
ON CONFLICT (session_id, sample_id, participant_id)
DO UPDATE SET
    status = EXCLUDED.status,
    guessed_cask = EXCLUDED.guessed_cask,
    guessed_region = EXCLUDED.guessed_region,
    guessed_age = EXCLUDED.guessed_age,
    guessed_abv = EXCLUDED.guessed_abv,
    guessed_distillery = EXCLUDED.guessed_distillery,
    nose = EXCLUDED.nose,
    palate = EXCLUDED.palate,
    finish = EXCLUDED.finish,
    score_0_100 = EXCLUDED.score_0_100,
    submitted_at = EXCLUDED.submitted_at,
    version = answers.version + 1,
    updated_at = NOW()
RETURNING *;
```

**注意:** `version`は更新時に自動インクリメント

### 5.3 distillery_grades テーブル

**UNIQUE制約:** `(session_id, sample_id, participant_id)`

**upsert例（PostgreSQL）:**
```sql
INSERT INTO distillery_grades (
    session_id,
    sample_id,
    participant_id,
    is_correct,
    graded_by_participant_id
) VALUES (
    $1, $2, $3, $4, $5
)
ON CONFLICT (session_id, sample_id, participant_id)
DO UPDATE SET
    is_correct = EXCLUDED.is_correct,
    graded_by_participant_id = EXCLUDED.graded_by_participant_id,
    graded_at = NOW()
RETURNING *;
```

---

## 6. 自動更新トリガー

以下のテーブルで`updated_at`が自動更新される：

- `sessions` - `trigger_sessions_updated_at`
- `participants` - `trigger_participants_updated_at`
- `samples` - `trigger_samples_updated_at`
- `truths` - `trigger_truths_updated_at`
- `answers` - `trigger_answers_updated_at`

**動作:**
- `UPDATE`文実行時に自動で`updated_at = NOW()`が設定される
- アプリケーション側で`updated_at`を更新する必要がない

---

## 7. データ型の注意事項

### 7.1 UUID

- すべての主キーと外部キーはUUID型
- `uuid_generate_v4()`で自動生成
- Supabaseでは`gen_random_uuid()`も使用可能

### 7.2 JSONB

- `sessions.flavor_chart_snapshot` - フレーバーチャートスナップショット
- `answers.nose` - Noseのフレーバー情報
- `answers.palate` - Palateのフレーバー情報
- `answers.finish` - Finishのフレーバー情報
- `aggregates.snapshot_json` - 集計結果スナップショット

**JSONBクエリ例:**
```sql
-- noseのtier1_tagsを取得
SELECT nose->'tier1_tags' FROM answers WHERE id = $1;

-- tier1_tagsに「フルーティ」が含まれる回答を検索
SELECT * FROM answers WHERE nose->'tier1_tags' @> '["フルーティ"]';
```

### 7.3 NUMERIC

- `truths.true_abv` - NUMERIC(5, 2) - 度数（例: 43.00）
- `answers.guessed_abv` - NUMERIC(5, 2) - 推測度数

### 7.4 CHECK制約

- `sessions.mode` - 'sequential' または 'simultaneous'
- `sessions.state` - Session状態のenum
- `samples.state` - Round状態のenum
- `answers.status` - 'draft' または 'submitted'
- `answers.score_0_100` - 0-100の範囲
- `participants.brought_count` - 0以上

---

## 8. マイグレーション実行方法

### 8.1 Supabase Dashboard

1. Supabase Dashboardにログイン
2. SQL Editorを開く
3. `supabase/schema.sql`の内容をコピー&ペースト
4. 実行

### 8.2 Supabase CLI

```bash
supabase db reset
# または
psql -h <host> -U <user> -d <database> -f supabase/schema.sql
```

---

## 9. 実装時の注意事項

### 9.1 トランザクション

- 状態変更時はトランザクションを使用
- 例: `close-registration` → `set-order` → `start-session`

### 9.2 エラーハンドリング

- UNIQUE制約違反時は`23505`エラーコード
- 外部キー制約違反時は`23503`エラーコード
- CHECK制約違反時は`23514`エラーコード

### 9.3 パフォーマンス

- インデックスは適切に設定済み
- 大量データの場合は追加のインデックス検討（MVPでは不要）

---

**このスキーマで Blind Dram MVP のデータベース要件を満たします。**
