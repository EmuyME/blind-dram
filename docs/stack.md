# Blind Dram – 技術スタック（MVP決め打ち版）

このドキュメントは、実装のブレを防ぎ、Cursor が一貫した判断で開発できるようにするための「決め打ち」スタック定義である。  
**MVP（飲み会1回が成立）を最優先とする。**

---

## 1. 目的（MVP）

- 参加URLからスマホで参加できる（アカウント不要）
- イベント作成 → 参加登録 → 順番決め → 回答 → 出題者採点 → 結果閲覧 → CSV出力
- 状態（Session / Round）で進行が迷わない UI
- 多少の押し間違い・訂正を許して進行が止まらない
- **「デジタル司会者」として飲み会のテンポを壊さない**

---

## 2. 採用スタック（決め打ち）

### 2.1 フロントエンド / フレームワーク

**技術:**
- **Next.js 14+（App Router）**
- **TypeScript 5+**
- **React 18+**

**方針:**
- **画面は基本 Client Component**（localStorageやリアルタイム状態表示のため）
- DB操作は **Route Handler（app/api/**/route.ts）** 経由で行う（MVPは Server Actions を使わない）
- Server Component は静的ページや初期データ取得のみに使用

**推奨パッケージ:**
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "typescript": "^5.0.0"
}
```

### 2.2 UI ライブラリ

**技術:**
- **Tailwind CSS 3+**
- **shadcn/ui**（Button / Card / Tabs / Badge / Dialog / Toast / Select 等）
- **Chart.js** または **recharts**（レーダーチャート用）

**方針:**
- モバイルファースト（`sm:` ブレークポイントから拡張）
- 「今の状態（Phase）」と「次に押すべきボタン（Next Action）」が常に目立つ構成
- ボタンは Primary を常に1つ、他は Secondary / Disabled（理由を添える）
- タップ領域は最低 44x44px（モバイル対応）

**推奨パッケージ:**
```json
{
  "tailwindcss": "^3.4.0",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "@radix-ui/react-dialog": "^1.0.0",
  "@radix-ui/react-select": "^2.0.0"
}
```

### 2.3 データベース / BaaS

**技術:**
- **Supabase（PostgreSQL 15+）**

**方針:**
- 状態（Session / Round）をDBに保持する（state-driven）
- フレーバーチャートは **セッション開始時に snapshot を sessions に保存**して固定する
- MVPでは RLS は **無効または最小**（後で強化）。まず動くこと優先
- マイグレーションは Supabase Dashboard の SQL Editor で実行

**環境変数:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # サーバー側のみ、環境変数に保存
```

**推奨パッケージ:**
```json
{
  "@supabase/supabase-js": "^2.38.0"
}
```

### 2.4 認証（アカウント不要の簡易方式）

**方針:**
- **参加者:** `participant_token` を localStorage に保存して認証に使う
- **オーナー:** `owner_token` を URL に含める（`/o/[ownerToken]`）
- 「招待リンク＋ワンタイム表示名入力」で参加できる
- 本格的なユーザーアカウント（Supabase Auth）はMVPでは導入しない

**localStorageキー規約（決め打ち）:**
```typescript
// 参加者トークン保存
const STORAGE_KEY = `bd:participant_token:${joinToken}`;
localStorage.setItem(STORAGE_KEY, participantToken);

// トークン取得
const token = localStorage.getItem(STORAGE_KEY);
```

**トークン生成:**
- `participant_token`: UUID v4（32文字）
- `owner_token`: UUID v4（32文字）
- `join_token`: UUID v4（32文字）

---

## 3. 実装アーキテクチャ（MVP）

### 3.1 APIの方針

**統一ルール:**
- すべて `app/api/**/route.ts` に統一
- JSONのみを返す（HTMLが返る経路を作らない）
- エラーレスポンスも JSON 統一：
  ```typescript
  { "error": "message", "code": "SOME_CODE" }
  ```

**HTTPメソッド:**
- GET: データ取得
- POST: データ作成・更新・状態変更
- PUT/PATCH: 使用しない（POSTで統一）

**注意（過去に踏んだ地雷回避）:**
- `fetch(...).json()` の前に `res.ok` を確認し、失敗時は `res.text()` をログに出す
- パス名（session / sessions）を途中で変えない
- CORS設定は不要（同一オリジン）

### 3.2 ディレクトリ規約（決め打ち）

**UIルート（App Router）:**
```
app/
  create/                    # イベント作成
    page.tsx
  o/[ownerToken]/           # Owner ダッシュボード
    page.tsx
  s/[joinToken]/            # 参加登録
    page.tsx
  session/[joinToken]/      # 参加者ホーム
    page.tsx
    round/[sampleId]/       # 回答入力
      page.tsx
    presenter/[sampleId]/   # Presenter パネル
      page.tsx
    results/                # 結果
      page.tsx
```

**APIルート:**
```
app/api/
  session/
    create/route.ts
    get/route.ts
  participants/
    join/route.ts
    me/route.ts
  owner/
    close-registration/route.ts
    set-order/route.ts
    start-session/route.ts
    finalize/route.ts
    publish/route.ts
  round/
    start/route.ts
    status/route.ts
    finish/route.ts
  answers/
    upsert/route.ts
  truths/
    upsert/route.ts
  distillery/
    grade/route.ts
    reject-submission/route.ts
  results/
    get/route.ts
  export/
    csv/route.ts
```

