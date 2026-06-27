import { Router } from 'express';
import { z } from 'zod';
import { writeAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../config/db.js';
import { logActivity } from '../../services/activity.service.js';

export const router = Router();

const baseSchema = z.object({
  shipmentNumber: z.string().optional().nullable(),
  containerNumber: z.string().optional().nullable(),
  entryNumber: z.string().optional().nullable(),
  arsNumber: z.string().optional().nullable(),
  nfkRef: z.string().optional().nullable(),
  blNumber: z.string().optional().nullable(),
  masterBill: z.string().optional().nullable(),
  houseBill: z.string().optional().nullable(),
  status: z.enum(['OPEN', 'PROCESSING', 'COMPLETED', 'CLOSED']).optional(),
  originPort: z.string().optional().nullable(),
  destinationPort: z.string().optional().nullable(),
  vessel: z.string().optional().nullable(),
  voyage: z.string().optional().nullable(),
  carrier: z.string().optional().nullable(),
  commodity: z.string().optional().nullable(),
  containerType: z.string().optional().nullable(),
  containerCount: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional().nullable(),
  volumeM3: z.coerce.number().optional().nullable(),
  cartonCount: z.coerce.number().int().optional().nullable(),
  countryOfOrigin: z.string().optional().nullable(),
  sailDate: z.coerce.date().optional().nullable(),
  arrivalDate: z.coerce.date().optional().nullable(),
  entryDate: z.coerce.date().optional().nullable(),
  // A shipment can serve many projects — operator assigns them by id.
  projectIds: z.array(z.string()).optional(),
  customerId: z.string().optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status, projectId, customerId } = req.query;
    const where = {
      ...(status ? { status } : {}),
      ...(projectId ? { projects: { some: { id: projectId } } } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { shipmentNumber: { contains: search, mode: 'insensitive' } },
              { containerNumber: { contains: search, mode: 'insensitive' } },
              { entryNumber: { contains: search, mode: 'insensitive' } },
              { arsNumber: { contains: search, mode: 'insensitive' } },
              { blNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const meta = paginate(req.query, await prisma.shipment.count({ where }));
    const data = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: meta.skip,
      take: meta.limit,
      include: {
        projects: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        _count: { select: { documents: true, invoices: true } },
      },
    });
    ok(res, data, meta);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        projects: { select: { id: true, name: true, code: true } },
        customer: true,
        documents: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        emails: { orderBy: { receivedAt: 'desc' }, take: 20 },
        disputes: true,
      },
    });
    if (!shipment) throw ApiError.notFound('Shipment not found');
    ok(res, shipment);
  }),
);

router.post(
  '/',
  writeAccess,
  validate({ body: baseSchema }),
  asyncHandler(async (req, res) => {
    const { projectIds, ...data } = req.body;
    const shipment = await prisma.shipment.create({
      data: {
        ...data,
        ...(projectIds?.length ? { projects: { connect: projectIds.map((id) => ({ id })) } } : {}),
      },
      include: { projects: { select: { id: true, name: true } } },
    });
    await logActivity({
      type: 'SHIPMENT_CREATED',
      description: `Shipment ${shipment.shipmentNumber || shipment.arsNumber || shipment.id} created`,
      entityType: 'Shipment',
      entityId: shipment.id,
      actorId: req.user.id,
    });
    created(res, shipment);
  }),
);

router.patch(
  '/:id',
  writeAccess,
  validate({ body: baseSchema }),
  asyncHandler(async (req, res) => {
    const { projectIds, ...data } = req.body;
    const shipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        ...data,
        // `set` replaces the whole project list when projectIds is provided.
        ...(projectIds ? { projects: { set: projectIds.map((id) => ({ id })) } } : {}),
      },
      include: { projects: { select: { id: true, name: true } } },
    });
    await logActivity({
      type: 'SHIPMENT_UPDATED',
      description: `Shipment ${shipment.shipmentNumber || shipment.id} updated`,
      entityType: 'Shipment',
      entityId: shipment.id,
      actorId: req.user.id,
    });
    ok(res, shipment);
  }),
);

// Assign (replace) the set of projects this shipment serves — the operator's
// "is shipment ke ye projects hain" step.
router.post(
  '/:id/projects',
  writeAccess,
  validate({ body: z.object({ projectIds: z.array(z.string()) }) }),
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: { projects: { set: req.body.projectIds.map((id) => ({ id })) } },
      include: { projects: { select: { id: true, name: true } } },
    });
    await logActivity({
      type: 'SHIPMENT_UPDATED',
      description: `Projects assigned to shipment ${shipment.shipmentNumber || shipment.id} (${shipment.projects.length})`,
      entityType: 'Shipment',
      entityId: shipment.id,
      actorId: req.user.id,
    });
    ok(res, shipment);
  }),
);

router.delete(
  '/:id',
  writeAccess,
  asyncHandler(async (req, res) => {
    await prisma.shipment.delete({ where: { id: req.params.id } });
    noContent(res);
  }),
);
