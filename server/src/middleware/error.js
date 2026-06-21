import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

// 404 for unmatched routes.
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error translator → consistent JSON error envelope.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.flatten().fieldErrors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid database query';
  }

  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  } else {
    logger.warn({ msg: message, path: req.originalUrl }, 'Request error');
  }

  res.status(statusCode).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
    ...(isProd ? {} : { stack: err.stack }),
  });
}
