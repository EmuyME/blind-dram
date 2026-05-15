# Blind Dram – MVP完全仕様書

**Version:** v1.0 (MVP)  
**目的:** この仕様書だけで Blind Dram が実装でき、飲み会で1回分のイベントが迷わず回ること

---

## 目次

1. [プロダクトの思想](#1-プロダクトの思想)
2. [想定されるテイスティングイベントの時系列ストーリー](#2-想定されるテイスティングイベントの時系列ストーリー)
3. [ユーザーの役割](#3-ユーザーの役割)
4. [Session と Round の状態機械](#4-session-と-round-の状態機械)
5. [画面一覧と各画面でできること](#5-画面一覧と各画面でできること)
6. [参加登録・順番決定・回答・採点・公開のルール](#6-参加登録順番決定回答採点公開のルール)
7. [フレーバーチャートのデータ構造](#7-フレーバーチャートのデータ構造)
8. [フレーバー入力と集計（レーダーチャート用）](#8-フレーバー入力と集計レーダーチャート用)
9. [結果画面（表・チャート・個人別タブ）](#9-結果画面表チャート個人別タブ)
10. [出力（PDF / CSV / 賞状）のMVP仕様](#10-出力pdf--csv--賞状のmvp仕様)
11. [MVPで省略してよいこと、後回しでよいこと](#11-mvpで省略してよいこと後回しでよいこと)

---

## 1. プロダクトの思想

### 1.1 デジタル司会者としての役割

Blind Dram は「ブラインドテイスティング会」を支援する**デジタル司会者**である。

- これはスコア計算アプリではない
- これは管理ツールでもない
- **場のテンポ・会話・盛り上がりを壊さないのが最優先**

### 1.2 UX原則（実装判断の優先順位）

実装判断に迷ったら以下の優先順位で決める。

1. **飲み会の流れを止めない**（ブロッキングしない）
2. **今やることが一目でわかる**（Primary アクションを1つに絞る）
3. **押し間違い/編集/訂正は「普通の行動」として許す**（差し戻し可能）
4. **誰が何を終えたか（進捗）が見える**（参加者全員の状態が可視化）
5. **厳密性（入力バリデーション、権限の細分化）は後回し**（体験の継続を優先）

### 1.3 "許す設計"

- 入力ミス → 差し戻し/訂正ができる
- 考え直し → ドラフト保存ができる
- 時間とともに味が変わる → 回答が変わるのは自然
- したがって「訂正後は再計算」できるのが正しい

### 1.4 モバイルファースト

- すべての画面はスマートフォンで快適に使えること
- タップ領域は十分に大きく、誤操作を防ぐ
- スクロールを最小限に（1画面に1つの主要アクション）

---

## 2. 想定されるテイスティングイベントの時系列ストーリー

### 2.1 事前準備（Owner）

**時刻: イベント数日前〜当日開始前**

1. Owner がイベントを作成
   - イベント名を入力（例：「2024年1月ウイスキー会」）
   - 回答モードを選択：**逐次**（各Round終了時に結果公開）または**一斉**（全Round終了後に一括公開）
   - 使用するフレーバーチャートを選択（v1など）
2. 参加URLを生成（`/s/[joinToken]`）
3. 参加URLを配布（LINEグループ、メールなど）

### 2.2 参加登録（全員、スマホ）

**時刻: イベント開始前〜開始直後**

1. 参加者が参加URLにアクセス
2. 参加登録画面で以下を入力：
   - 表示名（例：「田中太郎」）
   - 参加する/しない（閲覧のみも可）
   - 持ち込み本数（例：2本）
   - 持ち込み本数分の仮ボトル名（例：「A」「B」または「山崎12年」「余市」など自由）
3. 登録完了後、`participant_token` を localStorage に保存
4. Session Home 画面に遷移

**注意:** この段階では正解（Truth）は入力しない。持ち込み主（Presenter）は後で決まる。

### 2.3 順番決め（Owner）

**時刻: 全員登録完了後、テイスティング開始前**

1. Owner が Owner ダッシュボード（`/o/[ownerToken]`）にアクセス
2. 参加者一覧を確認（全員登録済みか確認）
3. 「参加締切」ボタンを押す（Session 状態: `registering` → `ordering`）
4. Sample 一覧が表示される（各参加者の持ち込みボトルが自動生成）
5. ドラッグ&ドロップで順番を並び替え（例：A → B → C → D）
6. 各 Sample に持ち込み主（Presenter）が自動紐づけ
7. 「開始」ボタンを押す（Session 状態: `ordering` → `running`）
   - **この時点でフレーバーチャートのスナップショットを保存**

### 2.4 Round 1 開始（Presenter 主導）

**時刻: テイスティング開始**

1. 現在の Sample（例：Sample A）が表示される
2. Presenter（Sample A の持ち込み主）が Presenter パネルにアクセス
3. Presenter が正解（Truth）を入力：
   - カスクタイプ（例：「シェリー樽」）
   - 地域（例：「スコットランド」）
   - 熟成年数（例：12）
   - 度数（例：43）
   - 蒸留所名（例：「マッカラン」）
4. 「Round 開始」ボタンを押す（Round 状態: `pending` → `answering`）

### 2.5 回答入力（全参加者）

**時刻: Round 開始後**

1. 全参加者が Session Home で「回答入力へ」ボタンをタップ
2. 回答入力画面（`/session/[joinToken]/round/[sampleId]`）で以下を入力：

   **推測（採点対象）:**
   - カスクタイプ（選択）
   - 地域（選択）
   - 熟成年数（数値）
   - 度数（数値）
   - 蒸留所名（文字）

   **フレーバー入力（Nose / Palate / Finish それぞれ）:**
   - Tier1 タグを選択（複数可、「その他」も可）
   - Tier2 用語を自由入力（複数可、サジェスト候補あり）

   **任意コメント:**
   - nose_text / palate_text / finish_text（自由記述）
   - 点数（0-100、自分用メモ）

3. 「編集中で保存」（ドラフト）または「回答済み」（提出）を選択
   - ドラフト: 後で編集可能、Presenter には見えない
   - 提出: Presenter が回答を閲覧可能、編集は制限付きで可能

### 2.6 提出状況確認と採点（Presenter）

**時刻: 参加者が回答提出後**

1. Presenter が Presenter パネルで提出状況を確認
   - 参加者一覧に「編集中」「提出済」の状態が表示
2. 提出済みの回答を閲覧（推測値、フレーバーコメント）
3. 蒸留所名を人手で採点（○×）
   - 正解: 6点
   - 不正解: 0点
4. 必要に応じて「差し戻し」を実行（提出を解除、参加者が再編集可能）

### 2.7 Round 終了と公開

**時刻: 全員提出済み & Presenter 採点完了後**

1. Presenter が「Round 終了」ボタンを押す
2. Round 状態: `grading` → `revealed`（逐次モード）または `closed`（一斉モード）
3. **逐次モード:** その場で結果公開
   - 正解が表示される
   - 各参加者の点数が表示される
   - フレーバーレーダーチャートが表示される
4. **一斉モード:** 結果は非公開（ただし Owner/Presenter は進捗把握可能）
5. 次の Round に進む（自動または手動）

### 2.8 全 Round 終了後（Owner）

**時刻: すべての Round が終了後**

1. Owner が Owner ダッシュボードで「集計」を実行
   - Session 状態: `running` → `aggregating`
   - 全 Round の点数を合計
   - 総合順位を計算
   - フレーバーレーダーチャートを集計
2. 「結果公開」ボタンを押す
   - Session 状態: `aggregating` → `published`
3. 全参加者が結果ページにアクセス可能になる

### 2.9 結果閲覧と出力（全員）

**時刻: 結果公開後**

1. 全参加者が結果ページ（`/session/[joinToken]/results`）にアクセス
2. 以下を閲覧：
   - 総合ランキング（順位、合計点数）
   - 全員の回答一覧表
   - サンプル別レーダーチャート
   - 参加者別タブで個別閲覧
3. Owner が CSV を出力（全参加者がダウンロード可能）

---

## 3. ユーザーの役割

### 3.1 Owner（代表者）

**権限:**
- Session 作成/設定（イベント名、モード、フレーバーチャート）
- 参加締切
- Sample 順番決め
- Session 開始（フレーバーチャートスナップショット保存）
- Session 終了（集計・公開）
- 出力実行（CSV、将来 PDF/賞状）

**特徴:**
- 最初だけ主導し、その後は観測者になる設計
- Owner 専用 URL: `/o/[ownerToken]`

### 3.2 Participant（参加者）

**権限:**
- 参加登録
- 自分の回答入力（ドラフト保存/提出）
- 訂正（許可時）
- 結果閲覧（公開状態に依存）

**特徴:**
- 参加者トークン（`participant_token`）を localStorage に保存
- 参加者専用 URL: `/s/[joinToken]` または `/session/[joinToken]`

### 3.3 Presenter（出題者、Participant の一部）

**権限:**
- 自分が担当する Sample の Truth 入力（正解）
- 参加者の提出状況閲覧
- 蒸留所名の採点（○×）
- 差し戻し（提出解除）
- Round 終了（公開のトリガ）

**特徴:**
- Participant として参加登録し、自分の持ち込み Sample の Presenter になる
- Presenter 専用 URL: `/session/[joinToken]/presenter/[sampleId]`

---

## 4. Session と Round の状態機械

### 4.1 Session 状態遷移表

| 状態 | 状態名 | 説明 | 遷移条件 | 次状態 |
|------|--------|------|----------|--------|
| S0 | `created` | 作成直後 | Owner が Session 作成 | - |
| S1 | `registering` | 参加登録中 | S0 → S1: Owner が作成完了 | S2 |
| S2 | `ordering` | 順番決め中 | S1 → S2: Owner が参加締切 | S3 |
| S3 | `running` | 進行中 | S2 → S3: Owner が開始（スナップショット保存） | S4 |
| S4 | `aggregating` | 集計・確定前 | S3 → S4: 全 Round 完了 + Owner が集計へ | S5 |
| S5 | `published` | 結果公開 | S4 → S5: Owner が公開 | S6 |
| S6 | `closed` | 終了・アーカイブ | S5 → S6: Owner が終了 | - |

**状態遷移図:**
```
S0 (created)
  ↓ [Owner作成完了]
S1 (registering)
  ↓ [Owner参加締切]
S2 (ordering)
  ↓ [Owner開始・スナップショット保存]
S3 (running)
  ↓ [全Round完了 + Owner集計]
S4 (aggregating)
  ↓ [Owner公開]
S5 (published)
  ↓ [Owner終了]
S6 (closed)
```

### 4.2 Round（Sample）状態遷移表

| 状態 | 状態名 | 説明 | 遷移条件 | 次状態 |
|------|--------|------|----------|--------|
| R0 | `pending` | 未開始 | Sample 作成時 | R1 |
| R1 | `answering` | 回答受付中 | R0 → R1: Presenter が Round 開始 | R2 |
| R2 | `grading` | 蒸留所採点中 | R1 → R2: 全員提出 + Presenter Truth 入力済み | R3 |
| R3 | `revealed` | 逐次公開済み | R2 → R3: Presenter が採点完了（逐次モード） | R4 |
| R4 | `closed` | 完了 | R3 → R4: Presenter が Round 終了 | - |

**注意:** 一斉モードでは R3 をスキップして R2 → R4 に遷移してもよい（内部的に完了扱い）。

**状態遷移図:**
```
R0 (pending)
  ↓ [Presenter開始]
R1 (answering)
  ↓ [全員提出 + Truth入力済み]
R2 (grading)
  ↓ [Presenter採点完了]
R3 (revealed) [逐次モードのみ]
  ↓ [Presenter終了]
R4 (closed)
```

### 4.3 状態による画面表示の制御

- **Session 状態が `registering`:** 参加登録画面を表示、Owner は参加者一覧を表示
- **Session 状態が `ordering`:** Owner のみ順番決め画面を表示、参加者は待機画面
- **Session 状態が `running`:** 現在の Round に応じて回答入力画面を表示
- **Session 状態が `published`:** 結果ページを全員が閲覧可能

---

## 5. 画面一覧と各画面でできること

### 5.1 Owner 側画面

#### 5.1.1 イベント作成画面
**URL:** `/create` または Owner ダッシュボード内

**できること:**
- イベント名を入力
- 回答モードを選択（逐次 / 一斉）
- 使用するフレーバーチャートを選択（v1など）
- 「作成」ボタンで Session 作成
- 作成後、`owner_token` と `join_token` が発行される

**出力:**
- Owner URL: `/o/[ownerToken]`
- 参加 URL: `/s/[joinToken]`

#### 5.1.2 Owner ダッシュボード
**URL:** `/o/[ownerToken]`

**状態別表示:**

**S1 (registering):**
- 参加者一覧（表示名、持ち込み本数、登録状態）
- 「参加締切」ボタン（Primary）
- 注意書き：「締切後に参加登録の自由編集ができなくなります」

**S2 (ordering):**
- Sample 一覧（ドラッグ&ドロップで並び替え可能）
- 各 Sample に Presenter（持ち込み主）が表示
- 「開始」ボタン（Primary）
- 注意書き：「開始後はフレーバーチャートが固定されます」

**S3 (running):**
- 現在の Sample 表示
- 参加者進捗（参考表示、編集中/提出済/採点済）
- 次以降の順番変更/追加（Secondary ボタン）
- 注意書き：「進行中の Round は変更できません」

**S4 (aggregating):**
- 「集計実行」ボタン（Primary）
- 集計結果のプレビュー（任意）

**S5 (published):**
- 「CSV出力」ボタン（Primary）
- 結果ページへのリンク
- 将来：「PDF出力」「賞状出力」ボタン（Secondary）

### 5.2 Participant 側画面

#### 5.2.1 参加登録画面
**URL:** `/s/[joinToken]`

**できること:**
- 表示名を入力
- 参加する/しないを選択（閲覧のみも可）
- 持ち込み本数を入力（0以上）
- 持ち込み本数分の仮ボトル名を入力（例：「A」「B」）
- 「登録」ボタンで参加登録
- 登録後、`participant_token` を localStorage に保存
- Session Home に自動遷移

#### 5.2.2 Session Home
**URL:** `/session/[joinToken]`

**表示内容:**
- 現在の Session 状態（Phase Banner）
- 現在の Round（Sample）情報
- 次にやること（Next Action Card）
  - 現在 Sample が `answering` なら「回答入力へ」ボタン
  - 現在 Sample が `pending` なら「待機中」表示
- 提出状況（全員の状態が見える）
- 結果リンク（公開後のみ表示）

#### 5.2.3 回答入力画面
**URL:** `/session/[joinToken]/round/[sampleId]`

**できること:**

**推測入力（採点対象）:**
- カスクタイプ（選択: シェリー樽、バーボン樽、その他）
- 地域（選択: スコットランド、アイルランド、日本、その他）
- 熟成年数（数値入力）
- 度数（数値入力）
- 蒸留所名（文字入力）

**フレーバー入力（Nose / Palate / Finish それぞれ）:**
- Tier1 タグ選択（複数可、「その他」も可）
- Tier2 用語入力（自由入力、複数可、サジェスト候補あり）
- 任意コメント（nose_text / palate_text / finish_text）
- 点数（0-100、自分用メモ）

**ボタン:**
- 「編集中で保存」（ドラフト保存、後で編集可能）
- 「回答済み」（提出、Presenter が閲覧可能）
- 「戻る」（Session Home に戻る）

**注意:** 提出後も Round が確定していない間は編集可能（設定で制御可）。

### 5.3 Presenter 側画面

#### 5.3.1 Presenter パネル
**URL:** `/session/[joinToken]/presenter/[sampleId]`

**できること:**

**Truth 入力（正解）:**
- カスクタイプ（選択）
- 地域（選択）
- 熟成年数（数値）
- 度数（数値）
- 蒸留所名（文字）

**提出状況一覧:**
- 全参加者の状態表示（編集中/提出済）
- 各参加者の回答内容閲覧（推測値、フレーバーコメント）

**採点:**
- 蒸留所名を人手で採点（○×）
  - 正解: 6点
  - 不正解: 0点

**操作:**
- 「差し戻し」ボタン（提出を解除、参加者が再編集可能）
- 「Round 開始」ボタン（R0 → R1、Truth 入力後）
- 「Round 終了」ボタン（R2 → R3/R4、採点完了後、Primary）

### 5.4 結果画面

#### 5.4.1 結果ページ
**URL:** `/session/[joinToken]/results`

**表示内容（Session 状態が `published` 以降のみ）:**

**上部:**
- 総合ランキング（順位、合計点数、参加者名）

**中部:**
- 全員の回答一覧表
  - 行: 参加者
  - 列: 各 Sample の点数/正誤/推測値

**下部:**
- 総合レーダーチャート（全 Sample の Tier1 投稿数合算）
- サンプル別詳細タブ
  - 各 Sample のレーダーチャート（Tier1）
  - 「その他一覧」（Tier1=その他で入力された Tier2 文字列を頻度表示）
- 参加者別タブ
  - 各参加者の全 Sample 回答を個別閲覧

---

## 6. 参加登録・順番決定・回答・採点・公開のルール

### 6.1 参加登録のルール

**誰が:** 全参加者（Owner も含む）

**いつ:** Session 状態が `registering` の間

**何を:**
- 表示名（必須）
- 参加する/しない（必須、閲覧のみも可）
- 持ち込み本数（0以上、必須）
- 持ち込み本数分の仮ボトル名（必須、例：「A」「B」）

**制約:**
- 同じ `join_token` で複数回登録可能（最後の登録が有効、または既存参加者の更新）
- `participant_token` を localStorage に保存（再訪問時に自動認証）

**Owner が参加締切後:**
- 新規参加登録は不可（Session 状態が `ordering` 以降）
- 既存参加者の情報変更は制限付きで可能（MVPでは許可しても可）

### 6.2 順番決定のルール

**誰が:** Owner のみ

**いつ:** Session 状態が `ordering` の間

**何を:**
- 各 Sample（参加者の持ち込みボトル）の順番を決める
- ドラッグ&ドロップで並び替え
- 各 Sample に持ち込み主（Presenter）が自動紐づけ

**制約:**
- 順番は後で変更可能（次以降の Sample のみ、進行中の Round は変更不可）
- ボトル追加も可能（次以降に追加）

**Owner が開始後:**
- フレーバーチャートのスナップショットを保存（過去セッションが崩れない）
- Session 状態が `running` になる

### 6.3 回答のルール

**誰が:** 全参加者（Presenter も含む、自分の Sample 以外は回答者として参加）

**いつ:** Round 状態が `answering` の間

**何を:**
- 推測（カスク、地域、年数、度数、蒸留所名）
- フレーバー入力（Nose / Palate / Finish それぞれ、Tier1/Tier2）
- 任意コメント、点数

**状態:**
- **ドラフト（編集中）:** 保存されるが Presenter には見えない、いつでも編集可能
- **提出済み:** Presenter が閲覧可能、Round が確定していない間は編集可能（設定で制御）

**制約:**
- 同じ Round に対して1人1回答（`UNIQUE(session_id, sample_id, participant_id)`）
- 提出後も差し戻し可能（Presenter が実行、または参加者が編集で自動差し戻し）

### 6.4 採点のルール

**誰が:** Presenter（該当 Sample の持ち込み主）

**いつ:** Round 状態が `grading` の間（全員提出済み + Presenter Truth 入力済み）

**何を:**
- 蒸留所名を人手で採点（○×）
  - 正解: 6点
  - 不正解: 0点

**自動採点（システム）:**
- カスク: 3点（選択一致）
- 地域: 3点（選択一致）
- 熟成年数: 3点（誤差1年ごとに -1、下限0）
- 度数: 3点（誤差2%ごとに -1、下限0）

**合計最大:** 18点（カスク3 + 地域3 + 年数3 + 度数3 + 蒸留所6）

**制約:**
- Presenter の採点が完了しないと Round スコアが確定しない
- 採点後も差し戻し可能（再採点が必要）

### 6.5 公開のルール

**誰が:** Presenter（Round 終了）または Owner（Session 公開）

**いつ:**
- **Round 公開:** Round 状態が `grading` → `revealed`（逐次モード）または `closed`（一斉モード）
- **Session 公開:** Session 状態が `aggregating` → `published`

**何を:**
- **逐次モード:** 各 Round 終了時にその場で結果公開（正解、点数、レーダーチャート）
- **一斉モード:** 全 Round 終了後に一括公開（途中は非公開、ただし Owner/Presenter は進捗把握可能）

**制約:**
- 公開後も訂正可能（MVPでは Owner が許可/全員許可のどちらでも可）
- 訂正が入ったら再計算（点数、順位、レーダーチャート）

---

## 7. フレーバーチャートのデータ構造

### 7.1 第1階層（Tier1）

Tier1 は**選択式**で、複数選択可能。「その他」も選択可能。

**フレーバーチャート v1 の Tier1 リスト:**

1. **フルーティ**
2. **フローラル・ハーブ系**
3. **シリアル**
4. **テール**
5. **硫黄系**
6. **サリファリー**
7. **ピート・薫香**
8. **樽熟成**
9. **その他**

### 7.2 第2階層（Tier2）

Tier2 は**自由入力**で、複数入力可能。サジェスト候補を表示（選択可、または自由入力）。

**フレーバーチャート v1 の Tier2 サジェスト例:**

#### フルーティ
- レモン、ライム、オレンジ、グレープフルーツ
- 青リンゴ、赤リンゴ、洋梨、桃、さくらんぼ、プラム
- いちご、ラズベリー、ブラックベリー、カシス
- マンゴー、パイナップル、バナナ、メロン
- ドライレーズン、ドライイチジク、ドライアプリコット

#### フローラル・ハーブ系
- バラ、白い花、スミレ、ラベンダー、ヒース（ヘザー）
- ミント、タイム、ローズマリー、芝生、干し草、甘草

#### シリアル
- 麦芽、穀草、パン、ビスケット、クッキー、クレープ

#### テール
- タバコ、紅茶、バター、皮革、うろこ

#### 硫黄系
- 硫黄、マッチ、ゴム、ゆで卵、キャベツ

#### サリファリー
- なめし革、ゴム、油、肉、ブロス

#### ピート・薫香
- 煙、焚き火、タール、ヨード、海藻、ベーコン、スモーク、焦げ

#### 樽熟成
- バニラ、キャラメル、ハチミツ、メープル、ココナッツ
- クルミ、アーモンド、ヘーゼルナッツ、オーク、セダー、サンダルウッド、杉
- 黒胡椒、白胡椒、ジンジャー、ナツメグ、クローブ、シナモン
- シェリー、マデイラ、ワイン

#### その他
- 自由入力（サンプル別詳細で頻度付き一覧表示）

### 7.3 データ保存構造

**Nose / Palate / Finish それぞれの保存形式（JSONB）:**

```json
{
  "tier1_tags": ["フルーティ", "樽熟成"],
  "tier2_terms": ["レモン", "バニラ", "カスタム用語"],
  "text": "任意のコメント（オプション）"
}
```

**注意:**
- `tier1_tags`: string[]（複数選択可能）
- `tier2_terms`: string[]（自由入力、複数可能）
- `text`: string（任意、統計には含めない）

### 7.4 スナップショット

**目的:** 過去セッションの表示が崩れないようにする

**保存タイミング:** Session 状態が `ordering` → `running` に遷移時

**保存内容:**
- 選択したフレーバーチャート全体を `sessions.flavor_chart_snapshot` に JSONB で保存
- 結果表示・集計はこのスナップショットを基準に行う
- 後でフレーバーチャートを編集しても過去セッションの表示は崩れない

---

## 8. フレーバー入力と集計（レーダーチャート用）

### 8.1 フレーバー入力のUX

**原則:** 「自由記述を邪魔しないが、迷ったら選べる」

**入力方法:**
1. Nose / Palate / Finish それぞれにフレーバー入力欄を用意
2. Tier1 タグを選択（チェックボックス、複数可）
3. Tier2 用語を入力（テキスト入力、複数可、カンマ区切りまたは改行区切り）
   - サジェスト候補を表示（選択可、または自由入力）
4. 任意コメント（text）を入力（オプション）

**保存:**
- 「編集中で保存」または「回答済み」で保存
- ドラフト中はいつでも編集可能

### 8.2 レーダーチャート用集計

**集計対象:** Tier1 タグのみ（Tier2 は集計しない、サンプル別詳細で「その他一覧」として表示）

**集計方法:**
1. 各 Sample ごとに、全参加者の回答から Tier1 タグを集計
2. 各 Tier1 タグの選択回数をカウント（例：「フルーティ」が5回選択された）
3. レーダーチャートの軸に Tier1 タグを配置
4. 各軸の値に選択回数を設定

**総合レーダーチャート:**
- 全 Sample の Tier1 選択回数を合算
- 全体の傾向を可視化

**サンプル別レーダーチャート:**
- 各 Sample ごとの Tier1 選択回数を可視化
- サンプル間の比較が可能

### 8.3 「その他一覧」の集計

**対象:** Tier1 で「その他」を選択した回答の Tier2 用語

**集計方法:**
1. 各 Sample ごとに、「その他」を選択した回答の Tier2 用語を抽出
2. 用語の頻度をカウント（例：「カスタム用語1」が3回、「カスタム用語2」が1回）
3. 頻度順にソートして表示

**表示場所:** サンプル別詳細画面の右下または横

---

## 9. 結果画面（表・チャート・個人別タブ）

### 9.1 全体結果ページの構成

**URL:** `/session/[joinToken]/results`

**表示条件:** Session 状態が `published` 以降のみ

#### 9.1.1 総合ランキング（上部）

**表示内容:**
- 順位（1位、2位、3位...）
- 合計点数（全 Round の合計）
- 参加者名（表示名）

**表示形式:**
- テーブルまたはカード形式
- モバイルファーストで見やすく

#### 9.1.2 全員の回答一覧表（中部）

**表示内容:**
- 行: 参加者
- 列: 各 Sample の点数/正誤/推測値

**表示形式:**
- テーブル（横スクロール可能、モバイル対応）
- 各セルに点数、正誤マーク（○×）、推測値の要約を表示

**MVP では点数中心でも可**（詳細は後で拡張）

#### 9.1.3 総合レーダーチャート（下部）

**表示内容:**
- 全 Sample の Tier1 投稿数合算をレーダーチャートで表示
- 全体の傾向を可視化

**表示形式:**
- レーダーチャート（Chart.js など使用）
- モバイルでも見やすいサイズ

### 9.2 サンプル別詳細

**表示内容:**

**左側（または上部）:**
- Nose / Palate / Finish のコメント表
  - 行: 参加者
  - 列: N/P/F（Tier1 タグ + Tier2 用語）

**右側（または下部）:**
- サンプル別レーダーチャート（Tier1）
- 「その他一覧」
  - Tier1=その他で入力された Tier2 文字列を頻度表示
  - 頻度順にソート

**表示形式:**
- タブまたはアコーディオンで各 Sample を切り替え
- モバイルでは縦に並べて表示

### 9.3 参加者別タブ

**表示内容:**
- 参加者を選択すると、その人の全 Sample 回答が見える
- 推測値、フレーバーコメント、点数を一覧表示

**注意:**
- Presenter のコメント（Truth の notes）は「参考」として表示できるが、統計には含めない

---

## 10. 出力（PDF / CSV / 賞状）のMVP仕様

### 10.1 CSV出力（MVP必須）

**誰が:** Owner のみ（将来は全参加者も可）

**いつ:** Session 状態が `published` 以降

**出力内容:**

**セッション結果:**
- 順位、合計点数、参加者名
- 各 Sample の点数、正誤、推測値、正解

**テイスティングコメント:**
- 各参加者の各 Sample の Nose / Palate / Finish
- Tier1 タグ、Tier2 用語、任意コメント

**「その他一覧」:**
- 各 Sample の「その他」Tier2 用語を頻度付きで出力

**ファイル形式:**
- CSV（UTF-8 BOM 付き、Excel で開ける）
- ファイル名: `blind_dram_[session_title]_[timestamp].csv`

### 10.2 PDF出力（後回し）

**MVP では省略可**（設計だけ置く）

**将来の仕様:**
- 結果ページを PDF 化
- レーダーチャートを含む
- 印刷用レイアウト

### 10.3 賞状出力（後回し）

**MVP では省略可**（設計だけ置く）

**将来の仕様:**
- 優勝者・準優勝者などの賞状画像を生成
- カスタマイズ可能なテンプレート

---

## 11. MVPで省略してよいこと、後回しでよいこと

### 11.1 MVPで省略してよいこと

1. **PDF出力**
   - CSV があれば十分
   - 後で追加可能

2. **賞状出力**
   - 手動で作成してもらう
   - 後で追加可能

3. **細かい入力バリデーション**
   - 必須チェックは最小限（表示名、持ち込み本数など）
   - 数値の範囲チェックは後回し（体験の継続を優先）

4. **権限の細分化**
   - Owner / Presenter / Participant の3役割で十分
   - サブ権限は後回し

5. **履歴管理の詳細**
   - Answer.version は保存するが、履歴閲覧UIは後回し
   - 変更内容ログの詳細表示は後回し

6. **リアルタイム更新**
   - ページリロードで最新状態を取得（ポーリングは後回し）
   - WebSocket は後回し

7. **認証の厳密性**
   - localStorage の `participant_token` で十分
   - パスワード認証は後回し

8. **多言語対応**
   - 日本語のみ（MVP）

9. **ダークモード**
   - ライトモードのみ（MVP）

10. **アニメーション・トランジション**
    - 最小限（体験の継続を優先）

### 11.2 後回しでよいこと（MVP後）

1. **フレーバーチャートの編集機能**
   - MVP では既存のフレーバーチャート（v1）を使用
   - カスタムフレーバーチャート作成は後回し

2. **参加者の途中参加・退出**
   - MVP では参加締切後の参加は不可
   - 途中退出の処理は後回し

3. **Round のスキップ・キャンセル**
   - MVP では順番通りに進む
   - スキップ機能は後回し

4. **複数セッションの管理**
   - MVP では1セッションずつ作成・管理
   - セッション一覧・履歴は後回し

5. **通知機能**
   - MVP では通知なし（参加者が手動で確認）
   - プッシュ通知は後回し

6. **ソーシャル機能**
   - MVP では結果の共有機能なし
   - SNS シェアは後回し

7. **統計・分析機能**
   - MVP では基本的な集計のみ
   - 詳細な統計分析は後回し

8. **テーマ・カスタマイズ**
   - MVP ではデフォルトテーマのみ
   - カスタマイズ機能は後回し

---

## 付録: 技術設計の要点

### データベース（推奨テーブル）

#### sessions
- `id` uuid pk
- `title` text
- `owner_token` text unique
- `join_token` text unique
- `mode` enum('sequential','simultaneous')
- `state` enum('created','registering','ordering','running','aggregating','published','closed')
- `flavor_chart_id` uuid nullable
- `flavor_chart_snapshot` jsonb nullable
- `created_at`, `updated_at`

#### participants
- `id` uuid pk
- `session_id` uuid fk
- `display_name` text
- `is_attending` bool
- `brought_count` int
- `participant_token` text unique
- `created_at`, `updated_at`

#### samples
- `id` uuid pk
- `session_id` uuid fk
- `label` text (A/B/C…)
- `presenter_participant_id` uuid fk participants
- `sort_order` int
- `state` enum('pending','answering','grading','revealed','closed')
- `created_at`, `updated_at`

#### truths
- `id` uuid pk
- `session_id` uuid fk
- `sample_id` uuid fk
- `presenter_participant_id` uuid fk participants
- `true_cask` text nullable
- `true_region` text nullable
- `true_age` int nullable
- `true_abv` numeric nullable
- `true_distillery` text nullable
- `notes` jsonb/text nullable
- `updated_at`
- UNIQUE(session_id, sample_id)

#### answers
- `id` uuid pk
- `session_id` uuid fk
- `sample_id` uuid fk
- `participant_id` uuid fk
- `status` enum('draft','submitted')
- `guessed_cask` text nullable
- `guessed_region` text nullable
- `guessed_age` int nullable
- `guessed_abv` numeric nullable
- `guessed_distillery` text nullable
- `nose` jsonb (tier1_tags, tier2_terms, text)
- `palate` jsonb
- `finish` jsonb
- `score_0_100` int nullable
- `version` int default 1
- `submitted_at` timestamp nullable
- `updated_at`
- UNIQUE(session_id, sample_id, participant_id)

#### distillery_grades
- `id` uuid pk
- `session_id` uuid fk
- `sample_id` uuid fk
- `participant_id` uuid fk (採点される側)
- `is_correct` bool
- `graded_by_participant_id` uuid fk
- `graded_at` timestamp
- UNIQUE(session_id, sample_id, participant_id)

#### aggregates
- `id` uuid pk
- `session_id` uuid fk
- `version_label` text
- `snapshot_json` jsonb
- `created_at`

### ルーティング（Next.js想定）

- `/create` - イベント作成
- `/o/[ownerToken]` - Owner ダッシュボード
- `/s/[joinToken]` - 参加登録
- `/session/[joinToken]` - 参加者ホーム
- `/session/[joinToken]/round/[sampleId]` - 回答入力
- `/session/[joinToken]/presenter/[sampleId]` - Presenter パネル
- `/session/[joinToken]/results` - 結果

---

**この仕様書で Blind Dram の MVP を実装できます。飲み会で迷わず回ることを最優先に、実装を進めてください。**
