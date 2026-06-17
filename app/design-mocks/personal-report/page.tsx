'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PersonalReportMock } from '@/components/design-mocks/personal-report/PersonalReportMock';
import { getMockData, MOCK_SCENARIO_LABELS, type MockScenario } from '@/components/design-mocks/personal-report/dummy-data';
import { CANVAS } from '@/components/design-mocks/personal-report/tokens';

const SCENARIOS = Object.keys(MOCK_SCENARIO_LABELS) as MockScenario[];

export default function PersonalReportMockPage() {
  const [scenario, setScenario] = useState<MockScenario>('standard');
  const data = useMemo(() => getMockData(scenario), [scenario]);

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
          <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
            <Link href="/design-mocks" style={{ color: '#c4a574', textDecoration: 'none' }}>
              ← デザインモック一覧
            </Link>
            <Link href="/" style={{ color: '#8b7355', textDecoration: 'none' }}>
              アプリに戻る
            </Link>
          </div>
        </header>

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

        <div style={{ overflow: 'auto', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
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
          <strong style={{ color: '#e8dcc8' }}>スケール検証</strong>
          <p style={{ margin: '8px 0 0' }}>
            上部のシナリオ切替で、部門数・ラウンド数が増えたときのレイアウトを確認できます。分析エリアの高さ・棒グラフ・表のフォント/行高が自動調整されます。
          </p>
        </aside>
      </div>
    </div>
  );
}
