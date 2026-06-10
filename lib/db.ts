import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

type Row = Record<string, unknown>;

let neonSql: NeonQueryFunction<false, false> | null = null;

function getNeonSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL environment variable');
  }
  if (!neonSql) {
    neonSql = neon(url);
  }
  return neonSql;
}

export function sql<T extends Row[] = Row[]>(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<T> {
  return getNeonSql()(strings, ...params) as unknown as Promise<T>;
}

/** Neon は JS 配列を PostgreSQL 配列として送るため、JSONB 列には JSON 文字列を渡す */
export function jsonb(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}
