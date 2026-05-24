'use client';

import Link from 'next/link';

/** Concept 1 — テイスティングノート配色トークン */
const P = {
  bgGradient: 'linear-gradient(165deg, #2a1f18 0%, #1a1410 100%)',
  bg: '#2a1f18',
  bgDeep: '#1a1410',
  brand: '#c4a574',
  brandDim: 'rgba(196, 165, 116, 0.8)',
  text: '#f5ebe0',
  textMuted: '#a89070',
  textDim: '#8b7355',
  paperGradient: 'linear-gradient(180deg, #f4ead8 0%, #ebe0cc 100%)',
  paper: '#f4ead8',
  paperAlt: '#ebe0cc',
  ink: '#3d2e1f',
  inkMuted: '#5c4a32',
  inkDim: '#8b7355',
  paperBorder: '#c9b896',
  surface: 'rgba(61, 46, 31, 0.55)',
  surfaceBorder: 'rgba(201, 184, 150, 0.22)',
  rankMutedBg: 'rgba(244, 234, 216, 0.12)',
  rankMutedText: '#e8dcc8',
  phaseRunning: '#c4a574',
  phaseRegistering: '#9a8470',
  phasePublished: '#d4a853',
  serif: 'Georgia, "Times New Roman", serif',
} as const;

const TOKENS = [
  { name: 'Walnut BG', hex: '#1A1410', usage: 'ページ背景（深）' },
  { name: 'Walnut BG Mid', hex: '#2A1F18', usage: 'ページ背景（グラデーション上）' },
  { name: 'Parchment', hex: '#F4EAD8', usage: '紙カード・1位ハイライト' },
  { name: 'Parchment Alt', hex: '#EBE0CC', usage: '紙カードグラデーション下' },
  { name: 'Ink', hex: '#3D2E1F', usage: 'Primary ボタン・紙上テキスト' },
  { name: 'Ink Muted', hex: '#5C4A32', usage: '紙上の補足' },
  { name: 'Cream Text', hex: '#F5EBE0', usage: '暗背景の見出し' },
  { name: 'Gold Muted', hex: '#C4A574', usage: 'ブランド・フェーズ進行中' },
  { name: 'Sepia Muted', hex: '#A89070', usage: '暗背景の補足' },
  { name: 'Rule Line', hex: '#C9B896', usage: '紙上の区切り線' },
];

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs text-stone-500 tracking-wide">{label}</span>
      <div className="w-[320px] h-[640px] rounded-[2rem] border border-white/15 bg-black/40 p-2 shadow-2xl shadow-black/60">
        <div className="w-full h-full rounded-[1.6rem] overflow-hidden overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function PhaseStrip({ phase, mode }: { phase: string; mode: string }) {
  return (
    <div
      className="px-3 py-2 border-b flex items-center justify-between shrink-0"
      style={{
        borderColor: P.surfaceBorder,
        borderLeft: `4px solid ${P.phaseRunning}`,
        background: P.bgDeep,
      }}
    >
      <span className="text-xs font-semibold" style={{ color: P.text, fontFamily: P.serif }}>
        {phase}
      </span>
      <span
        className="text-[10px] px-2 py-0.5 rounded-full"
        style={{ background: `${P.phaseRunning}22`, color: P.text }}
      >
        {mode}
      </span>
    </div>
  );
}

function PaperPrimaryButton({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`py-4 rounded-2xl text-lg font-semibold w-full max-w-[260px] ${className}`}
      style={{ background: P.ink, color: P.paper, fontFamily: P.serif }}
    >
      {children}
    </button>
  );
}

