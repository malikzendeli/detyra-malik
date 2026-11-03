import { toEmailJobDto } from '../../models/emailJob.js';

export function createEmailController(emailService) {
  return {
    /** Enqueues only. 202 Accepted: the worker delivers it asynchronously. */
    async create(req, res) {
      const job = await emailService.enqueue(req.valid.body);
      res.status(202).location(`/emails/${job.id}`).json({ data: toEmailJobDto(job) });
    },

    async list(req, res) {
      const { status, limit, offset } = req.valid.query;
      const jobs = await emailService.listJobs({ status, limit, offset });
      res.json({ data: jobs.map(toEmailJobDto), pagination: { limit, offset, count: jobs.length } });
    },

    async stats(req, res) {
      res.json({ data: await emailService.getQueueStats() });
    },

    async get(req, res) {
      const job = await emailService.getJob(req.valid.params.id);
      res.json({ data: toEmailJobDto(job) });
    },

    async retry(req, res) {
      const job = await emailService.retryFailedJob(req.valid.params.id);
      res.status(202).json({ data: toEmailJobDto(job) });
    },
  };
}
