/**
 * Cursor などローカル用デバッグインゲスト。本番ビルドでは何もしない。
 * Vercel 上で localhost への fetch を避ける。
 */
const INGEST_PRIMARY =
  'http://127.0.0.1:7243/ingest/699882dd-cd61-413c-8229-b42b014179ee';
const INGEST_ALT =
  'http://127.0.0.1:7242/ingest/01e2fc3d-3da6-4ac5-b2d7-55efdca98905';

export type AgentDebugIngestVariant = 'default' | 'alt';

export function agentDebugIngest(
  payload: Record<string, unknown>,
  variant: AgentDebugIngestVariant = 'default',
): void {
  if (process.env.NODE_ENV === 'production') return;
  const url = variant === 'alt' ? INGEST_ALT : INGEST_PRIMARY;
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
