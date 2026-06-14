'use client';

import { ExportCanvas } from '@/components/results/export/ExportCanvas';
import { exportColors, rankHighlight } from '@/lib/results-export-design';
import { disambiguatedDisplayName } from '@/lib/participant-display';
import { sessionModeLabel, type ResultsPosterData } from '@/lib/results-poster';

function MedalBlock({
  rank,
  name,
  score,
  medalColor,
  size = 'md',
}: {
  rank: number;
  name: string;
  score: number;
  medalColor: string;
  size?: 'lg' | 'md';
}) {
  const isLg = size === 'lg';
  return (
    <div style={{ textAlign: 'center', flex: isLg ? 1.2 : 1 }}>
      <div
        style={{
          width: isLg ? 120 : 96,
          height: isLg ? 120 : 96,
          borderRadius: '50%',
          margin: '0 auto',
          background: `linear-gradient(145deg, ${medalColor}, ${exportColors.accentDark})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: isLg ? 40 : 32,
          fontWeight: 800,
          boxShadow: '0 8px 24px rgba(44,36,24,0.18)',
        }}
      >
        {rank}
      </div>
      <p
        style={{
          margin: '16px 0 4px',
          fontSize: isLg ? 28 : 24,
          fontWeight: 700,
          color: exportColors.ink,
          lineHeight: 1.2,
        }}
      >
        {name}
      </p>
      <p style={{ margin: 0, fontSize: isLg ? 32 : 28, fontWeight: 800, color: exportColors.accentDark }}>
        {score}点
      </p>
    </div>
  );
}

export function ResultsShareCard({
  results,
  resultsPageUrl,
}: {
  results: ResultsPosterData;
  resultsPageUrl: string;
}) {
  const peers = results.rankings.map((r) => ({
    participant_id: r.participant_id,
    display_name: r.display_name,
  }));
  const byRank = new Map(results.rankings.map((r) => [r.rank, r]));
  const podium = [2, 1, 3]
    .map((rank) => byRank.get(rank))
    .filter((r): r is NonNullable<typeof r> => !!r);
  const rest = results.rankings.filter((r) => r.rank > 3).sort((a, b) => a.rank - b.rank);
  const capturedDate = new Date().toLocaleDateString('ja-JP');
  const highlight = rankHighlight(results);

  return (
    <ExportCanvas exportKind="share">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 52,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            color: exportColors.ink,
            lineHeight: 1.15,
          }}
        >
          {results.session.title}
        </h1>
        <p style={{ margin: '16px 0 0', fontSize: 24, color: exportColors.inkMuted }}>
          {sessionModeLabel(results.session.mode)} · {capturedDate}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 22, color: exportColors.inkLight }}>
          参加者 {results.rankings.length}名 · サンプル {results.sample_details.length}本
        </p>
      </div>

      {podium.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24, marginBottom: 48 }}>
          {podium.map((entry) => (
            <MedalBlock
              key={entry.participant_id}
              rank={entry.rank}
              name={disambiguatedDisplayName(entry.display_name, entry.participant_id, peers)}
              score={entry.total_score}
              medalColor={
                entry.rank === 1 ? exportColors.medal1 : entry.rank === 2 ? exportColors.medal2 : exportColors.medal3
              }
              size={entry.rank === 1 ? 'lg' : 'md'}
            />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div
          style={{
            background: 'rgba(255,255,255,0.55)',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 32,
            border: `1px solid ${exportColors.rule}`,
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: exportColors.inkMuted }}>その他の順位</p>
          {rest.map((r) => (
            <div
              key={r.participant_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 24,
                padding: '10px 0',
                borderBottom: `1px solid ${exportColors.rule}`,
              }}
            >
              <span>
                <strong>{r.rank}位</strong>{' '}
                {disambiguatedDisplayName(r.display_name, r.participant_id, peers)}
              </span>
              <span style={{ fontWeight: 700, color: exportColors.accentDark }}>{r.total_score}点</span>
            </div>
          ))}
        </div>
      )}

      {highlight && (
        <div
          style={{
            marginTop: 'auto',
            padding: '20px 24px',
            background: `rgba(196, 165, 116, 0.2)`,
            borderRadius: 12,
            fontSize: 22,
            color: exportColors.inkMuted,
            textAlign: 'center',
          }}
        >
          {highlight}
        </div>
      )}

      <div style={{ marginTop: highlight ? 24 : 'auto', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 20, color: exportColors.inkLight }}>詳細は結果ページで</p>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 18,
            color: exportColors.accent,
            wordBreak: 'break-all',
            lineHeight: 1.4,
          }}
        >
          {resultsPageUrl}
        </p>
      </div>
    </ExportCanvas>
  );
}
