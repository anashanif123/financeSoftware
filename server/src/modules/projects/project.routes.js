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

const createSchema = {
  body: z.object({
    name: z.string().min(1),
    code: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    references: z.array(z.string()).optional(),
    status: z.enum(['ACTIVE', 'ON_HOLD', 'ARCHIVED']).optional(),
  }),
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status, customerId } = req.query;
    const where = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const meta = paginate(req.query, await prisma.project.count({ where }));
    const data = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: meta.skip,
      take: meta.limit,
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { shipments: true, invoices: true, documents: true } },
      },
    });
    ok(res, data, meta);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        shipments: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!project) throw ApiError.notFound('Project not found');
    ok(res, project);
  }),
);

router.post(
  '/',
  writeAccess,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.create({ data: req.body });
    await logActivity({
      type: 'PROJECT_CREATED',
      description: `Project "${project.name}" created`,
      entityType: 'Project',
      entityId: project.id,
      actorId: req.user.id,
    });
    created(res, project);
  }),
);

router.patch(
  '/:id',
  writeAccess,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
    await logActivity({
      type: 'PROJECT_UPDATED',
      description: `Project "${project.name}" updated`,
      entityType: 'Project',
      entityId: project.id,
      actorId: req.user.id,
    });
    ok(res, project);
  }),
);

router.post(
  '/:id/archive',
  writeAccess,
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
    ok(res, project);
  }),
);

router.delete(
  '/:id',
  writeAccess,
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: req.params.id } });
    noContent(res);
  }),
);
