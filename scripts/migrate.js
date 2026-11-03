import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { logger } from '../src/logger.js';
import { createDatabase } from '../src/data/db.js';
import { runMigrations } from '../src/data/migrator.js';

const dir = fileURLToPath(new URL('../db/migrations/', import.meta.url));
const db = createDatabase(config.db, logger);

try {
  const applied = await runMigrations(db.pool, dir, logger);
  logger.info({ count: applied.length }, applied.length ? 'Migrations complete' : 'Database already up to date');
} catch (err) {
  logger.error({ err }, 'Migration failed');
  process.exitCode = 1;
} finally {
  await db.close();
}
