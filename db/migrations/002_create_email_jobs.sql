CREATE TYPE email_job_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE email_jobs (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email            text             NOT NULL,
  subject             text             NOT NULL,
  html                text,
  text                text,
  status              email_job_status NOT NULL DEFAULT 'pending',
  attempts            integer          NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts        integer          NOT NULL DEFAULT 4 CHECK (max_attempts > 0),
  last_error          text,
  provider_message_id text,
  user_id             uuid             REFERENCES users (id) ON DELETE SET NULL,
  next_attempt_at     timestamptz      NOT NULL DEFAULT now(),
  locked_until        timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now(),
  CONSTRAINT email_jobs_has_body CHECK (html IS NOT NULL OR text IS NOT NULL)
);

-- The worker's polling query only ever looks at pending jobs ordered by due time.
CREATE INDEX email_jobs_due_idx ON email_jobs (next_attempt_at) WHERE status = 'pending';
CREATE INDEX email_jobs_status_created_idx ON email_jobs (status, created_at DESC);
CREATE INDEX email_jobs_user_idx ON email_jobs (user_id);
