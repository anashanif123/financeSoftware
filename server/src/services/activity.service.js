import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

// Append-only audit trail. Never throws into the caller — logging an activity
// must never break the business operation that triggered it.
export async function logActivity({
  type,
  description,
  entityType = null,
  entityId = null,
  metadata = null,
  actorId = null,
}) {
  try {
    return await prisma.activity.create({
      data: { type, description, entityType, entityId, metadata, actorId },
    });
  } catch (err) {
    logger.error({ err, type }, 'Failed to write activity');
    return null;
  }
}
