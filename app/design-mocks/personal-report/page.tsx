'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PersonalReportMock } from '@/components/design-mocks/personal-report/PersonalReportMock';
import { getMockData, MOCK_SCENARIO_LABELS, type MockScenario } from '@/components/design-mocks/personal-report/dummy-data';
import { CANVAS } from '@/components/design-mocks/personal-report/tokens';
import {
  ReportPreviewModal,
  type ReportPreviewPayload,
} from '@/components/reports/ReportPreviewModal';
import { captureSingleElementToPngDataUrl } from '@/lib/capture-ranking-png';
import { REPORT_CAPTURE_PIXEL_RATIO } from '@/lib/report-export/theme';
import { savePngDataUrl } from '@/lib/download-png';

const SCENARIOS = Object.keys(MOCK_SCENARIO_LABELS) as MockScenario[];

export default function PersonalReportMockPage() {
  const [scenario, setScenario] = useState<MockScenario>('standard');
  const data = useMemo(() => getMockData(scenario), [scenario]);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ReportPreviewPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCapturePreview = async () => {
    const root = captureRef.current?.querySelector('[data-report-capture-page]') as HTMLElement | null;
    if (!root) {
      setError('キャプチャ対象が見つかりません');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready.catch(() => undefined);
      }
      await new Promise<void>((r) => setTimeout(r, 120));
      const pngDataUrl = await captureSingleElementToPngDataUrl(root, {
        pixelRatio: REPORT_CAPTURE_PIXEL_RATIO,
      });
      const day = new Date().toISOString().split('T')[0];
      setPreview({
        kind: 'personal',
        title: data.sessionTitle,
        filename: `mock_personal_${scenario}_${day}.png`,
        pngDataUrl,
        participantName: data.participantName,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'キャプチャに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1410', padding: '32px 24px 48px' }}>
      <div style={{ maxWidth: CANVAS.width + 80, margin: '0 auto' }}>
        <header style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8b7355' }}>
              Design Mock
            </p>
            <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 600, color: '#f5ebe0' }}>個人レポート — 静的モック v1</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#a89070', lineHeight: 1.5 }}>
              {CANVAS.width}px 固定 · 部門 {data.categories.length} · ラウンド {data.rounds.length} · 採点列{' '}
              {data.scoringColumns.length}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 14, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => void runCapturePreview()}
              disabled={busy}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: busy ? '#4a4035' : '#c9a24a',
                color: busy ? '#a89070' : '#1a1410',
                fontWeight: 700,
                fontSize: 14,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? 'キャプチャ中…' : 'キャプチャプレビュー'}
            </button>
            <Link href="/design-mocks" style={{ color: '#c4a574', textDecoration: 'none' }}>
              ← デザインモック一覧
            </Link>
            <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>
              アプリに戻る
            </Link>
          </div>
        </header>

        {error && (
          <p style={{ marginBottom: 12, color: '#f0a0a0', fontSize: 13 }}>{error}</p>
        )}

        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SCENARIOS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setScenario(key)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid',
                borderColor: scenario === key ? '#c9a24a' : 'rgba(255,255,255,0.12)',
                background: scenario === key ? 'rgba(201, 162, 74, 0.2)' : 'rgba(255,255,255,0.04)',
                color: scenario === key ? '#f5ebe0' : '#a89070',
                fontSize: 13,
                fontWeight: scenario === key ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {MOCK_SCENARIO_LABELS[key]}
            </button>
          ))}
        </div>

        <div
          ref={captureRef}
          style={{ overflow: 'auto', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
        >
          <PersonalReportMock data={data} />
        </div>

        <aside
          style={{
            marginTop: 28,
            padding: 20,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#a89070',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: '#e8dcc8' }}>スケール検証 / キャプチャデバッグ</strong>
          <p style={{ margin: '8px 0 0' }}>
            「キャプチャプレビュー」は本番と同じ PNG 生成処理で画像を作り、プレビューモーダルで縦位置・余白を確認できます。実寸表示で細部をチェックしてください。
          </p>
        </aside>
      </div>

      <ReportPreviewModal
        preview={preview}
        isSaving={saving}
        onClose={() => {
          if (!saving) setPreview(null);
        }}
        onSave={async () => {
          if (!preview) return;
          setSaving(true);
          try {
            await savePngDataUrl(preview.filename, preview.pngDataUrl);
            setPreview(null);
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