function FocusAnswerMock() {
  return (
    <PhoneFrame label="次アクション — 回答者">
      <div className="min-h-full flex flex-col" style={{ background: P.bgGradient, fontFamily: P.serif }}>
        <PhaseStrip phase="進行中" mode="逐次モード" />
        <div className="px-4 py-3 border-b text-center" style={{ borderColor: P.surfaceBorder }}>
          <p className="text-xs" style={{ color: P.textDim }}>
            Sample B
          </p>
          <p className="text-sm" style={{ color: P.textMuted }}>
            第12回 ブラインド会
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <p className="text-sm mb-2" style={{ color: P.textDim }}>
            あなたの番です
          </p>
          <h2 className="text-2xl font-semibold text-center mb-2" style={{ color: P.text }}>
            回答を提出する
          </h2>
          <p className="text-sm text-center mb-10 leading-relaxed max-w-xs" style={{ color: P.textMuted }}>
            蒸溜所・年数・フレーバーを入力して提出してください
          </p>
          <PaperPrimaryButton>回答画面を開く</PaperPrimaryButton>
          <button type="button" className="mt-4 text-sm underline-offset-2 hover:underline" style={{ color: P.textDim }}>
            参加者一覧を見る
          </button>
          <p className="text-xs mt-4" style={{ color: P.textDim }}>
            回答は後で編集できます
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function FocusPresenterMock() {
  return (
    <PhoneFrame label="次アクション — Presenter">
      <div className="min-h-full flex flex-col" style={{ background: P.bgGradient, fontFamily: P.serif }}>
        <PhaseStrip phase="進行中" mode="逐次モード" />
        <div className="px-4 py-3 border-b text-center" style={{ borderColor: P.surfaceBorder }}>
          <p className="text-xs" style={{ color: P.textDim }}>
            Sample C · あなたが Presenter
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border"
            style={{ background: `${P.brand}18`, borderColor: `${P.brand}55` }}
          >
            <span className="text-2xl font-semibold" style={{ color: P.brand }}>
              P
            </span>
          </div>
          <h2 className="text-xl font-semibold text-center mb-8" style={{ color: P.text }}>
            Round を開始できます
          </h2>
          <PaperPrimaryButton>Presenter パネルを開く</PaperPrimaryButton>
        </div>
      </div>
    </PhoneFrame>
  );
}

function NametagRecoveryMock() {
  const participants = [
    { name: '田中 美咲', bottles: 2, initial: '田' },
    { name: '佐藤 健', bottles: 1, initial: '佐' },
    { name: '鈴木 大輔', bottles: 0, initial: '鈴' },
  ];

  return (
    <PhoneFrame label="名札ボード復帰">
      <div className="min-h-full px-4 py-6" style={{ background: P.bgGradient, fontFamily: P.serif }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: P.text }}>
          おかえりなさい
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: P.textMuted }}>
          以前登録した名前を選ぶと、続きから操作できます
        </p>
        <div className="space-y-3">
          {participants.map((p) => (
            <button
              key={p.name}
              type="button"
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors"
              style={{
                background: P.surface,
                border: `1px solid ${P.surfaceBorder}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold shrink-0 border"
                style={{
                  background: P.paperGradient,
                  borderColor: P.paperBorder,
                  color: P.ink,
                }}
              >
                {p.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: P.text }}>
                  {p.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: P.textDim }}>
                  {p.bottles > 0 ? `持ち込み ${p.bottles} 本` : '持ち込みなし'}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: P.textDim }}>
                選択 →
              </span>
            </button>
          ))}
        </div>
        <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${P.surfaceBorder}` }}>
          <p className="text-xs mb-2" style={{ color: P.textDim }}>
            オーナーの方
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value="/o/xxxxxxxx..."
              className="flex-1 px-3 py-2 rounded-lg text-xs min-h-[40px]"
              style={{
                background: P.surface,
                border: `1px solid ${P.surfaceBorder}`,
                color: P.textMuted,
              }}
            />
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs shrink-0"
              style={{ background: P.ink, color: P.paper }}
            >
              開く
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function SessionHomeMock() {
  return (
    <PhoneFrame label="セッションホーム（紙カード）">
      <div className="min-h-full px-4 py-6" style={{ background: P.bgGradient, fontFamily: P.serif }}>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: P.brandDim }}>
          Blind Dram
        </div>
        <h1 className="text-xl mb-1" style={{ color: P.text }}>
          第12回 ブラインド会
        </h1>
        <p className="text-sm mb-5" style={{ color: P.textMuted }}>
          Sample B · 進行中
        </p>
        <div
          className="rounded-lg p-4 mb-4"
          style={{
            background: P.paperGradient,
            color: P.ink,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          <div
            className="text-[11px] mb-2 border-b pb-2"
            style={{ color: P.inkDim, borderColor: P.paperBorder }}
          >
            あなたの役割
          </div>
          <p className="text-base font-semibold">回答者 — 田中</p>
          <p className="text-sm mt-2" style={{ color: P.inkMuted }}>
            Nose / Palate / Finish を入力してください
          </p>
          <button
            type="button"
            className="mt-4 w-full py-3 rounded-md text-sm font-medium"
            style={{ background: P.ink, color: P.paper }}
          >
            回答を入力する
          </button>
        </div>
        <div className="text-xs space-y-1" style={{ color: `${P.textDim}e6` }}>
          <p>— 持ち込み: 2本</p>
          <p>— 逐次モード</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function ResultsMock() {
  const rows = [
    { rank: 1, name: '佐藤', score: 42 },
    { rank: 2, name: '田中', score: 38 },
    { rank: 3, name: '鈴木', score: 35 },
  ];

  return (
    <PhoneFrame label="結果発表（順位）">
      <div className="min-h-full px-4 py-6" style={{ background: P.bg, fontFamily: P.serif }}>
        <p className="text-[11px] tracking-[0.25em] uppercase mb-3" style={{ color: P.brand }}>
          Published
        </p>
        <h2 className="text-lg mb-4" style={{ color: P.text }}>
          Final Results
        </h2>
        {rows.map((r) => (
          <div
            key={r.rank}
            className="flex items-center gap-3 mb-3 p-3 rounded-lg"
            style={{
              background: r.rank === 1 ? P.paper : P.rankMutedBg,
              color: r.rank === 1 ? P.ink : P.rankMutedText,
            }}
          >
            <span className="text-2xl font-bold tabular-nums w-8">{r.rank}</span>
            <span className="flex-1">{r.name}</span>
            <span className="text-lg font-semibold tabular-nums">{r.score}pt</span>
          </div>
        ))}
        <div
          className="mt-6 rounded-xl p-4"
          style={{ background: P.surface, border: `1px solid ${P.surfaceBorder}` }}
        >
          <p className="text-xs mb-2" style={{ color: P.textDim }}>
            Sample B · 正解
          </p>
          <p className="text-lg" style={{ color: P.text }}>
            Glenfarclas 15
          </p>
          <p className="text-sm mt-1" style={{ color: P.textMuted }}>
            Speyside · Sherry Cask
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function Swatch({ hex, name, usage }: { hex: string; name: string; usage: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg shrink-0 border border-white/10"
        style={{ background: hex }}
      />
      <div className="min-w-0">
        <p className="text-sm text-stone-200 font-medium">{name}</p>
        <p className="text-xs text-stone-500 font-mono truncate">{hex}</p>
        <p className="text-xs text-stone-600">{usage}</p>
      </div>
    </div>
  );
}

export default function TastingNoteMockPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-stone-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur-md px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-stone-500 tracking-widest uppercase mb-1">Design Exploration</p>
            <h1 className="text-xl font-semibold tracking-tight">テイスティングノート配色モック</h1>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/design-mocks" className="text-stone-400 hover:text-stone-200">
              UIモック
            </Link>
            <Link href="/design-mocks/colors" className="text-stone-400 hover:text-stone-200">
              配色20案
            </Link>
            <Link href="/" className="text-stone-400 hover:text-stone-200">
              アプリ
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: P.serif, color: '#f5ebe0' }}>
            1. テイスティングノート
          </h2>
          <p className="text-stone-400 leading-relaxed max-w-2xl">
            紙・インク・ウォルナットの質感。管理画面感を減らし「今夜の会」の一体感を出す配色です。
            本番で実装済みの UI（次アクション集中・名札復帰）を、このパレットで再現しています。
          </p>
          <p className="text-sm mt-2" style={{ color: P.brand }}>
            本番アプリにこの配色を適用済みです（Islay Smoke から移行）
          </p>
        </section>

        <section className="mb-16">
          <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-6">
            実装UI × テイスティングノート配色
          </h3>
          <div className="flex flex-wrap justify-center gap-10">
            <FocusAnswerMock />
            <FocusPresenterMock />
            <NametagRecoveryMock />
          </div>
        </section>

        <section className="mb-16">
          <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-6">
            ブランド・結果画面
          </h3>
          <div className="flex flex-wrap justify-center gap-10">
            <SessionHomeMock />
            <ResultsMock />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">
              パレット一覧
            </h3>
            <div
              className="rounded-2xl overflow-hidden border max-w-md"
              style={{ borderColor: P.surfaceBorder, background: P.bgGradient }}
            >
              <div className="h-24 flex">
                <div className="flex-1" style={{ background: P.bgDeep }} />
                <div className="w-12" style={{ background: P.paper }} />
                <div className="w-12" style={{ background: P.ink }} />
                <div className="w-12" style={{ background: P.brand }} />
              </div>
              <div className="p-4 space-y-2" style={{ fontFamily: P.serif }}>
                <p style={{ color: P.text }}>Walnut & Parchment</p>
                <p className="text-xs" style={{ color: P.textMuted }}>
                  暗いウォルナット背景 + クリーム色の紙カード
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">
              カラートークン
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {TOKENS.map((t) => (
                <Swatch key={t.name} {...t} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 p-6 rounded-2xl border border-white/10 bg-neutral-900/50">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">デザイン方針</h3>
          <ul className="text-sm text-stone-400 space-y-2 leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-stone-300 font-medium">背景</strong> — ウォルナット系ダーク（#1A1410〜#2A1F18）。バーではなく「テイスティングノート置き場」の雰囲気。
            </li>
            <li>
              <strong className="text-stone-300 font-medium">紙カード</strong> — 重要な操作・役割表示はパーチメント（#F4EAD8）上に。視線が自然に集まる。
            </li>
            <li>
              <strong className="text-stone-300 font-medium">Primary</strong> — インク色（#3D2E1F）ボタン + クリーム文字。ゴールドではなく「万年筆のインク」。
            </li>
            <li>
              <strong className="text-stone-300 font-medium">タイポ</strong> — Georgia セリフ体で統一。数字・順位は等幅（結果画面）。
            </li>
            <li>
              <strong className="text-stone-300 font-medium">名札</strong> — イニシャルバッジだけ紙質。リスト本体は半透明ウォルナットで背景に溶け込む。
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
