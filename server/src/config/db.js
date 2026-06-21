import { PrismaClient } from '@prisma/client';
import { isDev } from './env.js';
import { logger } from './logger.js';

// Single Prisma instance, reused across hot-reloads in dev.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error'],
  });

if (isDev) globalForPrisma.prisma = prisma;

export async function connectDb() {
  try {
    await prisma.$connect();
    logger.info('🗄️  Database connected');
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    throw err;
  }
}

export async function disconnectDb() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
