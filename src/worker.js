// Standalone worker process: `npm run worker`. Use it with WORKER_ENABLED=false on the
// web process if you want to scale delivery separately from the API.
import { createContainer } from './container.js';

const { logger, database, emailWorker } = createContainer();

emailWorker.start();

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down worker');
  await emailWorker.stop();
  await database.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
