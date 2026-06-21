import { Router } from 'express';
import { z } from 'zod';
import { writeAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate } from '../../utils/response.js';
import { recordPayment, listPayments } from './payment.service.js';

export const router = Router();

const createSchema = {
  body: z.object({
    invoiceId: z.string(),
    amount: z.coerce.number().positive(),
    currency: z.string().default('USD'),
    method: z.enum(['WIRE', 'ACH', 'CHECK', 'CARD', 'CASH', 'OTHER']).default('WIRE'),
    reference: z.string().optional().nullable(),
    paidAt: z.coerce.date().optional(),
    notes: z.string().optional().nullable(),
  }),
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const meta = paginate(req.query, 0);
    const { data, total } = await listPayments(req.query, meta);
    ok(res, data, { ...meta, total, totalPages: Math.ceil(total / meta.limit) || 1 });
  }),
);

// Manual payment entry. The Gmail payment detector uses the same service.
router.post(
  '/',
  writeAccess,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    created(res, await recordPayment({ ...req.body, actorId: req.user.id }));
  }),
);
