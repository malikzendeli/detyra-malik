import { Router } from 'express';
import { createEmailController } from '../controllers/emailController.js';
import { validate } from '../middleware/validate.js';
import { createEmailBody, idParams, listEmailsQuery } from '../validators/schemas.js';

export function emailRoutes(emailService) {
  const controller = createEmailController(emailService);
  const router = Router();

  router.post('/', validate({ body: createEmailBody }), controller.create);
  router.get('/', validate({ query: listEmailsQuery }), controller.list);
  router.get('/stats', controller.stats);
  router.get('/:id', validate({ params: idParams }), controller.get);
  router.post('/:id/retry', validate({ params: idParams }), controller.retry);

  return router;
}
