CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on PostgreSQL < 13

CREATE TABLE users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
