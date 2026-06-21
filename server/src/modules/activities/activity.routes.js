import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginate } from '../../utils/response.js';
import { prisma } from '../../config/db.js';

export const router = Router();

// Activity timeline (Module 15). Filter by entity to power per-record timelines.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { entityType, entityId, type } = req.query;
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(type ? { type } : {}),
    };
    const meta = paginate(req.query, await prisma.activity.count({ where }));
    const data = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: meta.skip,
      take: meta.limit,
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    });
    ok(res, data, meta);
  }),
);
