'use client';

import { useState } from 'react';
import Link from 'next/link';

type ConceptId = 'paper' | 'phase' | 'focus' | 'type' | 'nametag';

const CONCEPTS: {
  id: ConceptId;
  title: string;
  summary: string;
  bestFor: string;
}[] = [
  {
    id: 'paper',
    title: '1. テイスティングノート',
    summary: '紙・インク・ウォルナットの質感。管理画面感を減らし「今夜の会」の一体感を出す。',
    bestFor: '回答フォーム・結果ページ',
  },
  {
    id: 'phase',
    title: '2. フェーズ連動',
    summary: '参加登録〜結果公開まで、画面全体の色温度がフェーズと連動する。',
    bestFor: '初参加者の迷い防止',
  },
  {
    id: 'focus',
    title: '3. 次アクション集中',
    summary: 'Primary操作を1つだけ大きく。飲みながらのスマホ操作を想定。',
    bestFor: 'セッションホーム・Round画面',
  },
  {
    id: 'type',
    title: '4. タイポグラフィ強化',
    summary: '見出しはセリフ、数字は等幅。順位・スコアに「イベント感」を。',
    bestFor: '結果発表・順位表',
  },
  {
    id: 'nametag',
    title: '5. 名札ボード復帰',
    summary: '参加者選択を名札カードUIに。別端末復帰の不安を減らす。',
    bestFor: '復帰・参加者切替',
  },
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

/* ── Concept 1: Paper / tasting note ── */
function PaperMocks() {
  return (
    <div className="flex flex-wrap justify-center gap-10">
      <PhoneFrame label="セッションホーム">
        <div
          className="min-h-full px-4 py-6"
          style={{
            background: 'linear-gradient(165deg, #2a1f18 0%, #1a1410 100%)',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#c4a574]/80 mb-2">Blind Dram</div>
          <h1 className="text-xl text-[#f5ebe0] mb-1">第12回 ブラインド会</h1>
          <p className="text-sm text-[#a89070] mb-5">Sample B · 進行中</p>
          <div
            className="rounded-lg p-4 mb-4"
            style={{
              background: 'linear-gradient(180deg, #f4ead8 0%, #ebe0cc 100%)',
              color: '#3d2e1f',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            <div className="text-[11px] text-[#8b7355] mb-2 border-b border-[#c9b896] pb-2">あなたの役割</div>
            <p className="text-base font-semibold">回答者 — 田中</p>
            <p className="text-sm mt-2 text-[#5c4a32]">Nose / Palate / Finish を入力してください</p>
            <button
              type="button"
              className="mt-4 w-full py-3 rounded-md text-sm font-medium"
              style={{ background: '#3d2e1f', color: '#f4ead8' }}
            >
              回答を入力する
            </button>
          </div>
          <div className="text-xs text-[#8b7355]/90 space-y-1">
            <p>— 持ち込み: 2本</p>
            <p>— 逐次モード</p>
          </div>
        </div>
      </PhoneFrame>
      <PhoneFrame label="結果（順位）">
        <div
          className="min-h-full px-4 py-6"
          style={{ background: '#2a1f18', fontFamily: 'Georgia, serif' }}
        >
          <h2 className="text-lg text-[#f5ebe0] mb-4">Final Results</h2>
          {[
            { rank: 1, name: '佐藤', score: 42 },
            { rank: 2, name: '田中', score: 38 },
            { rank: 3, name: '鈴木', score: 35 },
          ].map((r) => (
            <div
              key={r.rank}
              className="flex items-center gap-3 mb-3 p-3 rounded-lg"
              style={{ background: r.rank === 1 ? '#f4ead8' : 'rgba(244,234,216,0.12)', color: r.rank === 1 ? '#3d2e1f' : '#e8dcc8' }}
            >
              <span className="text-2xl font-bold tabular-nums w-8">{r.rank}</span>
              <span className="flex-1">{r.name}</span>
              <span className="text-lg font-semibold tabular-nums">{r.score}pt</span>
            </div>
          ))}
        </div>
      </PhoneFrame>
    </div>
  );
}

/* ── Concept 2: Phase atmosphere ── */
function PhaseMocks() {
  const phases = [
    { label: '参加登録中', bg: 'from-sky-950 via-neutral-900 to-neutral-950', accent: 'border-sky-400', pill: 'bg-sky-500/20 text-sky-100' },
    { label: '順番決め中', bg: 'from-violet-950 via-neutral-900 to-neutral-950', accent: 'border-violet-400', pill: 'bg-violet-500/20 text-violet-100' },
    { label: '進行中', bg: 'from-amber-950/80 via-neutral-900 to-neutral-950', accent: 'border-amber-500', pill: 'bg-amber-500/20 text-amber-100' },
    { label: '結果公開済', bg: 'from-yellow-900/40 via-neutral-900 to-neutral-950', accent: 'border-yellow-400', pill: 'bg-yellow-500/15 text-yellow-100' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
      {phases.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-2">
          <span className="text-xs text-stone-500">{p.label}</span>
          <div className={`w-[200px] h-[360px] rounded-2xl border border-white/10 bg-gradient-to-b ${p.bg} p-3 overflow-hidden`}>
            <div className={`border-l-4 ${p.accent} pl-2 py-1 mb-4`}>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.pill}`}>{p.label}</span>
            </div>
            <p className="text-sm text-stone-200 font-medium mb-1">第12回 ブラインド会</p>
            <p className="text-xs text-stone-400 leading-relaxed">
              {p.label === '参加登録中' && '表示名と持ち込み本数を登録'}
              {p.label === '順番決め中' && 'オーナーが試飲順を調整中'}
              {p.label === '進行中' && 'Sample B の回答受付中'}
              {p.label === '結果公開済' && '全ラウンド完了 — 結果を確認'}
            </p>
            <div className="mt-6 h-24 rounded-xl bg-white/5 border border-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Concept 3: Single action focus ── */
function FocusMocks() {
  return (
    <div className="flex flex-wrap justify-center gap-10">
      <PhoneFrame label="Round — 回答者">
        <div className="min-h-full bg-neutral-950 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 text-center">
            <p className="text-xs text-stone-500">Sample B</p>
            <p className="text-sm text-stone-300">逐次モード · 進行中</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <p className="text-stone-500 text-sm mb-2">あなたの番です</p>
            <h2 className="text-2xl font-semibold text-stone-100 text-center mb-2">回答を提出する</h2>
            <p className="text-stone-400 text-sm text-center mb-10 leading-relaxed">
              蒸溜所・年数・フレーバーを入力して提出してください
            </p>
            <button type="button" className="w-full max-w-[260px] py-4 rounded-2xl bg-[#C88A2B] text-black/90 text-lg font-semibold">
              回答画面を開く
            </button>
            <button type="button" className="mt-4 text-sm text-stone-500 underline-offset-2 hover:underline">
              参加者一覧を見る
            </button>
          </div>
        </div>
      </PhoneFrame>
      <PhoneFrame label="Round — Presenter">
        <div className="min-h-full bg-neutral-950 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 text-center">
            <p className="text-xs text-stone-500">Sample C · あなたが Presenter</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-4">
              <span className="text-2xl text-amber-200">P</span>
            </div>
            <h2 className="text-xl font-semibold text-stone-100 text-center mb-8">Round を開始できます</h2>
            <button type="button" className="w-full max-w-[260px] py-4 rounded-2xl bg-[#C88A2B] text-black/90 text-lg font-semibold">
              Presenter パネルを開く
            </button>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

/* ── Concept 4: Typography ── */
function TypeMocks() {
  return (
    <PhoneFrame label="結果発表">
      <div className="min-h-full bg-[#0c0c0c] px-4 py-8">
        <p
          className="text-[11px] tracking-[0.25em] uppercase text-[#C88A2B] mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Published
        </p>
        <h1
          className="text-3xl text-stone-100 leading-tight mb-1"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          第12回
          <br />
          ブラインド会
        </h1>
        <p className="text-stone-500 text-sm mb-8">2026年5月24日 · 逐次モード</p>

        <div className="border-t border-white/10 pt-6 mb-6">
          <p className="text-xs text-stone-500 mb-4 tracking-widest uppercase">Overall Ranking</p>
          {[
            { rank: '01', name: '佐藤 健', score: '042' },
            { rank: '02', name: '田中 美咲', score: '038' },
            { rank: '03', name: '鈴木 大輔', score: '035' },
          ].map((row) => (
            <div key={row.rank} className="flex items-baseline gap-4 py-3 border-b border-white/5">
              <span
                className="text-3xl font-light tabular-nums text-[#C88A2B]/90 w-12"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              >
                {row.rank}
              </span>
              <span className="flex-1 text-stone-200" style={{ fontFamily: 'Georgia, serif' }}>
                {row.name}
              </span>
              <span className="text-xl tabular-nums text-stone-100 font-medium">{row.score}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-neutral-900/80 border border-white/10 p-4">
          <p className="text-xs text-stone-500 mb-2">Sample B · 正解</p>
          <p className="text-lg text-stone-100" style={{ fontFamily: 'Georgia, serif' }}>
            Glenfarclas 15
          </p>
          <p className="text-sm text-stone-400 mt-1">Speyside · Sherry Cask</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ── Concept 5: Name tag recovery ── */
function NametagMocks() {
  const participants = [
    { id: '1', name: '田中 美咲', bottles: 2, initial: '田' },
    { id: '2', name: '佐藤 健', bottles: 1, initial: '佐' },
    { id: '3', name: '鈴木 大輔', bottles: 0, initial: '鈴' },
  ];
  return (
    <PhoneFrame label="参加者として復帰">
      <div className="min-h-full bg-neutral-900 px-4 py-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-1">おかえりなさい</h2>
        <p className="text-sm text-stone-400 mb-6 leading-relaxed">
          以前登録した名前を選ぶと、続きから操作できます
        </p>
        <div className="space-y-3">
          {participants.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-neutral-800 border border-white/10 hover:border-[#C88A2B]/50 hover:bg-neutral-800/90 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#C88A2B]/20 border border-[#C88A2B]/35 flex items-center justify-center text-lg font-semibold text-[#E7C27B]">
                {p.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-100 truncate">{p.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {p.bottles > 0 ? `持ち込み ${p.bottles} 本` : '持ち込みなし'}
                </p>
              </div>
              <span className="text-xs text-stone-500 shrink-0">選択 →</span>
            </button>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-stone-500 mb-2">オーナーの方</p>
          <div className="flex gap-2">
            <input
              readOnly
              value="/o/xxxxxxxx..."
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-xs text-stone-400"
            />
            <button type="button" className="px-3 py-2 rounded-lg bg-neutral-700 text-xs text-stone-200">
              開く
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export default function DesignMocksPage() {
  const [active, setActive] = useState<ConceptId>('paper');
  const concept = CONCEPTS.find((c) => c.id === active)!;

  return (
    <div className="min-h-screen bg-neutral-950 text-stone-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur-md px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-stone-500 tracking-widest uppercase mb-1">Design Exploration</p>
            <h1 className="text-xl font-semibold tracking-tight">Blind Dram — UI モック</h1>
          </div>
          <div className="flex gap-4 text-sm flex-wrap">
            <Link
              href="/design-mocks/personal-report"
              className="text-[#c4a574]/90 hover:text-[#d4b584] transition-colors font-medium"
            >
              個人レポートモック →
            </Link>
            <Link
              href="/design-mocks/tasting-note"
              className="text-[#c4a574]/90 hover:text-[#d4b584] transition-colors"
            >
              テイスティングノート配色 →
            </Link>
            <Link
              href="/design-mocks/colors"
              className="text-sm text-[#C88A2B]/90 hover:text-[#D79A3D] transition-colors"
            >
              配色20案 →
            </Link>
            <Link
              href="/"
              className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
            >
              ← アプリに戻る
            </Link>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto mt-4 flex gap-2 overflow-x-auto pb-1">
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                active === c.id
                  ? 'bg-[#C88A2B] text-black/90'
                  : 'bg-neutral-800 text-stone-400 hover:text-stone-200 border border-white/10'
              }`}
            >
              {c.title}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-2">{concept.title}</h2>
          <p className="text-stone-400 leading-relaxed max-w-2xl">{concept.summary}</p>
          <p className="text-sm text-[#C88A2B]/90 mt-2">向いている画面: {concept.bestFor}</p>
          {active === 'paper' && (
            <Link
              href="/design-mocks/tasting-note"
              className="inline-flex mt-4 px-4 py-2 rounded-full text-sm font-medium transition-colors border"
              style={{
                background: 'linear-gradient(180deg, #f4ead8 0%, #ebe0cc 100%)',
                color: '#3d2e1f',
                borderColor: '#c9b896',
              }}
            >
              テイスティングノート配色の詳細モックを見る →
            </Link>
          )}
        </section>

        <section className="py-6">
          {active === 'paper' && <PaperMocks />}
          {active === 'phase' && <PhaseMocks />}
          {active === 'focus' && <FocusMocks />}
          {active === 'type' && <TypeMocks />}
          {active === 'nametag' && <NametagMocks />}
        </section>

        <section className="mt-16 p-6 rounded-2xl border border-white/10 bg-neutral-900/50">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">組み合わせ案</h3>
          <ul className="text-sm text-stone-400 space-y-2 leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-stone-300 font-medium">実装優先:</strong> 3（次アクション）+ 5（名札復帰）— 本番UXへの効果が大きい
            </li>
            <li>
              <strong className="text-stone-300 font-medium">ブランド強化:</strong> 1（紙質）+ 4（タイポ）— 結果ページとイベント全体の印象
            </li>
            <li>
              <strong className="text-stone-300 font-medium">既存活用:</strong> 2（フェーズ）は PhaseBanner の延長で段階導入しやすい
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
