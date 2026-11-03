import pg from 'pg';

/**
 * Creates the connection pool. Every SQL statement in the app goes through this module
 * or a repository that receives the pool / a transaction client from it.
 */
export function createDatabase(dbConfig, logger) {
  const pool = new pg.Pool(dbConfig);

  // An idle client erroring (e.g. DB restart) must not crash the process.
  pool.on('error', (err) => logger?.error({ err }, 'Unexpected error on idle PostgreSQL client'));

  return {
    pool,

    /** Runs `fn(client)` inside BEGIN/COMMIT, rolling back on error. */
    async withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    close() {
      return pool.end();
    },
  };
}

export const PG_UNIQUE_VIOLATION = '23505';
