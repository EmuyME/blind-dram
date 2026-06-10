import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

type Row = Record<string, unknown>;
const neonSql = neon(process.env.DATABASE_URL);

export function sql<T extends Row[] = Row[]>(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<T> {
  return neonSql(strings, ...params) as unknown as Promise<T>;
}

/** Neon は JS 配列を PostgreSQL 配列として送るため、JSONB 列には JSON 文字列を渡す */
export function jsonb(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}
