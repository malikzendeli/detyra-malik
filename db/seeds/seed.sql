-- Demo data. Idempotent: safe to run more than once.
-- Seeded jobs are already in a final state (sent / failed) so the worker does not
-- try to deliver them; use POST /emails/:id/retry on the failed one to see a retry.

INSERT INTO users (id, email, name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.com',   'Ada Lovelace'),
  ('22222222-2222-4222-8222-222222222222', 'grace@example.com', 'Grace Hopper'),
  ('33333333-3333-4333-8333-333333333333', 'alan@example.com',  'Alan Turing')
ON CONFLICT (id) DO NOTHING;

INSERT INTO email_jobs
  (id, to_email, subject, html, text, status, attempts, max_attempts,
   last_error, provider_message_id, user_id, sent_at)
VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'ada@example.com', 'Welcome, Ada!',
   '<p>Welcome aboard, Ada.</p>', 'Welcome aboard, Ada.', 'sent', 1, 4,
   NULL, 'seed-message-0001', '11111111-1111-4111-8111-111111111111', now() - interval '2 days'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'grace@example.com', 'Welcome, Grace!',
   '<p>Welcome aboard, Grace.</p>', 'Welcome aboard, Grace.', 'sent', 2, 4,
   NULL, 'seed-message-0002', '22222222-2222-4222-8222-222222222222', now() - interval '1 day'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'delivered@resend.dev', 'Monthly report',
   NULL, 'Your monthly report is ready.', 'failed', 4, 4,
   'Resend API returned 503 Service Unavailable', NULL, '33333333-3333-4333-8333-333333333333', NULL)
ON CONFLICT (id) DO NOTHING;
