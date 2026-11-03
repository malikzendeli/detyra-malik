import { NotFoundError, InvalidStateError } from '../models/errors.js';

/**
 * Email queue business logic. Enqueueing only writes a job row; delivery happens later
 * in `processDueJobs`, which the background worker calls on an interval.
 */
export function createEmailService({ emailJobRepository, mailer, logger, queueConfig, now = () => new Date() }) {
  const { maxAttempts, retryBaseDelayMs, lockTimeoutMs } = queueConfig;

  /** Exponential backoff: base, 2x base, 4x base... */
  function retryDelayMs(attempt) {
    return retryBaseDelayMs * 2 ** (attempt - 1);
  }

  async function deliver(job) {
    try {
      const { providerMessageId } = await mailer.send({
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
      });
      await emailJobRepository.markSent(job.id, providerMessageId);
      logger.info({ jobId: job.id, attempt: job.attempts, providerMessageId }, 'Email sent');
      return 'sent';
    } catch (err) {
      const error = err.message || String(err);

      if (job.attempts >= job.maxAttempts) {
        await emailJobRepository.markFailed(job.id, error);
        logger.error({ jobId: job.id, attempt: job.attempts, err }, 'Email failed permanently');
        return 'failed';
      }

      const nextAttemptAt = new Date(now().getTime() + retryDelayMs(job.attempts));
      await emailJobRepository.scheduleRetry(job.id, { error, nextAttemptAt });
      logger.warn({ jobId: job.id, attempt: job.attempts, nextAttemptAt, err }, 'Email failed, retry scheduled');
      return 'retried';
    }
  }

  return {
    /**
     * Adds an email to the queue. Pass `db` (a transaction client) to enqueue atomically
     * with other writes.
     */
    enqueue({ to, subject, html, text, userId }, db) {
      return emailJobRepository.enqueue({ to, subject, html, text, userId, maxAttempts }, db);
    },

    async getJob(id) {
      const job = await emailJobRepository.findById(id);
      if (!job) throw new NotFoundError(`Email job ${id} not found`);
      return job;
    },

    listJobs({ status, limit, offset }) {
      return emailJobRepository.list({ status, limit, offset });
    },

    getQueueStats() {
      return emailJobRepository.countByStatus();
    },

    async retryFailedJob(id) {
      const job = await emailJobRepository.requeue(id);
      if (job) return job;
      const existing = await emailJobRepository.findById(id);
      if (!existing) throw new NotFoundError(`Email job ${id} not found`);
      throw new InvalidStateError(`Only failed jobs can be retried; job ${id} is ${existing.status}`);
    },

    /**
     * Claims due jobs and tries to deliver each one.
     * @returns {Promise<{claimed: number, sent: number, retried: number, failed: number}>}
     */
    async processDueJobs(batchSize) {
      const abandoned = await emailJobRepository.failAbandonedJobs();
      if (abandoned > 0) logger.warn({ count: abandoned }, 'Marked abandoned jobs as failed');

      const jobs = await emailJobRepository.claimDueJobs({ limit: batchSize, lockTimeoutMs });
      const summary = { claimed: jobs.length, sent: 0, retried: 0, failed: 0 };
      const outcomes = await Promise.allSettled(jobs.map(deliver));

      for (const [i, outcome] of outcomes.entries()) {
        if (outcome.status === 'fulfilled') {
          summary[outcome.value] += 1;
        } else {
          // Status update itself failed (e.g. DB blip). The lock expires and the job is picked up again.
          logger.error({ jobId: jobs[i].id, err: outcome.reason }, 'Could not record delivery outcome');
        }
      }
      return summary;
    },
  };
}
