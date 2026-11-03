import { ConflictError } from '../../models/errors.js';
import { PG_UNIQUE_VIOLATION } from '../db.js';

/** @returns {import('../../models/user.js').User} */
function toEntity(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function createUserRepository(pool) {
  return {
    /** @param {import('../../models/user.js').NewUser} user */
    async create(user, db = pool) {
      try {
        const { rows } = await db.query(
          `INSERT INTO users (email, name) VALUES ($1, $2)
           RETURNING id, email, name, created_at`,
          [user.email, user.name],
        );
        return toEntity(rows[0]);
      } catch (err) {
        if (err.code === PG_UNIQUE_VIOLATION) {
          throw new ConflictError(`A user with email ${user.email} already exists`, { cause: err });
        }
        throw err;
      }
    },

    async findById(id, db = pool) {
      const { rows } = await db.query(
        `SELECT id, email, name, created_at FROM users WHERE id = $1`,
        [id],
      );
      return rows[0] ? toEntity(rows[0]) : null;
    },
  };
}
