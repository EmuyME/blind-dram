# BlindDram Apple 風デザインルール（Whisky Bar × Apple HIG）

## 1. 基本理念

BlindDram は、Apple Human Interface Guidelines の「Clarity / Depth / Deference」をベースに、**飲み会のブラインドテイスティング**という特殊環境（暗い・酔う・複数人・一瞬で判断）に最適化した UI を提供します。
“**Serious Whisky, Playful Experience**” をコンセプトに、**高級感（バーの空気）**と**遊びやすさ（パーティーゲーム）**を両立します。

---

## 2. 配色システム

### プライマリカラー（Whisky Amber）

```
- Whisky Amber（プライマリ）: custom (#C88A2B) - 主要アクション（Guess / Reveal / 決定）
- Amber Hover: custom (#D79A3D) - ホバー、強調
- Amber Pressed: custom (#B97B1F) - 押下（active）状態
- Amber Glow（装飾最小）: custom (rgba(200,138,43,0.25)) - 成功演出・軽い発光（多用禁止）
```

### ベース（ダーク UI / Bar Theme）

```
- Background（最背面）: neutral-900 (#171717 目安) - 画面背景（常にダーク）
- Surface（カード/パネル）: neutral-800 (#262626 目安) - カード背景
- Surface Elevated: neutral-700 (#404040 目安) - ドロップダウン・モーダル内面
- Border/Subtle: white/10 (rgba(255,255,255,0.10)) - 境界線（薄く、必須）
- Divider: white/5 (rgba(255,255,255,0.05)) - 区切り（さらに薄く）
```

### テキスト（高コントラスト維持）

```
- Text Primary: stone-100 (#F5F5F4 目安) - 本文、主要情報
- Text Secondary: stone-400 (#A8A29E 目安) - 補助情報、説明
- Text Muted: stone-500 (#78716C 目安) - 非重要、注釈（使用は最小）
- On Primary（Amber上）: black/90 (rgba(0,0,0,0.90)) - Amberボタン上の文字色
```

### システムカラー（結果表示専用）

```
- Success: emerald-400 (#34D399 目安) - 正解、成功（結果表示専用）
- Error: red-400 (#F87171 目安) - 不正解、危険（結果表示専用）
- Warning（必要時のみ）: amber-300 (#FCD34D 目安) - 注意（Amberと混同するので最小限）
- Info: sky-400 (#38BDF8 目安) - 情報（必要時のみ）
```

### Tailwind 実装の基本（色）

```
- 背景: bg-neutral-900
- サーフェス: bg-neutral-800
- 境界: border border-white/10
- 主要テキスト: text-stone-100
- 補助テキスト: text-stone-400
- プライマリ: bg-[color:#C88A2B]
- プライマリhover: hover:bg-[color:#D79A3D]
- プライマリactive: active:bg-[color:#B97B1F]
```

### カラー使用ルール

```
- 画面背景は常にダーク（bg-neutral-900）を基本。ライトテーマは作らない。
- アクセント（目立つ色）は原則 Amber のみ。緑/赤は「結果」専用。
- 色だけで状態を伝えない（必ずアイコン/テキスト/形状も併用）。
- 境界線は white/10 を基本にし、情報量が多い箇所のみ white/15 まで許可。
- コントラストを損なう薄色テキスト（stone-500以下）の多用禁止。
```

---

## 3. タイポグラフィ

### フォント

```
- 基本: system-ui（iOS/macOS の SF Pro 相当）
- Tailwind: font-sans（デフォルトスタックに -apple-system を含める）
```

### フォントウェイト

```
- 大見出し: font-semibold
- 見出し: font-medium / font-semibold
- 本文: font-normal
- ボタン: font-medium（酔っても読める太さ）
- キャプション: font-normal（軽すぎる font-light は禁止）
```

### フォントサイズ階層（推奨）

```
- Page Title: text-3xl font-semibold tracking-tight leading-tight
- Section Title: text-xl font-medium leading-snug
- Card Title: text-lg font-medium
- Body: text-base leading-relaxed
- Caption: text-sm text-stone-400 leading-normal
- Small Caption: text-xs text-stone-400（多用禁止）
```

### 文字間隔・行間

```
- 見出し: tracking-tight（Appleっぽい締まり）
- 本文: leading-relaxed
- 長文: leading-loose（必要時のみ）
```

---

## 4. 余白・間隔（8pt Grid）

### 基本単位（8px ベース）

```
- 2px: p-0.5（微調整のみ）
- 4px: p-1（微調整のみ）
- 8px: p-2 / gap-2（最小）
- 16px: p-4 / gap-4（標準）
- 24px: p-6 / gap-6（セクション）
- 32px: p-8 / gap-8（大セクション）
- 48px: p-12（ページ区切り）
```

