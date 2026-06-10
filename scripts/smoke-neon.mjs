import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local') });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const tables = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
);
console.log('Tables:', tables.rows.map((r) => r.tablename).join(', '));
const count = await client.query('SELECT count(*)::int AS n FROM sessions');
console.log('sessions count:', count.rows[0].n);
await client.end();
