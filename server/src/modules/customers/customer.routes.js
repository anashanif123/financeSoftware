import { Router } from 'express';
import { z } from 'zod';
import { writeAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../config/db.js';

export const router = Router();

const upsertSchema = {
  body: z.object({
    name: z.string().min(1),
    code: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    contactName: z.string().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }
      : {};
    const meta = paginate(req.query, await prisma.customer.count({ where }));
    const data = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: meta.skip,
      take: meta.limit,
      include: { _count: { select: { projects: true, shipments: true, invoices: true } } },
    });
    ok(res, data, meta);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        projects: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { shipments: true, invoices: true } },
      },
    });
    if (!customer) throw ApiError.notFound('Customer not found');
    ok(res, customer);
  }),
);

router.post(
  '/',
  writeAccess,
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.customer.create({ data: req.body });
    created(res, data);
  }),
);

router.patch(
  '/:id',
  writeAccess,
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    ok(res, data);
  }),
);

router.delete(
  '/:id',
  writeAccess,
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: req.params.id } });
    noContent(res);
  }),
);