### 画面パディング（推奨）

```
- ページ左右: px-4 sm:px-6
- ページ上下: py-6 sm:py-8
```

### セクション間隔

```
- 要素間: space-y-2（8px）
- コンポーネント間: space-y-4（16px）
- セクション内: space-y-6（24px）
- セクション間: space-y-8（32px）
```

### タッチターゲット（44px 確保）

```
- すべての押下要素に min-h-[44px] min-w-[44px]
- ボタン標準: px-6 py-3（高さ48px相当）
- アイコンボタン: p-3（48x48）
```

---

## 5. 角丸

### コンポーネント別設定（Apple寄せ：丸すぎない）

```
- 小ボタン/入力: rounded-lg
- 標準ボタン: rounded-xl
- カード: rounded-2xl
- モーダル: rounded-3xl
- チップ/ピル: rounded-full
```

### 角丸使用原則

```
- 同一画面内は 3 段階まで（lg / xl / 2xl を基本）
- 親（カード） > 子（ボタン）で角丸を小さくして階層を作る
- 角丸の一貫性が崩れる UI は即劣化するため禁止
```

---

## 6. 影の効果（Depth, not decoration）

### 影レベル（最大 3 段階）

```
- Subtle（非強調）: shadow-sm shadow-black/30
- Standard（カード）: shadow-xl shadow-black/40
- Modal（最前面）: shadow-2xl shadow-black/60
```

### 影の使用原則

```
- 押せる要素・浮いている要素のみ影を付ける（装飾での影は禁止）
- ホバー時は影を 1 段階だけ強化（やりすぎ禁止）
- 影と同時に border-white/10 を併用し、暗背景での輪郭を確保
```

---

## 7. コンポーネント設計

### 共通（状態とトランジション）

```
- 標準: transition-all duration-200 ease-in-out
- 色だけ: transition-colors duration-150 ease-in-out
- 押下: active:scale-[0.98]
- 無効: disabled:opacity-50 disabled:cursor-not-allowed
- フォーカス: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
```

### プライマリボタン（Guess / Reveal / 決定）

```
- 背景: bg-[color:#C88A2B]
- 文字: text-black/90
- 角丸: rounded-xl
- 余白: px-6 py-3
- 影: shadow-lg shadow-black/40
- ホバー: hover:bg-[color:#D79A3D]
- 押下: active:bg-[color:#B97B1F] active:scale-[0.98]
- フォーカス: focus-visible:ring-2 focus-visible:ring-[color:#C88A2B] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900
```

### セカンダリボタン（戻る / パス / 補助操作）

```
- 背景: bg-neutral-800
- 文字: text-stone-100
- 枠線: border border-white/10
- 角丸: rounded-xl
- 余白: px-6 py-3
- ホバー: hover:bg-neutral-700
- 押下: active:bg-neutral-800 active:scale-[0.98]
- フォーカス: focus-visible:ring-2 focus-visible:ring-white/25
```

### デンジャーボタン（リセット等：頻出させない）

```
- 背景: bg-red-500
- 文字: text-white
- 角丸: rounded-xl
- 余白: px-6 py-3
- ホバー: hover:bg-red-600
- フォーカス: focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900
```

### カード（基本コンテナ）

```
- 背景: bg-neutral-800
- 枠線: border border-white/10
- 角丸: rounded-2xl
- 内余白: p-4 sm:p-6
- 影: shadow-xl shadow-black/40
- タイトル: text-lg font-medium text-stone-100
- 本文: text-base text-stone-100/90
- 補助: text-sm text-stone-400
```

### 選択チップ（選択肢 / フィルタ）

```
- 背景: bg-neutral-700
- 文字: text-stone-200
- 角丸: rounded-full
- 余白: px-4 py-2
- ホバー: hover:bg-neutral-600
- 選択中: bg-[color:#C88A2B] text-black/90
- フォーカス: focus-visible:ring-2 focus-visible:ring-white/25
```

### 入力フィールド（必要時のみ：飲み会想定で最小化）

```
- 背景: bg-neutral-800
- 枠線: border border-white/10
- 文字: text-stone-100
- プレースホルダ: placeholder:text-stone-500
- 角丸: rounded-lg
- 高さ: h-12
- フォーカス: focus:border-white/20 focus:ring-2 focus:ring-white/20
- エラー: border-red-400/60 ring-2 ring-red-400/20
```

### 結果バッジ（正解/不正解）

