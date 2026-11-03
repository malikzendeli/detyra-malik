import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/api/app.js';
import { NotFoundError } from '../src/models/errors.js';

const ID = '5f0c3b1e-8f4a-4c55-9d1e-2b7a3c9d0e11';

function appWith({ healthy = true, emailService = {} } = {}) {
  const services = {
    healthService: {
      async check() {
        return {
          healthy,
          status: healthy ? 'ok' : 'error',
          app: { status: 'up' },
          database: healthy ? { status: 'up', latencyMs: 1 } : { status: 'down', error: 'Database unreachable' },
        };
      },
    },
    emailService,
    userService: {},
  };
  return createApp({ services });
}

test('GET /health returns 200 when the database is up', async () => {
  const res = await request(appWith()).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database.status, 'up');
  assert.equal(res.body.healthy, undefined);
});

test('GET /health returns 503 when the database is down', async () => {
  const res = await request(appWith({ healthy: false })).get('/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.database.status, 'down');
  assert.equal(res.body.app.status, 'up');
});

test('POST /emails enqueues and answers 202', async () => {
  let received;
  const emailService = {
    async enqueue(input) {
      received = input;
      return { id: ID, ...input, status: 'pending', attempts: 0, maxAttempts: 4, nextAttemptAt: new Date() };
    },
  };
  const res = await request(appWith({ emailService }))
    .post('/emails')
    .send({ to: 'delivered@resend.dev', subject: 'Hello', text: 'Hi there' });

  assert.equal(res.status, 202);
  assert.equal(res.headers.location, `/emails/${ID}`);
  assert.equal(res.body.data.status, 'pending');
  assert.deepEqual(received, { to: 'delivered@resend.dev', subject: 'Hello', text: 'Hi there' });
});

test('POST /emails rejects invalid input with 400 before reaching the service', async () => {
  const emailService = { async enqueue() { throw new Error('should not be called'); } };
  const res = await request(appWith({ emailService })).post('/emails').send({ to: 'not-an-email', subject: '' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_error');
  const fields = res.body.error.details.map((d) => d.field);
  assert.ok(fields.includes('to'));
  assert.ok(fields.includes('subject'));
});

test('malformed JSON returns 400', async () => {
  const res = await request(appWith()).post('/emails').set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'invalid_json');
});

test('domain NotFoundError maps to 404', async () => {
  const emailService = { async getJob() { throw new NotFoundError('nope'); } };
  const res = await request(appWith({ emailService })).get(`/emails/${ID}`);
  assert.equal(res.status, 404);
});

test('invalid UUID returns 400', async () => {
  const res = await request(appWith()).get('/emails/123');
  assert.equal(res.status, 400);
});
