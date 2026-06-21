import { ApiError } from '../utils/ApiError.js';

// Role gate. Usage: router.post('/', authenticate, authorize('ADMIN', 'OPS'), handler)
export const authorize =
  (...allowed) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowed.length && !allowed.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };

// Convenience guards
export const adminOnly = authorize('ADMIN');
export const writeAccess = authorize('ADMIN', 'OPS');
