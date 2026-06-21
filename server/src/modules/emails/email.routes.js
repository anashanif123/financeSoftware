import { Router } from 'express';
import { writeAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../config/db.js';
import { syncInbox } from '../../services/emailProcessor.service.js';

export const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, processed, search } = req.query;
    const where = {
      ...(category ? { category } : {}),
      ...(processed != null ? { processed: processed === 'true' } : {}),
      ...(search
        ? { OR: [{ subject: { contains: search, mode: 'insensitive' } }, { fromAddress: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };
    const meta = paginate(req.query, await prisma.email.count({ where }));
    const data = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip: meta.skip,
      take: meta.limit,
      include: { _count: { select: { documents: true } } },
    });
    ok(res, data, meta);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const email = await prisma.email.findUnique({
      where: { id: req.params.id },
      include: { documents: true, shipment: { select: { id: true, shipmentNumber: true } } },
    });
    if (!email) throw ApiError.notFound('Email not found');
    ok(res, email);
  }),
);

// Trigger an on-demand inbox sync (also runs on a cron — see jobs/).
router.post(
  '/sync',
  writeAccess,
  asyncHandler(async (req, res) => {
    const result = await syncInbox({ query: req.body?.query, max: req.body?.max });
    ok(res, result);
  }),
);
