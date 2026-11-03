import { NotFoundError } from '../models/errors.js';
import { welcomeEmail } from './templates/welcomeEmail.js';

export function createUserService({ database, userRepository, emailService }) {
  return {
    /**
     * Creates the user and queues their welcome email in one transaction:
     * either both rows exist or neither does. Nothing is sent from the request path.
     */
    registerUser({ email, name }) {
      return database.withTransaction(async (tx) => {
        const user = await userRepository.create({ email, name }, tx);
        const welcomeJob = await emailService.enqueue({ ...welcomeEmail(user), userId: user.id }, tx);
        return { user, welcomeJob };
      });
    },

    async getUser(id) {
      const user = await userRepository.findById(id);
      if (!user) throw new NotFoundError(`User ${id} not found`);
      return user;
    },
  };
}
