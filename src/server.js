import { createApp } from './api/app.js';
import { config } from './config.js';
import { createContainer } from './container.js';

const { logger, database, services, emailWorker } = createContainer({ withMailer: config.worker.enabled });

const app = createApp({ services, logger });
const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.env }, 'HTTP server listening');
});

if (config.worker.enabled) emailWorker.start();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  await new Promise((resolve) => server.close(resolve));
  await emailWorker.stop();
  await database.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
