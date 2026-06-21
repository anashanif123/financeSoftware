import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { features } from '../config/env.js';
import { syncInbox } from '../services/emailProcessor.service.js';
import { prisma } from '../config/db.js';

const tasks = [];

// Module 3/4/13: poll Gmail and process new mail every 5 minutes.
function scheduleGmailSync() {
  if (!features.gmail) {
    logger.warn('Gmail not configured — inbox sync job disabled');
    return;
  }
  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await syncInbox({ query: 'newer_than:1d', max: 25 });
      if (result.processed) logger.info({ result }, 'Gmail sync processed new emails');
    } catch (err) {
      logger.error({ err }, 'Scheduled Gmail sync failed');
    }
  });
  tasks.push(task);
}

// Daily: flag invoices past their due date as OVERDUE.
function scheduleOverdueSweep() {
  const task = cron.schedule('0 2 * * *', async () => {
    try {
      const { count } = await prisma.invoice.updateMany({
        where: { status: { in: ['SENT', 'PENDING', 'PARTIALLY_PAID'] }, dueDate: { lt: new Date() } },
        data: { status: 'OVERDUE' },
      });
      if (count) logger.info({ count }, 'Marked invoices overdue');
    } catch (err) {
      logger.error({ err }, 'Overdue sweep failed');
    }
  });
  tasks.push(task);
}

export function startJobs() {
  scheduleGmailSync();
  scheduleOverdueSweep();
  logger.info(`⏱️  ${tasks.length} background job(s) scheduled`);
}

export function stopJobs() {
  tasks.forEach((t) => t.stop());
}
