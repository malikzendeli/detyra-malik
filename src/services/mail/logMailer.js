import { randomUUID } from 'node:crypto';

/**
 * Development-only stand-in used when RESEND_API_KEY is not set.
 * It logs the message instead of sending it, so the queue can be exercised locally.
 */
export function createLogMailer(logger) {
  return {
    async send({ to, subject }) {
      const providerMessageId = `dev-${randomUUID()}`;
      logger.info({ to, subject, providerMessageId }, '[log mailer] Email not actually sent (RESEND_API_KEY unset)');
      return { providerMessageId };
    },
  };
}
