import { toEmailJobDto } from '../../models/emailJob.js';
import { toUserDto } from '../../models/user.js';

export function createUserController(userService) {
  return {
    async create(req, res) {
      const { user, welcomeJob } = await userService.registerUser(req.valid.body);
      res
        .status(201)
        .location(`/users/${user.id}`)
        .json({ data: { user: toUserDto(user), welcomeEmail: toEmailJobDto(welcomeJob) } });
    },

    async get(req, res) {
      const user = await userService.getUser(req.valid.params.id);
      res.json({ data: toUserDto(user) });
    },
  };
}
