import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { router as apiRouter } from './modules/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security + parsing
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }),
  );

  // Liveness probe (no auth, no rate limit)
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: 'clearway-api', time: new Date().toISOString() }),
  );

  // Versioned API
  app.use('/api/v1', apiRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
