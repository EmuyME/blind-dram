# Blind Dram – UI/UXルール（MVP完全版）

このドキュメントは、モバイルファーストのUI/UXルールと共通コンポーネントの仕様を定義する。  
**実装者がそのままコピペで使える粒度で記載する。**  
**「デジタル司会者」として飲み会のテンポを壊さないことを最優先とする。**

---

## 目次

1. [UI/UX原則](#1-uiux原則)
2. [画面共通レイアウト構成](#2-画面共通レイアウト構成)
3. [モバイルUIの具体ルール](#3-モバイルuiの具体ルール)
4. [共通コンポーネント仕様](#4-共通コンポーネント仕様)
5. [ボタンのdisabledルール](#5-ボタンのdisabledルール)
6. [状態ごとの画面表示差分](#6-状態ごとの画面表示差分)
7. [エラー表示・保存成功・再試行のUXルール](#7-エラー表示保存成功再試行のuxルール)

---

## 1. UI/UX原則

### 1.1 最優先原則

1. **飲み会の流れを止めない**（ブロッキングしない）
2. **今やることが一目でわかる**（Primaryアクションを1つに）
3. **押し間違い/編集/訂正は「普通の行動」として許す**（差し戻し可能）
4. **誰が何を終えたか（進捗）が見える**（参加者全員の状態が可視化）
5. **厳密性（入力バリデーション、権限の細分化）は後回し**（体験の継続を優先）

### 1.2 "許す設計"

- 入力ミス → 差し戻し/訂正ができる
- 考え直し → ドラフト保存ができる
- 時間とともに味が変わる → 回答が変わるのは自然
- したがって「訂正後は再計算」できるのが正しい

---

## 2. 画面共通レイアウト構成

### 2.1 基本レイアウト構造（全画面共通）

**構成（上から下へ）:**

```
┌─────────────────────────────────┐
│ PhaseBanner（固定、最上部）      │ ← 常に表示
├─────────────────────────────────┤
│ NextActionCard（Card形式）       │ ← 常に表示
├─────────────────────────────────┤
│ メインコンテンツ                 │ ← 画面固有
│ （入力フォーム、一覧など）       │
├─────────────────────────────────┤
│ ParticipantProgress（該当時）   │ ← 条件付き表示
├─────────────────────────────────┤
│ 固定フッター（該当時）           │ ← 条件付き表示
└─────────────────────────────────┘
```

### 2.2 実装例（TypeScript/React）

```typescript
"use client";

import { PhaseBanner } from '@/components/common/PhaseBanner';
import { NextActionCard } from '@/components/common/NextActionCard';
import { ParticipantProgress } from '@/components/common/ParticipantProgress';

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* PhaseBanner: 常に最上部に固定 */}
      <PhaseBanner
        sessionState="running"
        mode="sequential"
        currentSample={{ id: "xxx", label: "A" }}
      />
      
      {/* NextActionCard: PhaseBannerの下 */}
      <div className="container mx-auto px-4 py-4">
        <NextActionCard
          title="回答を入力してください"
          description="現在のSample Aについて、推測とフレーバーを入力してください。"
          primaryAction={{
            label: "回答入力へ",
            onClick: () => router.push(`/session/${joinToken}/round/${sampleId}`)
          }}
          note="回答は後で編集できます"
        />
        
        {/* メインコンテンツ */}
        <div className="mt-6">
          {/* 画面固有のコンテンツ */}
        </div>
        
        {/* ParticipantProgress: 該当する場合のみ */}
        <div className="mt-6">
          <ParticipantProgress
            participants={participants}
          />
        </div>
      </div>
    </div>
  );
}
```

### 2.3 固定フッター（該当画面のみ）

**使用画面:**
- 回答入力画面（「編集中で保存」「回答済み」ボタン）
- Presenterパネル（「Round終了」ボタン）

**実装例:**
```typescript
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
  <div className="container mx-auto flex gap-4">
    <Button variant="secondary" onClick={handleSaveDraft}>
      編集中で保存
    </Button>
    <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
      回答済み
    </Button>
  </div>
</div>
```

**注意:**
- 固定フッターがある場合は、メインコンテンツの下部に`pb-20`（padding-bottom）を追加してスクロール可能にする

---

## 3. モバイルUIの具体ルール

### 3.1 画面サイズとブレークポイント

**基準:**
- **モバイル:** 320px〜（iPhone SE相当）
- **タブレット:** 768px〜（iPad相当）
- **デスクトップ:** 1024px〜（MVPでは最小限）

**Tailwind CSSブレークポイント:**
```typescript
// モバイルファースト（デフォルト: モバイル）
className="..."                    // モバイル（320px〜）
className="sm:..."                 // 640px〜
className="md:..."                 // 768px〜（タブレット）
className="lg:..."                 // 1024px〜（デスクトップ、MVPでは使用しない）
```

### 3.2 タップ領域の最小サイズ

**必須ルール:**
- **ボタン:** 44x44px以上（Apple HIG推奨）
- **リンク:** 44x44px以上
- **入力フィールド:** 高さ44px以上
- **チェックボックス/ラジオボタン:** 44x44px以上のタップ領域

**実装例:**
```typescript
// ボタン（Tailwind CSS）
<Button className="min-h-[44px] min-w-[44px] px-6 py-3">
  ボタン
</Button>

// リンク
<a className="block min-h-[44px] py-2 px-4">
  リンク
</a>

// 入力フィールド
<Input className="h-[44px] px-4" />
```

### 3.3 余白とスペーシング

**ルール:**
- ボタン間の余白: 8px以上（`gap-2`以上）
- セクション間の余白: 16px以上（`mt-4`以上）
- カード内のパディング: 16px以上（`p-4`以上）

**実装例:**
```typescript
// ボタングループ
<div className="flex gap-2">
  <Button>ボタン1</Button>
  <Button>ボタン2</Button>
</div>

// セクション間
<div className="mt-4">
  <Section />
</div>

// カード
<div className="bg-white rounded-lg p-4 shadow">
  <Content />
</div>
```

### 3.4 スクロールルール

**原則:**
- 1画面に1つの主要アクション
- スクロールを最小限に（重要情報は上部に配置）
- 無限スクロールは使用しない
- 横スクロールは避ける（テーブルは折り返し）

**実装例:**
```typescript
// メインコンテンツ（スクロール可能）
<div className="min-h-screen overflow-y-auto pb-20">
  {/* コンテンツ */}
</div>

// テーブル（横スクロール回避）
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* テーブル内容 */}
  </table>
</div>
```

### 3.5 固定ヘッダー・フッター

**PhaseBanner（固定ヘッダー）:**
```typescript
<div className="fixed top-0 left-0 right-0 z-50">
  <PhaseBanner {...props} />
</div>

// メインコンテンツに上部マージンを追加
<div className="pt-16">
  {/* コンテンツ */}
</div>
```

**固定フッター（該当画面のみ）:**
```typescript
<div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t">
  {/* フッターコンテンツ */}
</div>

// メインコンテンツに下部パディングを追加
<div className="pb-20">
  {/* コンテンツ */}
</div>
```

### 3.6 フォントサイズ

**推奨サイズ:**
- **見出し（h1）:** 24px（モバイル）、28px（タブレット）
- **見出し（h2）:** 20px（モバイル）、24px（タブレット）
- **本文:** 16px（モバイル）、18px（タブレット）
- **キャプション:** 14px

**Tailwind CSS:**
```typescript
<h1 className="text-2xl md:text-3xl">見出し1</h1>
<h2 className="text-xl md:text-2xl">見出し2</h2>
<p className="text-base md:text-lg">本文</p>
<span className="text-sm">キャプション</span>
```

---

## 4. 共通コンポーネント仕様

### 4.1 PhaseBanner

**目的:** 現在のSession状態と現在のRoundを表示する

**表示内容:**
- Session状態（registering / ordering / running / aggregating / published）
- 回答モード（逐次 / 一斉）
- 現在のRound（Sample）情報（running時のみ）

**実装例:**
```typescript
// components/common/PhaseBanner.tsx
"use client";

interface PhaseBannerProps {
  sessionState: 'registering' | 'ordering' | 'running' | 'aggregating' | 'published';
  mode: 'sequential' | 'simultaneous';
  currentSample?: { id: string; label: string };
}

export function PhaseBanner({ sessionState, mode, currentSample }: PhaseBannerProps) {
  const stateConfig = {
    registering: { text: '参加登録中', bgColor: 'bg-blue-500', textColor: 'text-white' },
    ordering: { text: '順番決め中', bgColor: 'bg-yellow-500', textColor: 'text-black' },
    running: { text: '進行中', bgColor: 'bg-green-500', textColor: 'text-white' },
    aggregating: { text: '集計中', bgColor: 'bg-orange-500', textColor: 'text-white' },
    published: { text: '結果公開済み', bgColor: 'bg-purple-500', textColor: 'text-white' },
  };

  const config = stateConfig[sessionState];
  const modeText = mode === 'sequential' ? '逐次' : '一斉';
  const sampleText = currentSample ? ` - Sample ${currentSample.label}` : '';

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${config.bgColor} ${config.textColor} py-3 px-4`}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold">{config.text}{sampleText}</span>
            <span className="ml-2 text-sm">({modeText}モード)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**状態別表示:**

| 状態 | 表示テキスト | 背景色 | テキスト色 |
|------|------------|--------|-----------|
| registering | 「参加登録中」 | `bg-blue-500` | `text-white` |
| ordering | 「順番決め中」 | `bg-yellow-500` | `text-black` |
| running | 「進行中 - Sample A」 | `bg-green-500` | `text-white` |
| aggregating | 「集計中」 | `bg-orange-500` | `text-white` |
| published | 「結果公開済み」 | `bg-purple-500` | `text-white` |

---

### 4.2 NextActionCard

**目的:** 今やること・次に押すべきボタンを明確に表示する

**実装例:**
```typescript
// components/common/NextActionCard.tsx
"use client";

interface NextActionCardProps {
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
  };
  note?: string;
}

export function NextActionCard({ title, description, primaryAction, note }: NextActionCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {primaryAction && (
        <div>
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="w-full min-h-[44px]"
          >
            {primaryAction.disabled && primaryAction.disabledReason
              ? primaryAction.disabledReason
              : primaryAction.label}
          </Button>
        </div>
      )}
      {note && <p className="text-sm text-gray-500 mt-2">{note}</p>}
    </div>
  );
}
```

**使用例:**
```typescript
<NextActionCard
  title="回答を入力してください"
  description="現在のSample Aについて、推測とフレーバーを入力してください。"
  primaryAction={{
    label: "回答入力へ",
    onClick: () => router.push(`/session/${joinToken}/round/${sampleId}`),
    disabled: false
  }}
  note="回答は後で編集できます"
/>
```

---

### 4.3 ParticipantProgress

**目的:** 参加者全員の進捗状況を可視化する

**実装例:**
```typescript
// components/common/ParticipantProgress.tsx
"use client";

interface ParticipantProgressProps {
  participants: Array<{
    id: string;
    display_name: string;
    status: 'draft' | 'submitted' | 'graded';
  }>;
}

export function ParticipantProgress({ participants }: ParticipantProgressProps) {
  const statusConfig = {
    draft: { text: '編集中', color: 'bg-gray-400', textColor: 'text-white' },
    submitted: { text: '提出済', color: 'bg-blue-500', textColor: 'text-white' },
    graded: { text: '採点済', color: 'bg-green-500', textColor: 'text-white' },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-3">参加者進捗</h3>
      <div className="space-y-2">
        {participants.map((participant) => {
          const config = statusConfig[participant.status];
          return (
            <div key={participant.id} className="flex items-center justify-between">
              <span>{participant.display_name}</span>
              <span className={`px-2 py-1 rounded text-sm ${config.color} ${config.textColor}`}>
                {config.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### 4.4 Stepper

**目的:** Sessionの進行状況を簡略表示する

**実装例:**
```typescript
// components/common/Stepper.tsx
"use client";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div
            key={index}
            className={`flex items-center px-3 py-1 rounded ${
              isCurrent
                ? 'bg-blue-500 text-white'
                : isCompleted
                ? 'bg-gray-300 text-gray-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isCompleted && <span className="mr-1">✓</span>}
            {step}
          </div>
        );
      })}
    </div>
  );
}
```

---

### 4.5 Toast通知

**目的:** 操作の成功/失敗を通知する

**実装例（react-hot-toast使用想定）:**
```typescript
import toast from 'react-hot-toast';

// 成功
toast.success('回答を保存しました', {
  duration: 3000,
  position: 'bottom-center',
  style: {
    backgroundColor: '#10b981',
    color: '#fff',
    minHeight: '44px',
    padding: '12px 16px',
  },
});

// 失敗
toast.error('保存に失敗しました', {
  duration: 5000,
  position: 'bottom-center',
  style: {
    backgroundColor: '#ef4444',
    color: '#fff',
    minHeight: '44px',
    padding: '12px 16px',
  },
});
```

---

## 5. ボタンのdisabledルール

### 5.1 Primaryボタン

**原則:**
- 1画面に1つだけ
- 常に有効（状態が不正な場合は画面を表示しない）

**Disabled条件:**
- 必須入力が未入力
- Session/Round状態が不正
- 権限がない（この場合は画面自体を表示しない）

**Disabled時の表示:**
```typescript
<Button
  disabled={!canSubmit}
  onClick={handleSubmit}
  className="min-h-[44px] w-full"
>
  {canSubmit ? (
    '回答済み'
  ) : (
    <span className="text-gray-500">必須項目を入力してください</span>
  )}
</Button>
```

**実装例:**
```typescript
const canSubmit = 
  guessedCask && 
  guessedRegion && 
  guessedAge && 
  guessedAbv && 
  guessedDistillery;

<Button
  variant="primary"
  disabled={!canSubmit}
  onClick={handleSubmit}
>
  {canSubmit ? '回答済み' : '必須項目を入力してください'}
</Button>
```

### 5.2 Secondaryボタン

**原則:**
- Primaryボタン以外の操作ボタン
- 複数あってもよい

**Disabled条件:**
- 状態が不正
- 権限がない

**Disabled時の表示:**
```typescript
<Button
  variant="secondary"
  disabled={!canEdit}
  onClick={handleEdit}
>
  {canEdit ? '編集' : '進行中のRoundは変更できません'}
</Button>
```

### 5.3 ボタンスタイル（Tailwind CSS）

**Primary:**
```typescript
className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium min-h-[44px] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
```

**Secondary:**
```typescript
className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium min-h-[44px] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
```

---

## 6. 状態ごとの画面表示差分

### 6.1 Ownerダッシュボード

#### registering状態

**表示内容:**
- PhaseBanner: 「参加登録中」
- NextActionCard: 「参加締切」ボタン（Primary）
- 参加者一覧（表示名、持ち込み本数、登録状態）
- 注意書き: 「締切後に参加登録の自由編集ができなくなります」

**実装例:**
```typescript
{sessionState === 'registering' && (
  <>
    <NextActionCard
      title="参加登録を完了してください"
      description="全員が登録完了したら、参加締切を実行してください。"
      primaryAction={{
        label: "参加締切",
        onClick: handleCloseRegistration,
        disabled: participants.length === 0,
        disabledReason: "参加者が0人です"
      }}
      note="締切後に参加登録の自由編集ができなくなります"
    />
    <ParticipantList participants={participants} />
  </>
)}
```

#### ordering状態

**表示内容:**
- PhaseBanner: 「順番決め中」
- NextActionCard: 「開始」ボタン（Primary）
- Sample一覧（ドラッグ&ドロップで並び替え可能）
- 各SampleにPresenter（持ち込み主）が表示
- 注意書き: 「開始後はフレーバーチャートが固定されます」

**実装例:**
```typescript
{sessionState === 'ordering' && (
  <>
    <NextActionCard
      title="順番を決めて開始してください"
      description="Sampleの順番をドラッグ&ドロップで並び替えてください。"
      primaryAction={{
        label: "開始",
        onClick: handleStartSession,
        disabled: samples.length === 0,
        disabledReason: "Sampleが0個です"
      }}
      note="開始後はフレーバーチャートが固定されます"
    />
    <SampleList samples={samples} onReorder={handleReorder} />
  </>
)}
```

#### running状態

**表示内容:**
- PhaseBanner: 「進行中 - Sample A」
- NextActionCard: なし（または「現在のRound進行中」）
- 現在のSample表示
- 参加者進捗（参考表示、編集中/提出済/採点済）
- 次以降の順番変更/追加（Secondaryボタン）
- 注意書き: 「進行中のRoundは変更できません」

**実装例:**
```typescript
{sessionState === 'running' && (
  <>
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-2">現在のSample: {currentSample.label}</h3>
      <p className="text-gray-600">Round状態: {roundState}</p>
    </div>
    <ParticipantProgress participants={participants} />
    <Button
      variant="secondary"
      disabled={roundState !== 'pending'}
      onClick={handleChangeOrder}
    >
      {roundState !== 'pending' ? '進行中のRoundは変更できません' : '順番変更'}
    </Button>
  </>
)}
```

#### aggregating状態

**表示内容:**
- PhaseBanner: 「集計中」
- NextActionCard: 「集計実行」ボタン（Primary）
- 集計結果のプレビュー（任意）

**実装例:**
```typescript
{sessionState === 'aggregating' && (
  <>
    <NextActionCard
      title="集計を実行してください"
      description="全Roundの結果を集計します。"
      primaryAction={{
        label: "集計実行",
        onClick: handleFinalize,
        disabled: !allRoundsComplete,
        disabledReason: "全Roundが完了していません"
      }}
    />
  </>
)}
```

#### published状態

**表示内容:**
- PhaseBanner: 「結果公開済み」
- NextActionCard: 「CSV出力」ボタン（Primary）
- 結果ページへのリンク

**実装例:**
```typescript
{sessionState === 'published' && (
  <>
    <NextActionCard
      title="結果を確認してください"
      description="結果ページで詳細を確認できます。"
      primaryAction={{
        label: "CSV出力",
        onClick: handleExportCSV
      }}
    />
    <Link href={`/session/${joinToken}/results`}>
      結果ページを見る
    </Link>
  </>
)}
```

### 6.2 Session Home（参加者）

#### running状態（answering）

**表示内容:**
- PhaseBanner: 「進行中 - Sample A」
- NextActionCard: 「回答入力へ」ボタン（Primary）
- 提出状況（全員の状態が見える）

**実装例:**
```typescript
{sessionState === 'running' && roundState === 'answering' && (
  <>
    <NextActionCard
      title="回答を入力してください"
      description={`現在のSample ${currentSample.label}について、推測とフレーバーを入力してください。`}
      primaryAction={{
        label: "回答入力へ",
        onClick: () => router.push(`/session/${joinToken}/round/${currentSample.id}`)
      }}
      note="回答は後で編集できます"
    />
    <ParticipantProgress participants={participants} />
  </>
)}
```

#### running状態（pending）

**表示内容:**
- PhaseBanner: 「進行中 - Sample A」
- NextActionCard: 「待機中」表示（ボタンなし）
- 提出状況

**実装例:**
```typescript
{sessionState === 'running' && roundState === 'pending' && (
  <>
    <NextActionCard
      title="待機中"
      description="PresenterがRoundを開始するまでお待ちください。"
    />
    <ParticipantProgress participants={participants} />
  </>
)}
```

#### published状態

**表示内容:**
- PhaseBanner: 「結果公開済み」
- NextActionCard: 「結果を見る」ボタン（Primary）
- 結果リンク

**実装例:**
```typescript
{sessionState === 'published' && (
  <>
    <NextActionCard
      title="結果を確認してください"
      description="結果ページで詳細を確認できます。"
      primaryAction={{
        label: "結果を見る",
        onClick: () => router.push(`/session/${joinToken}/results`)
      }}
    />
  </>
)}
```

---

## 7. エラー表示・保存成功・再試行のUXルール

### 7.1 エラー表示ルール

**原則:**
- エラーは「止める」より「回避する」方向
- 再試行/保存/差し戻しができるようにする

**表示方法:**

**1. Toast通知（一時的なエラー）:**
```typescript
try {
  await fetch('/api/answers/upsert', { ... });
  toast.success('保存しました');
} catch (error) {
  toast.error('保存に失敗しました。もう一度お試しください。');
}
```

**2. インラインエラー（フォーム入力エラー）:**
```typescript
<div>
  <Label htmlFor="display_name">
    表示名 <span className="text-red-500">*</span>
  </Label>
  <Input
    id="display_name"
    value={displayName}
    onChange={(e) => setDisplayName(e.target.value)}
    className={error ? "border-red-500" : ""}
  />
  {error && (
    <p className="text-red-500 text-sm mt-1">{error}</p>
  )}
</div>
```

**3. エラーページ（重大なエラー）:**
```typescript
if (error.code === 'SESSION_NOT_FOUND') {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Sessionが見つかりません</h1>
      <p className="text-gray-600 mb-4">
        参加URLが正しくないか、Sessionが削除された可能性があります。
      </p>
      <Button onClick={() => router.push('/')}>
        トップページに戻る
      </Button>
    </div>
  );
}
```

### 7.2 保存成功の表示

**ルール:**
- Toast通知で成功を表示（3秒後自動で消える）
- 必要に応じて画面遷移

**実装例:**
```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/answers/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ... })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    toast.success('回答を保存しました');
    
    // 画面遷移（必要に応じて）
    router.push(`/session/${joinToken}`);
  } catch (error) {
    toast.error(`保存に失敗しました: ${error.message}`);
  }
};
```

### 7.3 再試行のUXルール

**ルール:**
- ネットワークエラー時は自動再試行（最大3回）
- ユーザーに再試行ボタンを表示

**実装例:**
```typescript
const [retryCount, setRetryCount] = useState(0);
const [isRetrying, setIsRetrying] = useState(false);

const handleSubmitWithRetry = async () => {
  setIsRetrying(true);
  
  try {
    const response = await fetch('/api/answers/upsert', { ... });
    
    if (!response.ok) {
      throw new Error('Network error');
    }
    
    toast.success('保存しました');
    setRetryCount(0);
  } catch (error) {
    if (retryCount < 3) {
      setRetryCount(retryCount + 1);
      setTimeout(() => handleSubmitWithRetry(), 1000 * retryCount);
    } else {
      toast.error('保存に失敗しました。もう一度お試しください。', {
        action: {
          label: '再試行',
          onClick: () => {
            setRetryCount(0);
            handleSubmitWithRetry();
          }
        }
      });
    }
  } finally {
    setIsRetrying(false);
  }
};
```

### 7.4 エラーメッセージの形式

**良い例:**
```
✅ 「ネットワークエラーです。もう一度お試しください。」
✅ 「参加トークンが無効です。参加登録からやり直してください。」
✅ 「必須項目を入力してください: 表示名、持ち込み本数」
```

**悪い例:**
```
❌ 「エラーが発生しました」
❌ 「保存に失敗しました」（理由が不明）
❌ 「400 Bad Request」（技術的なメッセージ）
```

### 7.5 ローディング状態の表示

**ルール:**
- API呼び出し中はローディング表示
- ボタンはdisabledにして連打を防ぐ

**実装例:**
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  
  try {
    await fetch('/api/answers/upsert', { ... });
    toast.success('保存しました');
  } catch (error) {
    toast.error('保存に失敗しました');
  } finally {
    setIsLoading(false);
  }
};

<Button
  onClick={handleSubmit}
  disabled={isLoading || !canSubmit}
>
  {isLoading ? '保存中...' : '回答済み'}
</Button>
```

---

**このUI/UXルールに従って実装することで、飲み会で迷わず使える「デジタル司会者」が完成します。**
