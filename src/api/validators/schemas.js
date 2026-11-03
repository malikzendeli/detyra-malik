import { z } from 'zod';
import { EMAIL_JOB_STATUSES } from '../../models/emailJob.js';

export const idParams = z.object({
  id: z.uuid({ message: 'id must be a valid UUID' }),
});

export const createEmailBody = z
  .object({
    to: z.email(),
    subject: z.string().trim().min(1).max(998),
    html: z.string().min(1).max(500_000).optional(),
    text: z.string().min(1).max(500_000).optional(),
  })
  .strict()
  .refine((b) => b.html || b.text, { message: 'Provide at least one of "html" or "text"', path: ['html'] });

export const listEmailsQuery = z.object({
  status: z.enum(EMAIL_JOB_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createUserBody = z
  .object({
    email: z.email(),
    name: z.string().trim().min(1).max(200),
  })
  .strict();