**共通コンポーネント:**
```
components/
  ui/                      # shadcn/ui
  common/
    PhaseBanner.tsx
    NextActionCard.tsx
    ParticipantProgress.tsx
    Stepper.tsx
    Toast.tsx
```

---

## 4. データ設計の決め（MVP）

### 4.1 状態管理

- Session/ Round の **stateをDBに持つ**（state-driven）
- フロントエンドの状態は最小限（サーバー状態を信頼）
- リアルタイム更新は後回し（ポーリングまたは手動リロード）

### 4.2 集計方針

- 集計は原則オンデマンドで計算（MVP）
- ただし公開（publish）時にスナップショット保存できる余地を残す
- `aggregates` テーブルに保存（将来の拡張用）

### 4.3 フレーバーチャート

- フレーバーチャートは `sessions.flavor_chart_snapshot (jsonb)` に保存し、結果表示は必ずそれを参照
- セッション開始時（`ordering` → `running`）にスナップショット保存
- 後でフレーバーチャートを編集しても過去セッションの表示は崩れない

---

## 5. 開発ルール（Next.js/App Router地雷回避）

### 5.1 localStorage / useParams

**ルール:**
- `localStorage` は **Client Component** でのみ参照
- `useParams()` / `useSearchParams()` を使う画面は `"use client"` を付ける
- SSRとHydration差異を避けるため、必要ならマウント後に描画する

**推奨パターン:**
```typescript
"use client";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null; // またはローディング表示
  
  // localStorage読み取り
  const token = localStorage.getItem(STORAGE_KEY);
  // ...
}
```

### 5.2 Hook順序のルール

- 条件分岐の前に Hook を置かない（hook orderが崩れる）
- `if (!mounted) return null;` を書く場合は、Hook宣言をその前に置かない

**NG例:**
```typescript
if (!mounted) {
  const [state, setState] = useState(); // ❌ Hookが条件分岐の後
  return null;
}
```

**OK例:**
```typescript
const [mounted, setMounted] = useState(false);
const [state, setState] = useState(); // ✅ Hookは条件分岐の前

if (!mounted) return null;
```

### 5.3 エラーハンドリング

**API呼び出し:**
```typescript
try {
  const res = await fetch('/api/xxx');
  if (!res.ok) {
    const text = await res.text();
    console.error('API Error:', text);
    throw new Error('API call failed');
  }
  const data = await res.json();
  // ...
} catch (error) {
  // エラー処理
}
```

---

## 6. デプロイ（MVP）

### 6.1 デプロイ先

**推奨:**
- **Vercel**（Next.js App Router に最適化）
- 無料プランで十分（MVP）

**代替:**
- Netlify
- Railway
- 自前サーバー（後回し）

### 6.2 環境変数設定

**Vercel環境変数:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # サーバー側のみ
```

**ローカル開発:**
- `.env.local` ファイルに設定
- `.env.local` は `.gitignore` に追加

**`.env.local` の設定例:**
```env
# Supabase URL（プロジェクトのURL）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key（公開用キー）
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role Key（サーバー側のみ、機密情報）
# 注意: このキーはサーバー側でのみ使用し、クライアントに公開しないでください
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**取得方法:**
1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. Settings → API から以下を取得:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role secret key → `SUPABASE_SERVICE_ROLE_KEY`

### 6.3 MVPでのデプロイ方針

**優先順位:**
1. ローカルで `npm run dev` が回る
2. 複数端末（スマホ/PC）から同じセッションに参加できる
3. デプロイは後回しでも可（まず動くことを優先）

**デプロイチェックリスト:**
- [ ] 環境変数が正しく設定されている
- [ ] Supabase接続が動作している
- [ ] モバイル実機で動作確認
- [ ] エラーログが確認できる

---

## 7. 実装の優先順位（MVP）

1. Supabase テーブル作成（SQL）
2. Session作成/参加登録 API
3. Ownerの順番決め/開始
4. Round回答（draft/submitted）
5. Presenter truth入力 + 蒸留所採点
6. 結果（表＋レーダー＋その他一覧）
7. CSV出力

---

## 8. "後回し"にするもの（MVP外）

- Supabase Auth（アカウント制）
- RLSの完全設計（後で強化）
- リアルタイム購読（Supabase Realtime）※まずはポーリングで十分
- PDF生成・賞状生成（設計だけ残して後で）
- WebSocket / Server-Sent Events
- 多言語対応
- ダークモード
- アニメーション・トランジション（最小限のみ）

---

## 9. 参考：Cursorへの指示方針

Cursor には常に以下を前提として指示する：

- 「MVP優先」
- 「state-driven」
- 「飲み会のテンポ最優先」
- 「Route Handler中心」
- 「Supabase（Postgres）」
- 「モバイルファースト」

**例:**
- 「このstack.mdに従って、APIはapp/apiに統一して実装して」
- 「localStorageトークン方式を崩さないで」
- 「hook orderとSSR差異に注意して」
- 「モバイルで快適に使えるUIにして」