import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { logger } from '../src/logger.js';
import { createDatabase } from '../src/data/db.js';
import { runSqlFile } from '../src/data/migrator.js';

const file = fileURLToPath(new URL('../db/seeds/seed.sql', import.meta.url));
const db = createDatabase(config.db, logger);

try {
  await runSqlFile(db.pool, file);
  logger.info('Seed data loaded');
} catch (err) {
  logger.error({ err }, 'Seeding failed (did you run `npm run migrate` first?)');
  process.exitCode = 1;
} finally {
  await db.close();
}
