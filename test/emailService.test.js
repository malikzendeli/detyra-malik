import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmailService } from '../src/services/emailService.js';
import { InvalidStateError, NotFoundError } from '../src/models/errors.js';

const silentLogger = { info() {}, warn() {}, error() {} };
const NOW = new Date('2026-01-01T00:00:00Z');
const queueConfig = { maxAttempts: 4, retryBaseDelayMs: 1000, lockTimeoutMs: 60_000 };

function job(overrides = {}) {
  return { id: 'job-1', to: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>', text: null, attempts: 1, maxAttempts: 4, status: 'pending', ...overrides };
}

function fakeRepo(claimed = []) {
  const calls = [];
  return {
    calls,
    async failAbandonedJobs() { return 0; },
    async claimDueJobs(args) { calls.push(['claimDueJobs', args]); return claimed; },
    async markSent(...args) { calls.push(['markSent', ...args]); },
    async scheduleRetry(...args) { calls.push(['scheduleRetry', ...args]); },
    async markFailed(...args) { calls.push(['markFailed', ...args]); },
    async enqueue(j) { calls.push(['enqueue', j]); return { id: 'new', ...j }; },
    async requeue() { return null; },
    async findById(id) { return id === 'sent-job' ? job({ id, status: 'sent' }) : null; },
  };
}

const okMailer = { async send() { return { providerMessageId: 're_123' }; } };
const failingMailer = { async send() { throw new Error('Resend 503'); } };

function service(repo, mailer) {
  return createEmailService({ emailJobRepository: repo, mailer, logger: silentLogger, queueConfig, now: () => NOW });
}

test('enqueue stores the job with the configured attempt budget and does not send', async () => {
  const repo = fakeRepo();
  let sent = false;
  await service(repo, { async send() { sent = true; } }).enqueue({ to: 'a@example.com', subject: 's', text: 't' });
  assert.equal(sent, false);
  assert.equal(repo.calls[0][1].maxAttempts, 4);
});

test('a successful delivery marks the job as sent', async () => {
  const repo = fakeRepo([job()]);
  const summary = await service(repo, okMailer).processDueJobs(10);
  assert.deepEqual(summary, { claimed: 1, sent: 1, retried: 0, failed: 0 });
  assert.deepEqual(repo.calls.at(-1), ['markSent', 'job-1', 're_123']);
});

test('a failure with attempts left schedules a retry with exponential backoff', async () => {
  const repo = fakeRepo([job({ attempts: 3 })]);
  const summary = await service(repo, failingMailer).processDueJobs(10);
  assert.equal(summary.retried, 1);
  const [name, id, { error, nextAttemptAt }] = repo.calls.at(-1);
  assert.equal(name, 'scheduleRetry');
  assert.equal(id, 'job-1');
  assert.equal(error, 'Resend 503');
  assert.equal(nextAttemptAt.getTime() - NOW.getTime(), 4000); // 1000 * 2^(3-1)
});

test('the final failed attempt marks the job as failed (1 try + 3 retries)', async () => {
  const repo = fakeRepo([job({ attempts: 4 })]);
  const summary = await service(repo, failingMailer).processDueJobs(10);
  assert.equal(summary.failed, 1);
  assert.deepEqual(repo.calls.at(-1), ['markFailed', 'job-1', 'Resend 503']);
});

test('retryFailedJob distinguishes missing jobs from jobs in the wrong state', async () => {
  const svc = service(fakeRepo(), okMailer);
  await assert.rejects(svc.retryFailedJob('missing'), NotFoundError);
  await assert.rejects(svc.retryFailedJob('sent-job'), InvalidStateError);
});
