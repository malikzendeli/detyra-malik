/**
 * Polling loop that drains the email queue. It holds no business logic: each tick calls
 * emailService.processDueJobs, which claims jobs, sends them through Resend and records
 * the outcome. When a full batch was processed it polls again immediately.
 */
export function createEmailWorker({ emailService, logger, pollIntervalMs, batchSize }) {
  let timer = null;
  let running = false;
  let currentTick = null;

  async function tick() {
    let claimed = 0;
    try {
      const summary = await emailService.processDueJobs(batchSize);
      claimed = summary.claimed;
      if (claimed > 0) logger.info(summary, 'Email worker processed batch');
    } catch (err) {
      logger.error({ err }, 'Email worker tick failed');
    }
    if (running) {
      timer = setTimeout(runTick, claimed === batchSize ? 0 : pollIntervalMs);
    }
  }

  function runTick() {
    currentTick = tick();
  }

  return {
    start() {
      if (running) return;
      running = true;
      logger.info({ pollIntervalMs, batchSize }, 'Email worker started');
      runTick();
    },

    /** Stops polling and waits for the in-flight batch to finish. */
    async stop() {
      running = false;
      clearTimeout(timer);
      await currentTick;
      logger.info('Email worker stopped');
    },
  };
}
