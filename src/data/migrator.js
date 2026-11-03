import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Arbitrary constant so concurrent deploys don't run migrations at the same time.
const MIGRATION_LOCK_ID = 727274;

/**
 * Applies every *.sql file in `dir` that hasn't been applied yet, in filename order,
 * each in its own transaction. Applied migrations are recorded in schema_migrations.
 * @returns {Promise<string[]>} names of the migrations applied in this run
 */
export async function runMigrations(pool, dir, logger) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

    const applied = [];
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
      }
      logger?.info({ migration: file }, 'Applied migration');
      applied.push(file);
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

/** Executes a raw SQL file (used by the seed script). */
export async function runSqlFile(pool, file) {
  const sql = await readFile(file, 'utf8');
  await pool.query(sql);
}
