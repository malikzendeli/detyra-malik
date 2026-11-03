import express from 'express';
import { pinoHttp } from 'pino-http';
import { emailRoutes } from './routes/emailRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express app. Services are injected so the HTTP layer never touches
 * the database or the mail provider directly (and so it can be tested with fakes).
 */
export function createApp({ services, logger }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  if (logger) {
    app.use(
      pinoHttp({
        logger,
        // Uptime monitors hit /health every minute; keep it out of the logs unless it fails.
        customLogLevel: (req, res, err) =>
          err || res.statusCode >= 500 ? 'error' : req.url === '/health' ? 'silent' : res.statusCode >= 400 ? 'warn' : 'info',
      }),
    );
  }
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => res.json({ name: 'mail-queue-api', health: '/health' }));
  app.use('/health', healthRoutes(services.healthService));
  app.use('/emails', emailRoutes(services.emailService));
  app.use('/users', userRoutes(services.userService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
