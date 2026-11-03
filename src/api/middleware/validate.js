/**
 * Validates request parts against zod schemas and exposes the parsed values on `req.valid`.
 * Invalid input is answered with 400 here, before any service is called.
 */
export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    const details = [];

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        req.valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ location: part, field: issue.path.join('.') || null, message: issue.message });
        }
      }
    }

    if (details.length) {
      return res.status(400).json({ error: { code: 'validation_error', message: 'Invalid request', details } });
    }
    next();
  };
}
