import { EmailJobStatus } from '../../models/emailJob.js';

const COLUMNS = `
  id, to_email, subject, html, text, status, attempts, max_attempts, last_error,
  provider_message_id, user_id, next_attempt_at, sent_at, created_at, updated_at`;

/** @returns {import('../../models/emailJob.js').EmailJob} */
function toEntity(row) {
  return {
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    html: row.html,
    text: row.text,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    providerMessageId: row.provider_message_id,
    userId: row.user_id,
    nextAttemptAt: row.next_attempt_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * All methods accept an optional `db` executor so services can run them inside a transaction.
 */
export function createEmailJobRepository(pool) {
  return {
    /** @param {import('../../models/emailJob.js').NewEmailJob} job */
    async enqueue(job, db = pool) {
      const { rows } = await db.query(
        `INSERT INTO email_jobs (to_email, subject, html, text, max_attempts, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUMNS}`,
        [job.to, job.subject, job.html ?? null, job.text ?? null, job.maxAttempts, job.userId ?? null],
      );
      return toEntity(rows[0]);
    },

    async findById(id, db = pool) {
      const { rows } = await db.query(`SELECT ${COLUMNS} FROM email_jobs WHERE id = $1`, [id]);
      return rows[0] ? toEntity(rows[0]) : null;
    },

    async list({ status, limit, offset }, db = pool) {
      const { rows } = await db.query(
        `SELECT ${COLUMNS} FROM email_jobs
         WHERE ($1::email_job_status IS NULL OR status = $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [status ?? null, limit, offset],
      );
      return rows.map(toEntity);
    },

    async countByStatus(db = pool) {
      const { rows } = await db.query(
        `SELECT status, count(*)::int AS count FROM email_jobs GROUP BY status`,
      );
      const counts = Object.fromEntries(Object.values(EmailJobStatus).map((s) => [s, 0]));
      for (const row of rows) counts[row.status] = row.count;
      return counts;
    },

    /**
     * Atomically claims up to `limit` due jobs and increments their attempt counter.
     * FOR UPDATE SKIP LOCKED lets several workers poll the same table without
     * double-processing; `locked_until` lets another worker pick the job up again
     * if the one holding it crashes.
     */
    async claimDueJobs({ limit, lockTimeoutMs }, db = pool) {
      const { rows } = await db.query(
        `UPDATE email_jobs
            SET attempts     = attempts + 1,
                locked_until = now() + make_interval(secs => $2::double precision / 1000),
                updated_at   = now()
          WHERE id IN (
                SELECT id FROM email_jobs
                 WHERE status = 'pending'
                   AND next_attempt_at <= now()
                   AND attempts < max_attempts
                   AND (locked_until IS NULL OR locked_until < now())
                 ORDER BY next_attempt_at
                 LIMIT $1
                 FOR UPDATE SKIP LOCKED)
        RETURNING ${COLUMNS}`,
        [limit, lockTimeoutMs],
      );
      return rows.map(toEntity);
    },

    async markSent(id, providerMessageId, db = pool) {
      await db.query(
        `UPDATE email_jobs
            SET status = 'sent', provider_message_id = $2, sent_at = now(),
                last_error = NULL, locked_until = NULL, updated_at = now()
          WHERE id = $1`,
        [id, providerMessageId],
      );
    },

    async scheduleRetry(id, { error, nextAttemptAt }, db = pool) {
      await db.query(
        `UPDATE email_jobs
            SET last_error = $2, next_attempt_at = $3, locked_until = NULL, updated_at = now()
          WHERE id = $1`,
        [id, error, nextAttemptAt],
      );
    },

    async markFailed(id, error, db = pool) {
      await db.query(
        `UPDATE email_jobs
            SET status = 'failed', last_error = $2, locked_until = NULL, updated_at = now()
          WHERE id = $1`,
        [id, error],
      );
    },

    /**
     * Fails jobs whose worker died during their final attempt (lock expired, no attempts left).
     * @returns {Promise<number>} number of jobs marked failed
     */
    async failAbandonedJobs(db = pool) {
      const { rowCount } = await db.query(
        `UPDATE email_jobs
            SET status = 'failed',
                last_error = coalesce(last_error, 'Worker stopped during final attempt'),
                locked_until = NULL, updated_at = now()
          WHERE status = 'pending'
            AND attempts >= max_attempts
            AND locked_until < now()`,
      );
      return rowCount;
    },

    /** Puts a failed job back in the queue with a fresh attempt budget. */
    async requeue(id, db = pool) {
      const { rows } = await db.query(
        `UPDATE email_jobs
            SET status = 'pending', attempts = 0, next_attempt_at = now(),
                locked_until = NULL, updated_at = now()
          WHERE id = $1 AND status = 'failed'
        RETURNING ${COLUMNS}`,
        [id],
      );
      return rows[0] ? toEntity(rows[0]) : null;
    },
  };
}
