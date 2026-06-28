import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { adminOnly } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { uploadBuffer } from '../../services/cloudinary.service.js';

export const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Upload a company logo → Cloudinary → save its URL as a setting (used on invoices).
router.post(
  '/logo',
  adminOnly,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file provided');
    const { url } = await uploadBuffer(req.file.buffer, {
      folder: 'branding',
      filename: 'company-logo',
      mimeType: req.file.mimetype,
    });
    await prisma.setting.upsert({
      where: { key: 'companyLogoUrl' },
      create: { key: 'companyLogoUrl', value: url },
      update: { value: url },
    });
    ok(res, { logoUrl: url });
  }),
);

// Key/value settings store. Company identity + commission defaults come from
// env but can be overridden here.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany();
    const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    ok(res, {
      company: {
        name: overrides.companyName ?? env.COMPANY_NAME,
        email: overrides.companyEmail ?? env.COMPANY_EMAIL,
        address: overrides.companyAddress ?? env.COMPANY_ADDRESS,
        logoUrl: overrides.companyLogoUrl ?? env.COMPANY_LOGO_URL ?? null,
      },
      commission: {
        defaultType: overrides.commissionType ?? env.DEFAULT_COMMISSION_TYPE,
        defaultRate: overrides.commissionRate ?? env.DEFAULT_COMMISSION_RATE,
      },
      raw: overrides,
    });
  }),
);

router.put(
  '/:key',
  adminOnly,
  validate({ body: z.object({ value: z.any() }) }),
  asyncHandler(async (req, res) => {
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: req.body.value },
      update: { value: req.body.value },
    });
    ok(res, setting);
  }),
);
