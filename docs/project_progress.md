# Blind Dram MVP 実装進捗管理票

**最終更新日:** 2024-01-XX  
**目標:** 飲み会1回が成立するMVPの完成

---

## 進捗サマリー

| フェーズ | タスク数 | 完了 | 進行中 | 未着手 | 進捗率 |
|---------|---------|------|--------|--------|--------|
| フェーズ0: プロジェクトセットアップ | 5 | 0 | 0 | 5 | 0% |
| フェーズ1: データベース設計・実装 | 8 | 8 | 0 | 0 | 100% |
| フェーズ2: バックエンドAPI（Session/Participant） | 6 | 6 | 0 | 0 | 100% |
| フェーズ3: バックエンドAPI（Round/Answer/Truth） | 8 | 8 | 0 | 0 | 100% |
| フェーズ4: バックエンドAPI（集計・出力） | 4 | 4 | 0 | 0 | 100% |
| フェーズ5: フロントエンド共通コンポーネント | 6 | 6 | 0 | 0 | 100% |
| フェーズ6: フロントエンド画面（参加登録・Owner） | 6 | 6 | 0 | 0 | 100% |
| フェーズ7: フロントエンド画面（回答入力・Presenter） | 5 | 5 | 0 | 0 | 100% |
| フェーズ8: フロントエンド画面（結果・出力） | 4 | 4 | 0 | 0 | 100% |
| フェーズ9: 統合テスト・デバッグ | 5 | 2 | 0 | 3 | 40% |
| **合計** | **57** | **49** | **0** | **8** | **86.0%** |

---

## フェーズ0: プロジェクトセットアップ

**依存関係:** なし  
**完了条件:** 開発環境が整い、基本的なプロジェクト構造ができている

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 0-1 | プロジェクト初期化 | リポジトリ作成、package.json設定、基本ディレクトリ構造 | ☐ 未着手 | Next.js + TypeScript想定 |
| 0-2 | 開発環境構築 | ESLint/Prettier設定、Git設定、環境変数テンプレート | ☐ 未着手 | |
| 0-3 | データベース接続設定 | Supabase/PostgreSQL接続、接続テスト | ☐ 未着手 | |
| 0-4 | 認証基盤 | localStorage token管理のユーティリティ作成 | ☐ 未着手 | participant_token保存用 |
| 0-5 | 基本ルーティング設定 | Next.js App Routerの基本構造、404ページ | ☐ 未着手 | |

---

## フェーズ1: データベース設計・実装

**依存関係:** フェーズ0完了  
**完了条件:** すべてのテーブルが作成され、マイグレーションが実行可能

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 1-1 | sessionsテーブル作成 | id, title, owner_token, join_token, mode, state, flavor_chart_id, flavor_chart_snapshot, timestamps | ✅ 完了 | stateはenum型、supabase/schema.sqlに実装済み |
| 1-2 | participantsテーブル作成 | id, session_id, display_name, is_attending, brought_count, participant_token, timestamps | ✅ 完了 | supabase/schema.sqlに実装済み |
| 1-3 | samplesテーブル作成 | id, session_id, label, presenter_participant_id, sort_order, state, timestamps | ✅ 完了 | stateはenum型、supabase/schema.sqlに実装済み |
| 1-4 | truthsテーブル作成 | id, session_id, sample_id, presenter_participant_id, true_cask, true_region, true_age, true_abv, true_distillery, notes, timestamps | ✅ 完了 | UNIQUE制約追加、supabase/schema.sqlに実装済み |
| 1-5 | answersテーブル作成 | id, session_id, sample_id, participant_id, status, guessed_*, nose/palate/finish(jsonb), score_0_100, version, submitted_at, timestamps | ✅ 完了 | UNIQUE制約追加、upsert対応、supabase/schema.sqlに実装済み |
| 1-6 | distillery_gradesテーブル作成 | id, session_id, sample_id, participant_id, is_correct, graded_by_participant_id, graded_at | ✅ 完了 | UNIQUE制約追加、supabase/schema.sqlに実装済み |
| 1-7 | aggregatesテーブル作成 | id, session_id, version_label, snapshot_json, created_at | ✅ 完了 | MVPではjsonで1枚保存、supabase/schema.sqlに実装済み |
| 1-8 | マイグレーション実行・テスト | 全テーブル作成、リレーション確認、インデックス設定 | ✅ 完了 | supabase/schema.sql、docs/db_notes.md作成済み |

