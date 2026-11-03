import { randomUUID } from 'node:crypto';
import { MailDeliveryError } from '../../models/errors.js';

/**
 * Development-only stand-in used when RESEND_API_KEY is not set.
 * It logs the message instead of sending it, so the queue can be exercised locally.
 * Recipients ending in @fail.test always fail, to demo the retry flow.
 */
export function createLogMailer(logger) {
  return {
    async send({ to, subject }) {
      if (to.toLowerCase().endsWith('@fail.test')) {
        throw new MailDeliveryError(`[log mailer] Simulated failure for ${to}`, { code: 'simulated_failure' });
      }
      const providerMessageId = `dev-${randomUUID()}`;
      logger.info({ to, subject, providerMessageId }, '[log mailer] Email not actually sent (RESEND_API_KEY unset)');
      return { providerMessageId };
    },
  };
}
