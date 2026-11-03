export const EmailJobStatus = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
});

export const EMAIL_JOB_STATUSES = Object.values(EmailJobStatus);

/**
 * @typedef {object} EmailJob
 * @property {string} id
 * @property {string} to
 * @property {string} subject
 * @property {string|null} html
 * @property {string|null} text
 * @property {'pending'|'sent'|'failed'} status
 * @property {number} attempts
 * @property {number} maxAttempts
 * @property {string|null} lastError
 * @property {string|null} providerMessageId
 * @property {string|null} userId
 * @property {Date} nextAttemptAt
 * @property {Date|null} sentAt
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {object} NewEmailJob
 * @property {string} to
 * @property {string} subject
 * @property {string} [html]
 * @property {string} [text]
 * @property {number} maxAttempts
 * @property {string} [userId]
 */

/** Public representation returned by the API. */
export function toEmailJobDto(job) {
  return {
    id: job.id,
    to: job.to,
    subject: job.subject,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    lastError: job.lastError,
    providerMessageId: job.providerMessageId,
    userId: job.userId,
    nextAttemptAt: job.status === EmailJobStatus.PENDING ? job.nextAttemptAt : null,
    sentAt: job.sentAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