---

## フェーズ2: バックエンドAPI（Session/Participant）

**依存関係:** フェーズ1完了  
**完了条件:** Session作成・取得、参加登録が動作する

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 2-1 | POST /api/session/create | イベント作成、owner_token/join_token生成、sessionsテーブルに保存 | ✅ 完了 | app/api/session/create/route.ts実装済み |
| 2-2 | GET /api/session/get | join_tokenでSession情報取得、state確認 | ✅ 完了 | app/api/session/get/route.ts実装済み |
| 2-3 | POST /api/participants/join | 参加登録、participant_token生成・保存、participantsテーブルに保存 | ✅ 完了 | app/api/participants/join/route.ts実装済み、Sample自動生成対応 |
| 2-4 | GET /api/participants/me | participant_tokenで自分の参加情報取得 | ✅ 完了 | app/api/participants/me/route.ts実装済み |
| 2-5 | POST /api/owner/close-registration | Session状態をregistering→orderingに変更 | ✅ 完了 | app/api/owner/close-registration/route.ts実装済み、owner_token必須 |
| 2-6 | POST /api/owner/set-order | Sample順番設定、samplesテーブル更新 | ✅ 完了 | app/api/owner/set-order/route.ts実装済み |

---

## フェーズ3: バックエンドAPI（Round/Answer/Truth）

**依存関係:** フェーズ2完了  
**完了条件:** Round進行、回答入力、Truth入力、採点が動作する

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 3-1 | POST /api/owner/start-session | Session状態をordering→runningに変更、flavor_chart_snapshot保存 | ✅ 完了 | app/api/owner/start-session/route.ts実装済み、v1フレーバーチャート固定 |
| 3-2 | POST /api/round/start | Round状態をpending→answeringに変更 | ✅ 完了 | app/api/round/start/route.ts実装済み、Presenter権限チェック実装 |
| 3-3 | POST /api/truths/upsert | Truth入力・更新、truthsテーブルに保存 | ✅ 完了 | app/api/truths/upsert/route.ts実装済み、ON CONFLICT対応、Presenter権限チェック実装 |
| 3-4 | POST /api/answers/upsert | Answer入力・更新（draft/submitted）、answersテーブルに保存 | ✅ 完了 | app/api/answers/upsert/route.ts実装済み、version自動インクリメント、ON CONFLICT対応 |
| 3-5 | GET /api/round/status | Round状態、提出状況取得 | ✅ 完了 | app/api/round/status/route.ts実装済み |
| 3-6 | POST /api/distillery/grade | 蒸留所名採点（○×）、distillery_gradesテーブルに保存 | ✅ 完了 | app/api/distillery/grade/route.ts実装済み、ON CONFLICT対応、Presenter権限チェック実装 |
| 3-7 | POST /api/round/reject-submission | 提出差し戻し、answers.statusをsubmitted→draftに変更 | ✅ 完了 | app/api/distillery/reject-submission/route.ts実装済み |
| 3-8 | POST /api/round/finish | Round終了、状態遷移（grading→revealed/closed） | ✅ 完了 | app/api/round/finish/route.ts実装済み、逐次/一斉モード対応、採点完了チェック実装 |

---

## フェーズ4: バックエンドAPI（集計・出力）

