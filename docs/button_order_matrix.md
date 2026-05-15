# 画面別: 主体が分かれるボタン一覧（順序入れ替えテスト対象）

このドキュメントは「プレゼンター／回答者／オーナーの押す順序が入れ替わっても壊れないべきボタン」を整理するための一覧です。  
（全ボタンの網羅ではなく、**複数主体が同一状態に影響し得るボタン**を優先）

## `app/o/[ownerToken]/page.tsx`（オーナー画面）
- **参加登録を締め切る**（Owner）: `POST /api/owner/close-registration`
  - **順序揺れ**: 参加者が参加登録中/直後でも締切操作が成立する（409等でもUIが破綻しない）
- **Sessionを開始する**（Owner）: `POST /api/owner/start-session`
  - **順序揺れ**: 参加者側がセッションページを開いた状態でも開始でき、参加者側は状態更新に追従
- **結果を公開する**（Owner）: `POST /api/owner/publish`（または該当API）
  - **順序揺れ**: 参加者側がセッション/結果ページを開いていても published へ追従し、結果表示へ遷移
  - **期待エラー**: `aggregating` 以外での公開は `INVALID_STATE`

## `app/session/[joinToken]/page.tsx`（セッション管理 / 参加者ホーム）
- **参加登録へ**（回答者）: `/s/[joinToken]` へ
- **回答入力へ**（回答者）: `/round/[sampleId]` へ
  - **順序揺れ**: Presenter が Round を開始する前後での遷移（pending→answering）
- **このRoundの結果を見る**（回答者）: `/round-result/[sampleId]` へ
  - **順序揺れ**: Presenter が finish して revealed になった直後でも成立
- **Presenterパネルを開く**（Presenter）: `/presenter/[sampleId]` へ

## `app/session/[joinToken]/presenter/[sampleId]/page.tsx`（Presenter画面）
- **Roundを開始する**（Presenter）: `POST /api/round/start`
  - **順序揺れ**: 回答者がセッションページ/回答画面を開いていても、開始後の状態に追従
- **正解情報を保存**（Presenter）: `POST /api/truths/upsert`
- **採点（○/×）**（Presenter）: `POST /api/distillery/grade`
- **Roundを終了する**（Presenter）: `POST /api/round/finish`
  - **順序揺れ**: 回答者が提出/未提出の境界や遅延があっても、終了後の結果ページ表示が破綻しない
  - **期待エラー**: 回答者が未提出/未採点のまま終了しようとすると `INVALID_STATE` / `GRADING_INCOMPLETE`

## `app/session/[joinToken]/round/[sampleId]/page.tsx`（回答者画面）
- **下書き保存**（回答者）: `POST /api/answers/upsert`（draft）
- **提出する**（回答者）: `POST /api/answers/upsert`（submitted）
  - **順序揺れ**: Presenter の採点/終了操作との競合（提出直後/遅延反映）
  - **期待エラー**: Round が `answering` 以外（grading/revealed）に移行した後の提出は `INVALID_STATE`

## `app/session/[joinToken]/round-result/[sampleId]/page.tsx`（結果表示）
- **次へ**（全員）: `POST /api/round-result/click-next`
  - **順序揺れ**: クリック順序入れ替え、連打、リロード挟み
- **次のラウンドへ進む**（次Presenter）: `POST /api/round-result/start-next`
  - **順序揺れ**: 早押し/連打/二重実行、次ラウンド開始済み検知（冪等）
- **セッションページに戻る**（全員）: `/session/[joinToken]` へ
  - **順序揺れ**: 最終ラウンド後の `check-complete` 呼び出しと行き来

