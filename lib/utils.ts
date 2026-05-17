// 共通ユーティリティ関数

/**
 * localStorageからparticipant_tokenを取得
 */
export function getParticipantToken(joinToken: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = `bd:participant_token:${joinToken}`;
  return localStorage.getItem(key);
}

/**
 * localStorageにparticipant_tokenを保存
 */
export function setParticipantToken(joinToken: string, token: string): void {
  if (typeof window === 'undefined') return;
  const key = `bd:participant_token:${joinToken}`;
  localStorage.setItem(key, token);
}

/** 参加表明をリセット（別端末・別参加者として入り直す用） */
export function clearParticipantToken(joinToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`bd:participant_token:${joinToken}`);
}

/**
 * localStorageからowner_tokenを取得
 */
export function getOwnerToken(joinToken: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = `bd:owner_token:${joinToken}`;
  return localStorage.getItem(key);
}

/**
 * localStorageにowner_tokenを保存
 */
export function setOwnerToken(joinToken: string, token: string): void {
  if (typeof window === 'undefined') return;
  const key = `bd:owner_token:${joinToken}`;
  localStorage.setItem(key, token);
}

/**
 * テキストをクリップボードにコピー（Clipboard API が使えない環境は fallback）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!text) return false;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallthrough
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * API呼び出しの共通処理
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: true; data: T } | { error: string; code: string }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }));
      return { error: error.error || 'エラーが発生しました', code: error.code || 'UNKNOWN' };
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('API call error:', error);
    return { error: 'ネットワークエラーが発生しました', code: 'NETWORK_ERROR' };
  }
}

/** LINE の「テキストで送る」に委譲する URL（https://developers.line.biz/ja/reference/line-url-scheme/#send-text-messages） */
export function buildLineTextShareUrl(message: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
}

export function buildLineJoinInviteShareUrl(pageUrl: string, title: string): string {
  const text = title ? `${title}\n${pageUrl}` : pageUrl;
  return buildLineTextShareUrl(text);
}

/**
 * 参加招待のシェア用に LINE を別タブで開く。ポップアップブロック時は false。
 */
export function openLineJoinInviteShare(pageUrl: string, title: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = buildLineJoinInviteShareUrl(pageUrl, title);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  return !!win;
}
