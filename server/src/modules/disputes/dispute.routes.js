import { Router } from 'express';
import { z } from 'zod';
import { writeAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../config/db.js';
import { logActivity } from '../../services/activity.service.js';

export const router = Router();

const createSchema = {
  body: z.object({
    title: z.string().min(1),
    type: z.enum(['WRONG_AMOUNT', 'MISSING_CHARGE', 'INVOICE_ISSUE', 'PAYMENT_ISSUE', 'OTHER']).default('OTHER'),
    description: z.string().optional().nullable(),
    invoiceId: z.string().optional().nullable(),
    shipmentId: z.string().optional().nullable(),
    emailId: z.string().optional().nullable(),
  }),
};

const updateSchema = {
  body: z.object({
    status: z.enum(['OPEN', 'REVIEW', 'RESOLVED', 'CLOSED']).optional(),
    resolution: z.string().optional().nullable(),
  }),
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = req.query.status ? { status: req.query.status } : {};
    const meta = paginate(req.query, await prisma.dispute.count({ where }));
    const data = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: meta.skip,
      take: meta.limit,
      include: { invoice: { select: { invoiceNumber: true } } },
    });
    ok(res, data, meta);
  }),
);

router.post(
  '/',
  writeAccess,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const dispute = await prisma.dispute.create({ data: req.body });
    await logActivity({
      type: 'DISPUTE_OPENED',
      description: `Dispute opened: ${dispute.title}`,
      entityType: 'Dispute',
      entityId: dispute.id,
      actorId: req.user.id,
    });
    created(res, dispute);
  }),
);

router.patch(
  '/:id',
  writeAccess,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    if (req.body.status === 'RESOLVED' || req.body.status === 'CLOSED') data.resolvedAt = new Date();
    const dispute = await prisma.dispute.update({ where: { id: req.params.id }, data }).catch(() => {
      throw ApiError.notFound('Dispute not found');
    });
    if (data.resolvedAt) {
      await logActivity({
        type: 'DISPUTE_RESOLVED',
        description: `Dispute resolved: ${dispute.title}`,
        entityType: 'Dispute',
        entityId: dispute.id,
        actorId: req.user.id,
      });
    }
    ok(res, dispute);
  }),
);
