import type { ScoringConfig } from '@/lib/score-calculator';

export function toScoringConfig(raw: unknown): ScoringConfig | null | undefined {
  if (raw === null || raw === undefined) return raw;
  return raw as ScoringConfig;
}

export function tier1ListFromFlavorChart(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const tier1 = (raw as { tier1?: unknown }).tier1;
  if (!Array.isArray(tier1)) return [];
  return tier1.filter((x): x is string => typeof x === 'string');
}

export type AnswerFlavorSection = {
  tier1_tags?: string[];
  tier2_terms?: string[];
  text?: string | null;
} | null;

export function getAnswerSectionFlavor(
  answer: { nose?: unknown; palate?: unknown; finish?: unknown },
  section: 'nose' | 'palate' | 'finish',
): AnswerFlavorSection {
  const raw = answer[section];
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const tier1_tags = Array.isArray(o.tier1_tags)
    ? o.tier1_tags.filter((t): t is string => typeof t === 'string')
    : undefined;
  const tier2_terms = Array.isArray(o.tier2_terms)
    ? o.tier2_terms.filter((t): t is string => typeof t === 'string')
    : undefined;
  const text =
    o.text === null || typeof o.text === 'string' ? (o.text as string | null) : undefined;
  return { tier1_tags, tier2_terms, text: text ?? null };
}