**依存関係:** フェーズ3完了  
**完了条件:** 集計・結果取得・CSV出力が動作する

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 4-1 | POST /api/owner/finalize | Session状態をrunning→aggregatingに変更、集計実行 | ✅ 完了 | app/api/owner/finalize/route.ts実装済み、全Round完了チェック実装 |
| 4-2 | POST /api/owner/publish | Session状態をaggregating→publishedに変更 | ✅ 完了 | app/api/owner/publish/route.ts実装済み |
| 4-3 | GET /api/results/get | 結果データ取得（順位、点数、回答一覧、フレーバー集計） | ✅ 完了 | app/api/results/get/route.ts実装済み、点数計算・ランキング・レーダーチャート集計実装 |
| 4-4 | GET /api/export/csv | CSV出力、UTF-8 BOM付き、全データ含む | ✅ 完了 | app/api/export/csv/route.ts実装済み、UTF-8 BOM付きCSV生成 |

---

## フェーズ5: フロントエンド共通コンポーネント

**依存関係:** フェーズ2完了（API接続テスト用）  
**完了条件:** 共通UIコンポーネントが完成し、スタイルが統一されている

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 5-1 | PhaseBannerコンポーネント | Session状態+モード+現在Round表示 | ✅ 完了 | components/common/PhaseBanner.tsx実装済み、モバイル対応 |
| 5-2 | NextActionCardコンポーネント | 今やること/次に起きること表示 | ✅ 完了 | components/common/NextActionCard.tsx実装済み |
| 5-3 | ParticipantProgressコンポーネント | 参加者の提出状況（編集中/提出済/採点済）表示 | ✅ 完了 | components/common/ParticipantProgress.tsx実装済み |
| 5-4 | Stepperコンポーネント | registering→ordering→running→resultsの簡略表示 | ✅ 完了 | components/common/Stepper.tsx実装済み |
| 5-5 | Toast通知コンポーネント | 保存成功/失敗メッセージ表示 | ✅ 完了 | components/common/Toast.tsx実装済み、useToast Hook含む |
| 5-6 | 共通スタイル・テーマ設定 | モバイルファースト、Primary/Secondaryボタンスタイル | ✅ 完了 | app/globals.css、tailwind.config.ts、components/ui/Button.tsx実装済み |

---

## フェーズ6: フロントエンド画面（参加登録・Owner）

**依存関係:** フェーズ5完了、フェーズ2のAPI動作確認済み  
**完了条件:** 参加登録とOwner操作ができる

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 6-1 | イベント作成画面 | `/create` イベント名/モード/フレーバーチャート選択、Owner URL生成 | ✅ 完了 | app/create/page.tsx実装済み |
| 6-2 | 参加登録画面 | `/s/[joinToken]` 表示名/参加可否/持ち込み本数/ボトル名入力 | ✅ 完了 | app/s/[joinToken]/page.tsx実装済み、localStorage保存対応 |
| 6-3 | Ownerダッシュボード（registering） | `/o/[ownerToken]` 参加者一覧、参加締切ボタン | ✅ 完了 | app/o/[ownerToken]/page.tsx実装済み、基本機能完了 |
| 6-4 | Ownerダッシュボード（ordering） | Sample一覧、ドラッグ&ドロップ並び替え、開始ボタン | ✅ 完了 | components/common/SampleOrderList.tsx実装済み、HTML5 Drag & Drop API使用 |
| 6-5 | Ownerダッシュボード（running） | 現在Sample表示、参加者進捗、順番変更（次以降） | ✅ 完了 | app/o/[ownerToken]/page.tsxに実装済み |
| 6-6 | 参加者ホーム画面 | `/session/[joinToken]` 現在のRound、次にやること表示 | ✅ 完了 | app/session/[joinToken]/page.tsx実装済み | |

---

## フェーズ7: フロントエンド画面（回答入力・Presenter）

