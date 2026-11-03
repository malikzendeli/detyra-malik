export function createHealthService({ healthRepository, logger, app, dbTimeoutMs = 2000 }) {
  return {
    /** @returns {Promise<{healthy: boolean, status: string, app: object, database: object, timestamp: string}>} */
    async check() {
      const started = performance.now();
      let database;
      try {
        await healthRepository.ping(dbTimeoutMs);
        database = { status: 'up', latencyMs: Math.round(performance.now() - started) };
      } catch (err) {
        logger.error({ err }, 'Health check: database unreachable');
        database = { status: 'down', error: 'Database unreachable' };
      }

      const healthy = database.status === 'up';
      return {
        healthy,
        status: healthy ? 'ok' : 'error',
        app: {
          status: 'up',
          name: app.name,
          version: app.version,
          environment: app.environment,
          uptimeSeconds: Math.round(process.uptime()),
        },
        database,
        timestamp: new Date().toISOString(),
      };
    },
  };
}
