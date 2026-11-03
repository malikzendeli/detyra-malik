import { ConflictError, InvalidStateError, NotFoundError } from '../../models/errors.js';

const STATUS_BY_ERROR = [
  [NotFoundError, 404, 'not_found'],
  [ConflictError, 409, 'conflict'],
  [InvalidStateError, 409, 'invalid_state'],
];

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: `Route ${req.method} ${req.path} not found` } });
}

/** Translates domain errors into HTTP responses. Unknown errors become a generic 500. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  for (const [Type, status, code] of STATUS_BY_ERROR) {
    if (err instanceof Type) {
      return res.status(status).json({ error: { code, message: err.message } });
    }
  }

  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body is too large' } });
  }

  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
}