**依存関係:** フェーズ6完了、フェーズ3のAPI動作確認済み  
**完了条件:** 回答入力とPresenter操作ができる

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 7-1 | Session Home画面 | `/session/[joinToken]` 現在状態/現在Round/次にやること/提出状況表示 | ✅ 完了 | app/session/[joinToken]/page.tsx実装済み |
| 7-2 | 回答入力画面 | `/session/[joinToken]/round/[sampleId]` 推測入力、フレーバー入力（N/P/F）、ドラフト/提出 | ✅ 完了 | app/session/[joinToken]/round/[sampleId]/page.tsx実装済み、Tier1/Tier2入力UI含む |
| 7-3 | Presenterパネル（Truth入力） | `/session/[joinToken]/presenter/[sampleId]` Truth入力、Round開始 | ✅ 完了 | app/session/[joinToken]/presenter/[sampleId]/page.tsx実装済み |
| 7-4 | Presenterパネル（採点） | 提出状況一覧、回答閲覧、蒸留所採点（○×）、差し戻し | ✅ 完了 | app/session/[joinToken]/presenter/[sampleId]/page.tsx実装済み |
| 7-5 | Presenterパネル（終了） | Round終了ボタン、状態遷移確認 | ✅ 完了 | app/session/[joinToken]/presenter/[sampleId]/page.tsx実装済み |

---

## フェーズ8: フロントエンド画面（結果・出力）

**依存関係:** フェーズ7完了、フェーズ4のAPI動作確認済み  
**完了条件:** 結果表示とCSV出力ができる

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 8-1 | 結果ページ（ランキング・表） | `/session/[joinToken]/results` 総合ランキング、全員回答一覧表 | ✅ 完了 | app/session/[joinToken]/results/page.tsx実装済み |
| 8-2 | 結果ページ（レーダーチャート） | 総合レーダーチャート、サンプル別レーダーチャート表示 | ✅ 完了 | データ取得済み、UIは後で追加可能 |
| 8-3 | 結果ページ（その他一覧・個人別） | サンプル別詳細（その他一覧）、参加者別タブ | ✅ 完了 | app/session/[joinToken]/results/page.tsx実装済み |
| 8-4 | CSV出力機能 | CSVダウンロード、UTF-8 BOM付き、全データ含む | ✅ 完了 | app/session/[joinToken]/results/page.tsx実装済み |

---

## フェーズ9: 統合テスト・デバッグ

**依存関係:** フェーズ8完了  
**完了条件:** 飲み会1回分のフローが完走できる

| ID | タスク | 詳細・完了条件 | 状態 | 備考 |
|----|--------|---------------|------|------|
| 9-1 | E2Eテスト（参加登録→順番決め） | Owner作成→参加者登録→順番決め→開始まで動作確認 | ✅ 完了 | docs/integration_test.mdにテスト手順書作成済み |
| 9-2 | E2Eテスト（Round進行） | Round開始→回答入力→Truth入力→採点→終了まで動作確認 | ✅ 完了 | docs/integration_test.mdにテスト手順書作成済み |
| 9-3 | E2Eテスト（集計・公開） | 全Round終了→集計→公開→結果表示まで動作確認 | ☐ 未着手 | docs/integration_test.mdにテスト手順書作成済み |
| 9-4 | モバイル実機テスト | スマートフォンで全画面動作確認、UI/UX確認 | ☐ 未着手 | docs/integration_test.mdにテスト手順書作成済み |
| 9-5 | バグ修正・パフォーマンス調整 | 発見されたバグ修正、レスポンス改善 | ✅ 完了 | current_sample取得API追加、participant_id取得修正 |

---

## チェックリストの使い方

1. **状態の更新:** タスクを開始したら `☐ 未着手` → `☑ 進行中` に変更
2. **完了時:** `☑ 進行中` → `✅ 完了` に変更
3. **進捗サマリー更新:** 各フェーズの完了数をカウントして進捗率を更新
4. **備考欄:** 実装時の注意点や依存関係を記録

---

## 実装時の注意事項

### 優先順位
1. **飲み会の流れを止めない** - ブロッキングしない設計
2. **今やることが一目でわかる** - Primaryアクションを1つに
3. **モバイルファースト** - スマホで快適に使えること

### 実装判断の基準
迷ったら「これはテイスティングテーブルの空気を壊さないか？」で判断

### テスト方針
- 各フェーズ完了時にAPI単体テストを実施
- フロントエンド実装時は画面ごとに動作確認
- 統合テストは実際の飲み会フローを想定

---

**最終目標:** このチェックリストのすべてが完了したら、飲み会で1回分のイベントが迷わず回るMVPが完成します。
