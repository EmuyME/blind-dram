# Blind Dram – API契約書（MVP完全版）

このドキュメントは、MVPで必要なAPIの一覧、request/response例、エラー一覧を定義する。  
**実装者がそのままコピペで使える粒度で記載する。**

---

## 目次

1. [API共通仕様](#1-api共通仕様)
2. [画面とAPIの対応表](#2-画面とapiの対応表)
3. [Session API](#3-session-api)
4. [Participant API](#4-participant-api)
5. [Owner API](#5-owner-api)
6. [Round API](#6-round-api)
7. [Answer API](#7-answer-api)
8. [Truth API](#8-truth-api)
9. [Distillery API](#9-distillery-api)
10. [Results API](#10-results-api)
11. [Export API](#11-export-api)
12. [エラー一覧](#12-エラー一覧)

---

## 1. API共通仕様

### 1.1 基本ルール

- **ベースURL:** `/api`
- **Content-Type:** `application/json`（リクエスト・レスポンス共通）
- **レスポンス形式:** JSON統一
- **エラーレスポンス:** `{ "error": "message", "code": "ERROR_CODE" }`

### 1.2 HTTPメソッド

- **GET:** データ取得
- **POST:** データ作成・更新・状態変更
- **PUT/PATCH/DELETE:** 使用しない（POSTで統一）

### 1.3 認証方式（決め打ち）

**参加者API（participant_token必須）:**
```typescript
// リクエストボディに含める（推奨）
{
  "participant_token": "xxx",
  // ... その他のパラメータ
}

// またはQuery Parameter（GETのみ）
?participant_token=xxx
```

**Owner API（owner_token必須）:**
```typescript
// リクエストボディに含める（推奨）
{
  "owner_token": "xxx",
  // ... その他のパラメータ
}

// またはQuery Parameter（GETのみ）
?owner_token=xxx
```

**認証チェック:**
- `participant_token`: `participants`テーブルの`participant_token`と一致するか確認
- `owner_token`: `sessions`テーブルの`owner_token`と一致するか確認

### 1.4 レスポンス形式

**成功時（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    // API固有のデータ
  }
}
```

**エラー時:**
```json
{
  "error": "エラーメッセージ（日本語）",
  "code": "ERROR_CODE"
}
```

### 1.5 HTTPステータスコード

| ステータス | 意味 | 発生条件 |
|-----------|------|---------|
| 200 | 成功 | リクエストが正常に処理された |
| 400 | バリデーションエラー | リクエストパラメータが不正、状態が不正 |
| 401 | 認証エラー | トークンが不正、トークンが未指定 |
| 403 | 権限エラー | Presenter権限がない、Session状態が公開前 |
| 404 | リソース不存在 | Session/Sample/Participantが見つからない |
| 409 | 競合エラー | 状態が競合（例: 既に締切済み） |
| 500 | サーバーエラー | DB接続エラー、予期しないエラー |

---

## 2. 画面とAPIの対応表

| 画面 | URL | 呼び出すAPI | 認証 |
|------|-----|------------|------|
| イベント作成 | `/create` | `POST /api/session/create` | なし |
| Ownerダッシュボード（registering） | `/o/[ownerToken]` | `GET /api/session/get`<br>`POST /api/owner/close-registration` | owner_token |
| Ownerダッシュボード（ordering） | `/o/[ownerToken]` | `GET /api/session/get`<br>`POST /api/owner/set-order`<br>`POST /api/owner/start-session` | owner_token |
| Ownerダッシュボード（running） | `/o/[ownerToken]` | `GET /api/session/get`<br>`GET /api/round/status` | owner_token |
| Ownerダッシュボード（aggregating） | `/o/[ownerToken]` | `GET /api/session/get`<br>`POST /api/owner/finalize` | owner_token |
| Ownerダッシュボード（published） | `/o/[ownerToken]` | `GET /api/session/get`<br>`GET /api/export/csv` | owner_token |
| 参加登録 | `/s/[joinToken]` | `GET /api/session/get`<br>`POST /api/participants/join` | なし（join_tokenのみ） |
| Session Home | `/session/[joinToken]` | `GET /api/session/get`<br>`GET /api/round/status` | participant_token |
| 回答入力 | `/session/[joinToken]/round/[sampleId]` | `GET /api/round/status`<br>`POST /api/answers/upsert` | participant_token |
| Presenterパネル | `/session/[joinToken]/presenter/[sampleId]` | `GET /api/round/status`<br>`POST /api/truths/upsert`<br>`POST /api/round/start`<br>`POST /api/distillery/grade`<br>`POST /api/distillery/reject-submission`<br>`POST /api/round/finish` | participant_token（Presenter） |
| 結果ページ | `/session/[joinToken]/results` | `GET /api/results/get` | なし（join_tokenのみ） |

---

## 3. Session API

### 3.1 POST /api/session/create

**説明:** イベント（Session）を作成する

**認証:** 不要

**Request Body:**
```json
{
  "title": "2024年1月ウイスキー会",
  "mode": "sequential",
  "flavor_chart_id": "v1"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "owner_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "join_token": "f1e2d3c4-b5a6-9876-5432-109876543210",
    "owner_url": "/o/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "join_url": "/s/f1e2d3c4-b5a6-9876-5432-109876543210"
  }
}
```

**エラーレスポンス:**

**HTTP 400 - MISSING_TITLE:**
```json
{
  "error": "イベント名が空です",
  "code": "MISSING_TITLE"
}
```

**HTTP 400 - INVALID_MODE:**
```json
{
  "error": "回答モードが不正です。sequential または simultaneous を指定してください",
  "code": "INVALID_MODE"
}
```

**HTTP 500 - SERVER_ERROR:**
```json
{
  "error": "サーバーエラーが発生しました",
  "code": "SERVER_ERROR"
}
```

**実装例（TypeScript）:**
```typescript
const response = await fetch('/api/session/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '2024年1月ウイスキー会',
    mode: 'sequential',
    flavor_chart_id: 'v1'
  })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}

const data = await response.json();
// data.data.session_id, data.data.owner_token, etc.
```

---

### 3.2 GET /api/session/get

**説明:** Session情報を取得する

**認証:** 不要（join_tokenのみ）

**Query Parameters:**
```
?join_token=f1e2d3c4-b5a6-9876-5432-109876543210
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "2024年1月ウイスキー会",
    "mode": "sequential",
    "state": "registering",
    "flavor_chart_snapshot": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**エラーレスポンス:**

**HTTP 404 - SESSION_NOT_FOUND:**
```json
{
  "error": "Sessionが見つかりません",
  "code": "SESSION_NOT_FOUND"
}
```

**実装例（TypeScript）:**
```typescript
const response = await fetch(`/api/session/get?join_token=${joinToken}`);
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}
const data = await response.json();
// data.data.state, data.data.title, etc.
```

---

## 4. Participant API

### 4.1 POST /api/participants/join

**説明:** 参加登録を行う

**認証:** 不要（join_tokenのみ）

**Request Body:**
```json
{
  "join_token": "f1e2d3c4-b5a6-9876-5432-109876543210",
  "display_name": "田中太郎",
  "is_attending": true,
  "brought_count": 2,
  "bottle_labels": ["A", "B"]
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "participant_id": "660e8400-e29b-41d4-a716-446655440001",
    "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**エラーレスポンス:**

**HTTP 404 - SESSION_NOT_FOUND:**
```json
{
  "error": "Sessionが見つかりません",
  "code": "SESSION_NOT_FOUND"
}
```

**HTTP 400 - SESSION_CLOSED:**
```json
{
  "error": "Sessionが締切済みです。参加登録はできません",
  "code": "SESSION_CLOSED"
}
```

**HTTP 400 - MISSING_DISPLAY_NAME:**
```json
{
  "error": "表示名が空です",
  "code": "MISSING_DISPLAY_NAME"
}
```

**HTTP 400 - INVALID_BOTTLE_COUNT:**
```json
{
  "error": "ボトル数が一致しません。brought_countとbottle_labelsの数が一致している必要があります",
  "code": "INVALID_BOTTLE_COUNT"
}
```

**実装例（TypeScript）:**
```typescript
const response = await fetch('/api/participants/join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    join_token: joinToken,
    display_name: '田中太郎',
    is_attending: true,
    brought_count: 2,
    bottle_labels: ['A', 'B']
  })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}

const data = await response.json();
// localStorageに保存
localStorage.setItem(`bd:participant_token:${joinToken}`, data.data.participant_token);
```

---

### 4.2 GET /api/participants/me

**説明:** 自分の参加情報を取得する

**認証:** participant_token必須

**Query Parameters:**
```
?join_token=f1e2d3c4-b5a6-9876-5432-109876543210&participant_token=p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "display_name": "田中太郎",
    "is_attending": true,
    "brought_count": 2,
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:05:00Z",
    "updated_at": "2024-01-15T10:05:00Z"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 404 - PARTICIPANT_NOT_FOUND:**
```json
{
  "error": "参加者が見つかりません",
  "code": "PARTICIPANT_NOT_FOUND"
}
```

---

## 5. Owner API

### 5.1 POST /api/owner/close-registration

**説明:** 参加締切を行う（Session状態: registering → ordering）

**認証:** owner_token必須

**Request Body:**
```json
{
  "owner_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "ordering",
    "participants": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "display_name": "田中太郎",
        "brought_count": 2,
        "bottle_labels": ["A", "B"]
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "display_name": "佐藤花子",
        "brought_count": 1,
        "bottle_labels": ["C"]
      }
    ],
    "samples": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440001",
        "label": "A",
        "presenter_participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "sort_order": 0,
        "state": "pending"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "label": "B",
        "presenter_participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "sort_order": 1,
        "state": "pending"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440003",
        "label": "C",
        "presenter_participant_id": "660e8400-e29b-41d4-a716-446655440002",
        "sort_order": 2,
        "state": "pending"
      }
    ]
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Session状態が不正です。registering状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

**HTTP 400 - NO_PARTICIPANTS:**
```json
{
  "error": "参加者が0人です。参加者が1人以上必要です",
  "code": "NO_PARTICIPANTS"
}
```

---

### 5.2 POST /api/owner/set-order

**説明:** Sampleの順番を設定する

**認証:** owner_token必須

**Request Body:**
```json
{
  "owner_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "sample_orders": [
    {
      "sample_id": "770e8400-e29b-41d4-a716-446655440003",
      "sort_order": 0
    },
    {
      "sample_id": "770e8400-e29b-41d4-a716-446655440001",
      "sort_order": 1
    },
    {
      "sample_id": "770e8400-e29b-41d4-a716-446655440002",
      "sort_order": 2
    }
  ]
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "samples": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440003",
        "label": "C",
        "presenter_participant_id": "660e8400-e29b-41d4-a716-446655440002",
        "sort_order": 0,
        "state": "pending"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440001",
        "label": "A",
        "presenter_participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "sort_order": 1,
        "state": "pending"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "label": "B",
        "presenter_participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "sort_order": 2,
        "state": "pending"
      }
    ]
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Session状態が不正です。ordering状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

**HTTP 404 - INVALID_SAMPLE_ID:**
```json
{
  "error": "Sample IDが不正です",
  "code": "INVALID_SAMPLE_ID"
}
```

**HTTP 400 - DUPLICATE_SORT_ORDER:**
```json
{
  "error": "順番が重複しています",
  "code": "DUPLICATE_SORT_ORDER"
}
```

---

### 5.3 POST /api/owner/start-session

**説明:** Sessionを開始する（Session状態: ordering → running、フレーバーチャートスナップショット保存）

**認証:** owner_token必須

**Request Body:**
```json
{
  "owner_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "running",
    "flavor_chart_snapshot": {
      "version": "v1",
      "tier1": [
        "フルーティ",
        "フローラル・ハーブ系",
        "シリアル",
        "テール",
        "硫黄系",
        "サリファリー",
        "ピート・薫香",
        "樽熟成",
        "その他"
      ],
      "tier2_suggestions": {
        "フルーティ": ["レモン", "ライム", "オレンジ", "グレープフルーツ"],
        "フローラル・ハーブ系": ["バラ", "白い花", "スミレ", "ラベンダー"],
        // ... 他のTier2候補
      }
    }
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Session状態が不正です。ordering状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

**HTTP 400 - NO_SAMPLES:**
```json
{
  "error": "Sampleが0個です。Sampleが1個以上必要です",
  "code": "NO_SAMPLES"
}
```

---

### 5.4 POST /api/owner/finalize

**説明:** 集計を実行する（Session状態: running → aggregating）

**認証:** owner_token必須

**Request Body:**
```json
{
  "owner_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "aggregating",
    "aggregation_complete": true
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Session状態が不正です。running状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

**HTTP 400 - ROUNDS_NOT_COMPLETE:**
```json
{
  "error": "全Roundが完了していません。すべてのRoundを終了してから実行してください",
  "code": "ROUNDS_NOT_COMPLETE"
}
```

---

### 5.5 POST /api/owner/publish

**説明:** 結果を公開する（Session状態: aggregating → published）

**認証:** owner_token必須

**Request Body:**
```json
{
  "owner_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "state": "published"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Session状態が不正です。aggregating状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

---

## 6. Round API

### 6.1 POST /api/round/start

**説明:** Roundを開始する（Round状態: pending → answering）

**認証:** participant_token必須（Presenter権限）

**Request Body:**
```json
{
  "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
  "sample_id": "770e8400-e29b-41d4-a716-446655440001"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "sample_id": "770e8400-e29b-41d4-a716-446655440001",
    "state": "answering"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 403 - NOT_PRESENTER:**
```json
{
  "error": "Presenter権限がありません。このSampleの持ち込み主のみ実行できます",
  "code": "NOT_PRESENTER"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Round状態が不正です。pending状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

**HTTP 404 - SAMPLE_NOT_FOUND:**
```json
{
  "error": "Sampleが見つかりません",
  "code": "SAMPLE_NOT_FOUND"
}
```

---

### 6.2 GET /api/round/status

**説明:** Roundの状態と提出状況を取得する

**認証:** participant_token推奨（必須ではない）

**Query Parameters:**
```
?sample_id=770e8400-e29b-41d4-a716-446655440001&participant_token=p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "sample_id": "770e8400-e29b-41d4-a716-446655440001",
    "state": "answering",
    "participant_progress": [
      {
        "participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "display_name": "田中太郎",
        "status": "submitted",
        "submitted_at": "2024-01-15T10:30:00Z"
      },
      {
        "participant_id": "660e8400-e29b-41d4-a716-446655440002",
        "display_name": "佐藤花子",
        "status": "draft",
        "submitted_at": null
      }
    ],
    "truth_entered": true,
    "all_submitted": false
  }
}
```

**エラーレスポンス:**

**HTTP 404 - SAMPLE_NOT_FOUND:**
```json
{
  "error": "Sampleが見つかりません",
  "code": "SAMPLE_NOT_FOUND"
}
```

---

### 6.3 POST /api/round/finish

**説明:** Roundを終了する（Round状態: grading → revealed/closed）

**認証:** participant_token必須（Presenter権限）

**Request Body:**
```json
{
  "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
  "sample_id": "770e8400-e29b-41d4-a716-446655440001"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "sample_id": "770e8400-e29b-41d4-a716-446655440001",
    "state": "revealed",
    "next_sample_id": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 403 - NOT_PRESENTER:**
```json
{
  "error": "Presenter権限がありません",
  "code": "NOT_PRESENTER"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Round状態が不正です。grading状態の時のみ実行できます",
  "code": "INVALID_STATE"
}
```

**HTTP 400 - GRADING_INCOMPLETE:**
```json
{
  "error": "採点が完了していません。全参加者の採点を完了してください",
  "code": "GRADING_INCOMPLETE"
}
```

---

## 7. Answer API

### 7.1 POST /api/answers/upsert

**説明:** 回答を保存・更新する（draft/submitted）

**認証:** participant_token必須

**Request Body:**
```json
{
  "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
  "sample_id": "770e8400-e29b-41d4-a716-446655440001",
  "status": "submitted",
  "guessed_cask": "シェリー樽",
  "guessed_region": "スコットランド",
  "guessed_age": 12,
  "guessed_abv": 43,
  "guessed_distillery": "マッカラン",
  "nose": {
    "tier1_tags": ["フルーティ", "樽熟成"],
    "tier2_terms": ["レモン", "バニラ"],
    "text": "レモンとバニラの香りが印象的"
  },
  "palate": {
    "tier1_tags": ["フルーティ"],
    "tier2_terms": ["オレンジ"],
    "text": "オレンジの味わい"
  },
  "finish": {
    "tier1_tags": ["樽熟成"],
    "tier2_terms": ["キャラメル"],
    "text": "キャラメルの余韻"
  },
  "score_0_100": 85
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "answer_id": "880e8400-e29b-41d4-a716-446655440001",
    "status": "submitted",
    "version": 1,
    "submitted_at": "2024-01-15T10:30:00Z"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 404 - SAMPLE_NOT_FOUND:**
```json
{
  "error": "Sampleが見つかりません",
  "code": "SAMPLE_NOT_FOUND"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Round状態が不正です。answering状態の時のみ回答できます",
  "code": "INVALID_STATE"
}
```

**HTTP 400 - INVALID_STATUS:**
```json
{
  "error": "ステータスが不正です。draft または submitted を指定してください",
  "code": "INVALID_STATUS"
}
```

**実装例（TypeScript）:**
```typescript
const participantToken = localStorage.getItem(`bd:participant_token:${joinToken}`);

const response = await fetch('/api/answers/upsert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    participant_token: participantToken,
    sample_id: sampleId,
    status: 'submitted',
    guessed_cask: 'シェリー樽',
    guessed_region: 'スコットランド',
    guessed_age: 12,
    guessed_abv: 43,
    guessed_distillery: 'マッカラン',
    nose: {
      tier1_tags: ['フルーティ', '樽熟成'],
      tier2_terms: ['レモン', 'バニラ'],
      text: 'レモンとバニラの香りが印象的'
    },
    palate: {
      tier1_tags: ['フルーティ'],
      tier2_terms: ['オレンジ'],
      text: 'オレンジの味わい'
    },
    finish: {
      tier1_tags: ['樽熟成'],
      tier2_terms: ['キャラメル'],
      text: 'キャラメルの余韻'
    },
    score_0_100: 85
  })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}

const data = await response.json();
// data.data.answer_id, data.data.status, etc.
```

---

## 8. Truth API

### 8.1 POST /api/truths/upsert

**説明:** Truth（正解）を保存・更新する

**認証:** participant_token必須（Presenter権限）

**Request Body:**
```json
{
  "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
  "sample_id": "770e8400-e29b-41d4-a716-446655440001",
  "true_cask": "シェリー樽",
  "true_region": "スコットランド",
  "true_age": 12,
  "true_abv": 43,
  "true_distillery": "マッカラン",
  "notes": "12年熟成のシェリー樽仕上げ"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "truth_id": "990e8400-e29b-41d4-a716-446655440001",
    "sample_id": "770e8400-e29b-41d4-a716-446655440001",
    "updated_at": "2024-01-15T10:20:00Z"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 403 - NOT_PRESENTER:**
```json
{
  "error": "Presenter権限がありません",
  "code": "NOT_PRESENTER"
}
```

**HTTP 404 - SAMPLE_NOT_FOUND:**
```json
{
  "error": "Sampleが見つかりません",
  "code": "SAMPLE_NOT_FOUND"
}
```

---

## 9. Distillery API

### 9.1 POST /api/distillery/grade

**説明:** 蒸留所名を採点する（○×）

**認証:** participant_token必須（Presenter権限）

**Request Body:**
```json
{
  "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
  "sample_id": "770e8400-e29b-41d4-a716-446655440001",
  "target_participant_id": "660e8400-e29b-41d4-a716-446655440001",
  "is_correct": true
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "grade_id": "aa0e8400-e29b-41d4-a716-446655440001",
    "sample_id": "770e8400-e29b-41d4-a716-446655440001",
    "participant_id": "660e8400-e29b-41d4-a716-446655440001",
    "is_correct": true,
    "score": 6
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 403 - NOT_PRESENTER:**
```json
{
  "error": "Presenter権限がありません",
  "code": "NOT_PRESENTER"
}
```

**HTTP 404 - SAMPLE_NOT_FOUND:**
```json
{
  "error": "Sampleが見つかりません",
  "code": "SAMPLE_NOT_FOUND"
}
```

**HTTP 404 - PARTICIPANT_NOT_FOUND:**
```json
{
  "error": "参加者が見つかりません",
  "code": "PARTICIPANT_NOT_FOUND"
}
```

**HTTP 400 - INVALID_STATE:**
```json
{
  "error": "Round状態が不正です。grading状態の時のみ採点できます",
  "code": "INVALID_STATE"
}
```

---

### 9.2 POST /api/distillery/reject-submission

**説明:** 提出を差し戻す（status: submitted → draft）

**認証:** participant_token必須（Presenter権限）

**Request Body:**
```json
{
  "participant_token": "p1a2b3c4-d5e6-7890-fghi-jklmnopqrstu",
  "sample_id": "770e8400-e29b-41d4-a716-446655440001",
  "target_participant_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "answer_id": "880e8400-e29b-41d4-a716-446655440001",
    "status": "draft"
  }
}
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 403 - NOT_PRESENTER:**
```json
{
  "error": "Presenter権限がありません",
  "code": "NOT_PRESENTER"
}
```

**HTTP 404 - ANSWER_NOT_FOUND:**
```json
{
  "error": "回答が見つかりません",
  "code": "ANSWER_NOT_FOUND"
}
```

---

## 10. Results API

### 10.1 GET /api/results/get

**説明:** 結果データを取得する（Session状態がpublished以降のみ）

**認証:** 不要（join_tokenのみ）

**Query Parameters:**
```
?join_token=f1e2d3c4-b5a6-9876-5432-109876543210
```

**成功レスポンス（HTTP 200）:**
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "2024年1月ウイスキー会",
    "mode": "sequential",
    "ranking": [
      {
        "participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "display_name": "田中太郎",
        "total_score": 36,
        "rank": 1
      },
      {
        "participant_id": "660e8400-e29b-41d4-a716-446655440002",
        "display_name": "佐藤花子",
        "total_score": 30,
        "rank": 2
      }
    ],
    "answers_table": [
      {
        "participant_id": "660e8400-e29b-41d4-a716-446655440001",
        "display_name": "田中太郎",
        "samples": [
          {
            "sample_id": "770e8400-e29b-41d4-a716-446655440001",
            "sample_label": "A",
            "score": 18,
            "guessed_cask": "シェリー樽",
            "guessed_region": "スコットランド",
            "guessed_age": 12,
            "guessed_abv": 43,
            "guessed_distillery": "マッカラン",
            "is_correct_distillery": true
          },
          {
            "sample_id": "770e8400-e29b-41d4-a716-446655440002",
            "sample_label": "B",
            "score": 18,
            "guessed_cask": "バーボン樽",
            "guessed_region": "日本",
            "guessed_age": 10,
            "guessed_abv": 40,
            "guessed_distillery": "山崎",
            "is_correct_distillery": true
          }
        ]
      }
    ],
    "flavor_radar": {
      "tier1_counts": {
        "フルーティ": 15,
        "フローラル・ハーブ系": 8,
        "シリアル": 5,
        "テール": 3,
        "硫黄系": 2,
        "サリファリー": 1,
        "ピート・薫香": 4,
        "樽熟成": 20,
        "その他": 2
      }
    },
    "sample_details": [
      {
        "sample_id": "770e8400-e29b-41d4-a716-446655440001",
        "sample_label": "A",
        "radar": {
          "tier1_counts": {
            "フルーティ": 5,
            "樽熟成": 8
          }
        },
        "other_terms": [
          {
            "term": "カスタム用語1",
            "count": 3
          },
          {
            "term": "カスタム用語2",
            "count": 1
          }
        ],
        "comments": [
          {
            "participant_id": "660e8400-e29b-41d4-a716-446655440001",
            "display_name": "田中太郎",
            "nose": {
              "tier1_tags": ["フルーティ", "樽熟成"],
              "tier2_terms": ["レモン", "バニラ"],
              "text": "レモンとバニラの香りが印象的"
            },
            "palate": {
              "tier1_tags": ["フルーティ"],
              "tier2_terms": ["オレンジ"],
              "text": "オレンジの味わい"
            },
            "finish": {
              "tier1_tags": ["樽熟成"],
              "tier2_terms": ["キャラメル"],
              "text": "キャラメルの余韻"
            }
          }
        ]
      }
    ]
  }
}
```

**エラーレスポンス:**

**HTTP 404 - SESSION_NOT_FOUND:**
```json
{
  "error": "Sessionが見つかりません",
  "code": "SESSION_NOT_FOUND"
}
```

**HTTP 403 - NOT_PUBLISHED:**
```json
{
  "error": "結果が公開されていません。Session状態がpublished以降の時のみ閲覧できます",
  "code": "NOT_PUBLISHED"
}
```

---

## 11. Export API

### 11.1 GET /api/export/csv

**説明:** CSVファイルを出力する

**認証:** owner_token必須（MVPではOwnerのみ）

**Query Parameters:**
```
?join_token=f1e2d3c4-b5a6-9876-5432-109876543210&owner_token=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**成功レスポンス（HTTP 200）:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="blind_dram_2024年1月ウイスキー会_20240115T103000.csv"

