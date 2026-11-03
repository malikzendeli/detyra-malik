export function createHealthRepository(pool) {
  return {
    /** Round-trips a trivial query; rejects if the database is unreachable or slower than `timeoutMs`. */
    async ping(timeoutMs) {
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Database ping timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      try {
        await Promise.race([pool.query('SELECT 1'), timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
