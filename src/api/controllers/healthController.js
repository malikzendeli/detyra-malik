export function createHealthController(healthService) {
  return {
    async check(req, res) {
      const { healthy, ...report } = await healthService.check();
      res.set('Cache-Control', 'no-store').status(healthy ? 200 : 503).json(report);
    },
  };
}