順位,参加者名,合計点数,Sample A_点数,Sample A_カスク,Sample A_地域,Sample A_年数,Sample A_度数,Sample A_蒸留所,Sample A_正解,Sample B_点数,Sample B_カスク,Sample B_地域,Sample B_年数,Sample B_度数,Sample B_蒸留所,Sample B_正解
1,田中太郎,36,18,シェリー樽,スコットランド,12,43,マッカラン,○,18,バーボン樽,日本,10,40,山崎,○
2,佐藤花子,30,12,バーボン樽,日本,8,40,山崎,×,18,シェリー樽,スコットランド,12,43,マッカラン,○
```

**エラーレスポンス:**

**HTTP 401 - UNAUTHORIZED:**
```json
{
  "error": "認証トークンが不正です",
  "code": "UNAUTHORIZED"
}
```

**HTTP 404 - SESSION_NOT_FOUND:**
```json
{
  "error": "Sessionが見つかりません",
  "code": "SESSION_NOT_FOUND"
}
```

**HTTP 403 - NOT_PUBLISHED:**
```json
{
  "error": "結果が公開されていません",
  "code": "NOT_PUBLISHED"
}
```

**実装例（TypeScript）:**
```typescript
const response = await fetch(
  `/api/export/csv?join_token=${joinToken}&owner_token=${ownerToken}`
);

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `blind_dram_${sessionTitle}_${timestamp}.csv`;
a.click();
```

---

## 12. エラー一覧

### 12.1 認証エラー（HTTP 401）

| コード | メッセージ | 発生条件 |
|--------|-----------|---------|
| `UNAUTHORIZED` | 認証トークンが不正です | owner_token/participant_tokenが存在しない、または一致しない |

### 12.2 権限エラー（HTTP 403）

| コード | メッセージ | 発生条件 |
|--------|-----------|---------|
| `NOT_PRESENTER` | Presenter権限がありません | participant_tokenがSampleのpresenter_participant_idと一致しない |
| `NOT_PUBLISHED` | 結果が公開されていません | Session状態がpublished以外 |

### 12.3 バリデーションエラー（HTTP 400）

| コード | メッセージ | 発生条件 |
|--------|-----------|---------|
| `MISSING_TITLE` | イベント名が空です | titleが空またはnull |
| `MISSING_DISPLAY_NAME` | 表示名が空です | display_nameが空またはnull |
| `INVALID_MODE` | 回答モードが不正です | modeが"sequential"または"simultaneous"以外 |
| `INVALID_STATUS` | ステータスが不正です | statusが"draft"または"submitted"以外 |
| `INVALID_BOTTLE_COUNT` | ボトル数が一致しません | bottle_labelsの数がbrought_countと一致しない |
| `INVALID_STATE` | Session/Round状態が不正です | 期待する状態と異なる |
| `NO_PARTICIPANTS` | 参加者が0人です | 参加締切時に参加者が0人 |
| `NO_SAMPLES` | Sampleが0個です | Session開始時にSampleが0個 |
| `ROUNDS_NOT_COMPLETE` | 全Roundが完了していません | 集計実行時に未完了のRoundがある |
| `GRADING_INCOMPLETE` | 採点が完了していません | Round終了時に未採点の回答がある |
| `DUPLICATE_SORT_ORDER` | 順番が重複しています | sort_orderが重複 |
| `INVALID_SAMPLE_ID` | Sample IDが不正です | sample_idが存在しない |

### 12.4 リソース不存在エラー（HTTP 404）

| コード | メッセージ | 発生条件 |
|--------|-----------|---------|
| `SESSION_NOT_FOUND` | Sessionが見つかりません | join_tokenが存在しない |
| `SAMPLE_NOT_FOUND` | Sampleが見つかりません | sample_idが存在しない |
| `PARTICIPANT_NOT_FOUND` | 参加者が見つかりません | participant_idが存在しない |
| `ANSWER_NOT_FOUND` | 回答が見つかりません | answer_idが存在しない |

### 12.5 競合エラー（HTTP 409）

| コード | メッセージ | 発生条件 |
|--------|-----------|---------|
| `SESSION_CLOSED` | Sessionが締切済みです | Session状態がregistering以外で参加登録を試みた |

### 12.6 サーバーエラー（HTTP 500）

| コード | メッセージ | 発生条件 |
|--------|-----------|---------|
| `SERVER_ERROR` | サーバーエラーが発生しました | DB接続エラー、予期しないエラー |

---

**このAPI契約書に従って実装することで、フロントエンドとバックエンドの連携がスムーズになります。**
