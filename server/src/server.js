import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDb, disconnectDb } from './config/db.js';
import { startJobs, stopJobs } from './jobs/index.js';

async function main() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Clearway API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Background cron jobs (gmail sync, payment matching, overdue sweep)
  startJobs();

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    stopJobs();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Force-exit if cleanup hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled rejection'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