```
- Success: bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 rounded-full px-3 py-1
- Error: bg-red-500/15 text-red-300 border border-red-400/30 rounded-full px-3 py-1
- 注意: 色だけに依存せず、必ず "Correct / Wrong" のテキストも併記
```

---

## 8. レイアウトシステム

### コンテナ

```
- 最大幅: max-w-xl（片手操作を優先） / max-w-2xl（一覧系）
- 中央寄せ: mx-auto
- 横幅: w-full
- 余白: px-4 sm:px-6
```

### グリッド/フレックス

```
- 基本: flex flex-col gap-4
- 2カラム（大画面のみ）: grid grid-cols-1 md:grid-cols-2 gap-4
- 行揃え: flex items-center justify-between
```

---

## 9. インタラクション

### ホバー/アクティブ（控えめに、気持ちよく）

```
- ボタン: hover で色を少し深く + shadow 強化（1段階のみ）
- カード: hover は原則なし（モバイル中心のため）。必要時のみ hover:shadow-2xl
- 押下: active:scale-[0.98]（わずか）
```

### トランジション

```
- 標準: transition-all duration-200 ease-in-out
- 色: transition-colors duration-150
- 変形: transition-transform duration-150
```

### モーション配慮

```
- motion-reduce:transition-none
- motion-reduce:transform-none
- 点滅・フラッシュは禁止
```

---

## 10. アクセシビリティ

### コントラスト（WCAG 2.1）

```
- 通常テキスト: 4.5:1 以上を満たす配色のみ
- 大きいテキスト: 3:1 以上
- ダーク UI では text-stone-100 / text-stone-400 を基本にして崩さない
```

### 色依存の禁止

```
- 正解/不正解は「色 + アイコン + 文言」で表現する
- 例: ✅ Correct / ❌ Wrong を必ず併記
```

### フォーカス可視化（キーボード操作）

```
- すべての操作要素に focus-visible:ring を設定
- リングは 3:1 相当の視認性（white/25 以上 or Amber ring）
```

### タッチターゲット（必須）

```
- すべてのボタン、アイコンボタン、チップは min-h-[44px] min-w-[44px]
```

### スクリーンリーダー（ARIA）

```
- アイコンボタン: aria-label 必須
- 状態変化（結果表示）: aria-live="polite" を検討
- フォーム: label と input の関連付け必須
```

---

## 11. レスポンシブデザイン

### ブレークポイント（Tailwind標準）

```
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
```

### レスポンシブ調整ルール

```
- 余白: p-4 sm:p-6
- 文字: text-base（基本固定。小さくしない）
- レイアウト: モバイルは 1 カラム固定。md 以上で 2 カラム検討
```

---

## 12. 実装チェックリスト

### 必須（アクセシビリティ）

* [ ] 通常テキスト 4.5:1 以上のコントラスト
* [ ] focus-visible のリングが全操作要素にある
* [ ] min-h-[44px] min-w-[44px] を満たす
* [ ] 色だけで状態を伝えていない（テキスト/アイコン併記）
* [ ] アイコンボタンに aria-label
* [ ] モーション抑制（motion-reduce）対応

### 必須（デザイン整合）

* [ ] 背景は常に bg-neutral-900（ライト化しない）
* [ ] アクセントは Amber に集約（緑/赤は結果専用）
* [ ] 角丸は lg / xl / 2xl / 3xl の範囲で統一
* [ ] 影は最大 3 段階（subtle / standard / modal）
* [ ] 余白は 8pt グリッド（p-2 / p-4 / p-6 / p-8）
* [ ] タイポ階層（タイトル/本文/キャプション）が崩れていない

### 推奨（UX向上）

* [ ] 押下フィードバック（active:scale-[0.98]）
* [ ] 成功時の軽い発光（Amber Glow）は最小限
* [ ] 誤操作を避けるため、危険操作は確認ダイアログを挟む
* [ ] 一画面の主要アクションは 1 つに絞る（Primaryは一つ）

---

## 13. 禁止事項

### 絶対に避けるべき要素

* [ ] 44px 未満のタップ領域
* [ ] 影なしの押下要素（押せることが伝わらない）
* [ ] 色だけで正誤や状態を表現
* [ ] 薄すぎるテキスト（stone-500以下）の多用
* [ ] 影の多用（4段階以上）や強すぎるグローの常用
* [ ] 点滅・フラッシュ・過剰アニメーション
* [ ] ダーク UI の中で唐突な白背景カード乱用（コントラストが崩れる）

### 制限的使用項目（目的が明確な場合のみ）

* [ ] Warning（yellow系）の多用（Amber と混同）
* [ ] Hover 前提の UI（モバイル中心なので）
* [ ] 入力フォームの増殖（飲み会では入力がUXを壊す）

---
