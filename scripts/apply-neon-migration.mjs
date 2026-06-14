import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

dotenv.config({ path: resolve(root, '.env.local') });

const migrationName = process.argv[2] || 'alter_age_abv_to_text';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const migrationPath = resolve(root, 'neon', 'migrations', `${migrationName}.sql`);
const migrationSql = readFileSync(migrationPath, 'utf8');

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const col = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'results_ranking_image_url'`,
  );
  if (migrationName === 'add_results_ranking_image_url' && col.rows.length > 0) {
    console.log('Migration already applied (results_ranking_image_url exists). Skipping.');
    process.exit(0);
  }

  if (migrationName === 'alter_age_abv_to_text') {
    const abvCol = await client.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'guessed_abv'`,
    );
    if (abvCol.rows[0]?.data_type === 'text') {
      console.log('Migration already applied (guessed_abv is TEXT). Skipping.');
      process.exit(0);
    }
  }

  console.log(`Applying migration: ${migrationName}...`);
  await client.query(migrationSql);
  console.log('Migration applied successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
