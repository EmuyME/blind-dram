/**
 * 同一イベント内で表示名が重なる参加者を UI 上で区別する。
 */

function normName(s: string | null | undefined): string {
  const t = (s ?? '').trim();
  return t || '（無名）';
}

/** UUID から短い表示用サフィックス（例: A1B2） */
export function shortParticipantSuffix(participantId: string): string {
  const c = participantId.replace(/-/g, '');
  return c.slice(-4).toUpperCase();
}

type PeerLike = { participant_id?: string; id?: string; display_name?: string };

/**
 * peers に同じ表示名が複数いるときだけ、名前の後に短い ID サフィックスを付ける。
 */
export function disambiguatedDisplayName(
  displayName: string | null | undefined,
  participantId: string,
  peers: readonly PeerLike[],
): string {
  const name = normName(displayName);
  const sameCount = peers.filter((p) => normName(p.display_name) === name).length;
  const base = (displayName ?? '').trim() || '（無名）';
  if (sameCount <= 1) return base;
  return `${base} (${shortParticipantSuffix(participantId)})`;
}
