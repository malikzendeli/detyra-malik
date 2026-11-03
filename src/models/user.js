/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {Date} createdAt
 */

/**
 * @typedef {object} NewUser
 * @property {string} email
 * @property {string} name
 */

export function toUserDto(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
