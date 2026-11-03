import { Router } from 'express';
import { createHealthController } from '../controllers/healthController.js';

export function healthRoutes(healthService) {
  const controller = createHealthController(healthService);
  const router = Router();

  router.get('/', controller.check);

  return router;
}
