// Composition root: the only module that wires all layers together.
import { config } from './config.js';
import { logger } from './logger.js';
import { createDatabase } from './data/db.js';
import { createEmailJobRepository } from './data/repositories/emailJobRepository.js';
import { createHealthRepository } from './data/repositories/healthRepository.js';
import { createUserRepository } from './data/repositories/userRepository.js';
import { createEmailService } from './services/emailService.js';
import { createHealthService } from './services/healthService.js';
import { createUserService } from './services/userService.js';
import { createLogMailer } from './services/mail/logMailer.js';
import { createResendMailer } from './services/mail/resendMailer.js';
import { createEmailWorker } from './worker/emailWorker.js';

function createMailer() {
  if (config.resend.apiKey) return createResendMailer(config.resend);
  if (config.isProduction) throw new Error('RESEND_API_KEY is required in production');
  logger.warn('RESEND_API_KEY not set: using the log mailer, emails will NOT be delivered');
  return createLogMailer(logger);
}

export function createContainer({ withMailer = true } = {}) {
  const database = createDatabase(config.db, logger);

  const repositories = {
    emailJobRepository: createEmailJobRepository(database.pool),
    userRepository: createUserRepository(database.pool),
    healthRepository: createHealthRepository(database.pool),
  };

  // The web process only needs a mailer when it also runs the worker.
  const mailer = withMailer ? createMailer() : null;

  const emailService = createEmailService({
    emailJobRepository: repositories.emailJobRepository,
    mailer,
    logger,
    queueConfig: config.emailQueue,
  });

  const services = {
    emailService,
    userService: createUserService({ database, userRepository: repositories.userRepository, emailService }),
    healthService: createHealthService({
      healthRepository: repositories.healthRepository,
      logger,
      app: { name: config.appName, version: config.appVersion, environment: config.env },
    }),
  };

  const emailWorker = createEmailWorker({
    emailService,
    logger,
    pollIntervalMs: config.worker.pollIntervalMs,
    batchSize: config.worker.batchSize,
  });

  return { config, logger, database, services, emailWorker };
}
