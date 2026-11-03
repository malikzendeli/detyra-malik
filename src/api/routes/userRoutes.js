import { Router } from 'express';
import { createUserController } from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { createUserBody, idParams } from '../validators/schemas.js';

export function userRoutes(userService) {
  const controller = createUserController(userService);
  const router = Router();

  router.post('/', validate({ body: createUserBody }), controller.create);
  router.get('/:id', validate({ params: idParams }), controller.get);

  return router;
}
