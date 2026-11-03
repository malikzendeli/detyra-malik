// Load .env when present; in production the platform injects real env vars.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

const env = process.env;

function int(name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  return value;
}

function bool(name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes'].includes(raw.toLowerCase());
}

export const config = Object.freeze({
  env: env.NODE_ENV ?? 'development',
  isProduction: env.NODE_ENV === 'production',
  port: int('PORT', 3000),
  logLevel: env.LOG_LEVEL ?? 'info',
  appName: 'mail-queue-api',
  appVersion: env.npm_package_version ?? '1.0.0',

  db: {
    connectionString: env.DATABASE_URL || undefined,
    host: env.PGHOST,
    port: int('PGPORT', 5432),
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    ssl: bool('PGSSL', false) ? { rejectUnauthorized: false } : false,
    max: int('PG_POOL_MAX', 10),
    connectionTimeoutMillis: int('PG_CONNECTION_TIMEOUT_MS', 3000),
  },

  resend: {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM ?? 'Mail Queue <onboarding@resend.dev>',
  },

  worker: {
    enabled: bool('WORKER_ENABLED', true),
    pollIntervalMs: int('WORKER_POLL_INTERVAL_MS', 2000),
    batchSize: int('WORKER_BATCH_SIZE', 10),
  },

  emailQueue: {
    maxAttempts: int('EMAIL_MAX_ATTEMPTS', 4),
    retryBaseDelayMs: int('EMAIL_RETRY_BASE_DELAY_MS', 5000),
    lockTimeoutMs: int('EMAIL_LOCK_TIMEOUT_MS', 60000),
  },
});
