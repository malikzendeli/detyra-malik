// Domain errors. They carry no HTTP knowledge; the api layer maps them to status codes.

export class DomainError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {}

/** A unique constraint was violated (e.g. duplicate email). */
export class ConflictError extends DomainError {}

/** The operation is not allowed in the entity's current state. */
export class InvalidStateError extends DomainError {}

/** The mail provider rejected or failed to accept a message. */
export class MailDeliveryError extends DomainError {
  constructor(message, { code, cause } = {}) {
    super(message, { cause });
    this.code = code ?? 'unknown';
  }
}
