// Validate req against a Zod schema map { body, query, params }.
// Replaces the request parts with parsed (coerced) values.
export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  } catch (err) {
    next(err); // ZodError handled centrally
  }
};
