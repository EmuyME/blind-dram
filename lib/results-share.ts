/** 結果ページ・共有 URL の組み立て */

export function buildResultsPagePath(joinToken: string, ownerToken?: string | null, publicResults = true): string {
  const base = `/session/${joinToken}/results`;
  if (publicResults || !ownerToken) return base;
  return `${base}?owner_token=${encodeURIComponent(ownerToken)}`;
}

export function buildResultsPageUrl(
  origin: string,
  joinToken: string,
  ownerToken?: string | null,
  publicResults = true,
): string {
  return `${origin.replace(/\/$/, '')}${buildResultsPagePath(joinToken, ownerToken, publicResults)}`;
}
