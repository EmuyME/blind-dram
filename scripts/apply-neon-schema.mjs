import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

dotenv.config({ path: resolve(root, '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const schemaPath = resolve(root, 'neon', 'schema.sql');
const schemaSql = readFileSync(schemaPath, 'utf8');

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions'`,
  );
  if (tables.rows.length > 0) {
    console.log('Schema already applied (sessions table exists). Skipping.');
    process.exit(0);
  }

  console.log('Applying Neon schema...');
  await client.query(schemaSql);
  console.log('Schema applied successfully.');
} catch (error) {
  console.error('Schema apply failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
