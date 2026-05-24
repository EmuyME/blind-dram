"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-neutral-900 pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <p className="text-sm text-stone-500">
            <Link href="/" className="text-bd-accent hover:text-bd-accent-hover transition-colors">
              ← トップに戻る
            </Link>
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-stone-100 tracking-tight">
            Blind Dram の使い方
          </h1>
          <p className="text-stone-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            ブラインドテイスティング会の「司会役」と「参加者」が迷わず進められるよう、典型的な流れと画面の役割をまとめました。
          </p>
        </header>

        <section className="ui-card p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">役割の目安</h2>
          <ul className="text-sm text-stone-300 leading-relaxed space-y-2 list-disc pl-5">
            <li>
              <span className="text-stone-200 font-medium">司会（オーナー）</span>
              ：イベントを作り、参加締切・試飲順・ラウンド開始・結果公開などを行います。専用の
              Owner URL から操作します（トークン付き URL のみの人が操作できます）。
            </li>
            <li>
              <span className="text-stone-200 font-medium">参加者</span>
              ：参加 URL または参加コードで入室し、登録・各サンプルへの回答・（逐次モードなら）ラウンド結果の確認などをします。
            </li>
            <li>
              <span className="text-stone-200 font-medium">プレゼンター</span>
              ：当該サンプルの持ち込み主です。正解入力や Presenter パネルからのテイスティング記入など、サンプル担当として動きます。
            </li>
          </ul>
        </section>

        <section className="ui-card p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">1. イベントの始め方（司会）</h2>
          <ol className="text-sm text-stone-300 leading-relaxed space-y-3 list-decimal pl-5">
            <li>
              トップの{" "}
              <Link href="/create" className="text-bd-accent hover:underline">
                イベントを作成する
              </Link>
              でイベント名と回答モード（逐次モード／一斉モード）を選びます。
            </li>
            <li>
              作成後に開く Owner 画面で、参加用 URL・参加コード・Owner URL を共有します。Owner URL は司会だけが開けるようにしてください。
            </li>
            <li>
              「設定」タブで配点・フレーバーチャート・カスク／地域の選択肢などを必要に応じて保存します。テイスティング{" "}
              <span className="text-stone-200">開始時</span> にフレーバーチャートの内容がスナップショットとして固定され、結果のチャート表示に反映されます。
            </li>
          </ol>
        </section>

        <section className="ui-card p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">2. 参加する（参加者）</h2>
          <ul className="text-sm text-stone-300 leading-relaxed space-y-2 list-disc pl-5">
            <li>
              司会から共有された{" "}
              <span className="text-stone-200">参加用リンク</span>を開くか、
              <Link href="/join" className="text-bd-accent hover:underline">
                参加コードで参加
              </Link>
              からコードを入力します。
            </li>
            <li>
              表示名・出席・持ち込み本数・仮ラベル（Sample 名のもと）などを登録すると、Session ホームに入れます。同じ端末では自動的に再入室しやすくなります。
            </li>
          </ul>
        </section>

        <section className="ui-card p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">3. 試飲当日の流れ（司会）</h2>
          <ol className="text-sm text-stone-300 leading-relaxed space-y-3 list-decimal pl-5">
            <li>参加者の登録が揃ったら「参加登録を締め切る」、試飲順（サンプル順）を並べ替えます。</li>
            <li>
              <span className="text-stone-200">Sessionを開始する</span>
              でテイスティングを始めます（この時点で設定のフレーバーチャートがスナップショットされます）。
            </li>
            <li>
              各サンプルについて、プレゼンターが正解（Truth）を入れ、ラウンドを進行します。全員の回答と採点が終わったらラウンドを完了させます。
            </li>
            <li>
              <span className="text-stone-200">逐次モード</span>
              ではサンプルごとに途中結果を見てから次へ進めます。
              <span className="text-stone-200"> 一斉モード</span>
              では最後まで回答をため、まとめて結果を公開します。
            </li>
            <li>全ラウンド終了後、結果を「公開」すると参加者も結果画面を閲覧できます（公開設定に応じます）。</li>
          </ol>
        </section>

        <section className="ui-card p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">4. 回答とフレーバー</h2>
          <ul className="text-sm text-stone-300 leading-relaxed space-y-2 list-disc pl-5">
            <li>各サンプル画面で、配点に応じた推測（カスク・地域・年数・度数・蒸留所など）と、任意でフレーバーコメント・Tier1／Tier2 を入力できます。</li>
            <li>
              プレゼンターは Presenter パネルからテイスティングを入力できます。結果のナイチンゲール（ローズ）チャートは、プレゼンター入力や参加者入力の集計ルールに従って表示されます。
            </li>
            <li>
              オーナー設定のフレーバーチャートで、Tier1 ごとに「ナイチンゲール・チャートに表示するか」を切り替えられます。オフにした区分は集計の対象からは外れず、チャートの軸からだけ除外されます（「その他」は既定でチャート非表示扱いです）。
            </li>
          </ul>
        </section>

        <section className="ui-card p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">5. 結果画面</h2>
          <p className="text-sm text-stone-300 leading-relaxed">
            公開後、参加者は順位表・各サンプル詳細（正解・回答表・フレーチャートなど）・参加者別タブを確認できます。必要に応じて CSV ダウンロードや順位表の共有も利用できます。
          </p>
        </section>

        <section className="ui-card p-6 md:p-8 space-y-4 border border-bd-accent/25">
          <h2 className="text-lg font-semibold text-stone-100 tracking-tight">うまく動かないとき</h2>
          <ul className="text-sm text-stone-300 leading-relaxed space-y-2 list-disc pl-5">
            <li>参加リンクと参加コードは別物です。コードは短い英数字、リンクは長いトークン付き URL です。</li>
            <li>司会操作は Owner URL から行います。通常の参加 URL だけでは設定変更や締切はできません。</li>
            <li>別ブラウザや端末からアクセスした場合は、参加URLまたはセッションホームから以前登録した名前を選べば復帰できます（パスワード不要）。</li>
          </ul>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/" className="inline-flex justify-center">
            <Button variant="secondary" className="min-w-[200px] w-full sm:w-auto">
              トップへ
            </Button>
          </Link>
          <Link href="/create" className="inline-flex justify-center">
            <Button variant="primary" className="min-w-[200px] w-full sm:w-auto">
              イベントを作成する
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
