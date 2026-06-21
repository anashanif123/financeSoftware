import { Router } from 'express';
import multer from 'multer';
import { writeAccess } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../config/db.js';
import { uploadBuffer, deleteAsset, pageImageUrls } from '../../services/cloudinary.service.js';
import { extractDocumentData, extractDocumentDataFromImages } from '../../services/openai.service.js';
import { extractPdfText, hasUsableText, isPdf, isImage, reviewStatusFor } from '../../services/documentText.service.js';
import { logActivity } from '../../services/activity.service.js';

export const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, shipmentId, projectId, search, reviewStatus } = req.query;
    const where = {
      ...(type ? { type } : {}),
      ...(shipmentId ? { shipmentId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(reviewStatus ? { reviewStatus } : {}),
      ...(search ? { fileName: { contains: search, mode: 'insensitive' } } : {}),
    };
    const meta = paginate(req.query, await prisma.document.count({ where }));
    const data = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: meta.skip,
      take: meta.limit,
      include: {
        shipment: { select: { id: true, shipmentNumber: true } },
        uploadedBy: { select: { name: true } },
      },
    });
    ok(res, data, meta);
  }),
);

// Review queue — documents whose AI extraction needs a human before it feeds an
// invoice (low confidence, or extraction failed). Newest first.
router.get(
  '/review/queue',
  asyncHandler(async (req, res) => {
    const where = { reviewStatus: 'PENDING' };
    const meta = paginate(req.query, await prisma.document.count({ where }));
    const data = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: meta.skip,
      take: meta.limit,
      include: {
        shipment: { select: { id: true, shipmentNumber: true, arsNumber: true } },
        email: { select: { id: true, subject: true, fromAddress: true } },
      },
    });
    ok(res, data, meta);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { shipment: true } });
    if (!doc) throw ApiError.notFound('Document not found');
    ok(res, doc);
  }),
);

// Review a queued document: body { action: 'approve' | 'reject', note?, extractedData? }.
// On approve, an optional human-corrected `extractedData` replaces the AI's guess
// before it is trusted downstream.
router.post(
  '/:id/review',
  writeAccess,
  asyncHandler(async (req, res) => {
    const { action, note, extractedData } = req.body || {};
    if (!['approve', 'reject'].includes(action))
      throw ApiError.badRequest("action must be 'approve' or 'reject'");

    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw ApiError.notFound('Document not found');

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        reviewStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewNote: note || null,
        ...(action === 'approve' && extractedData ? { extractedData } : {}),
      },
    });
    await logActivity({
      type: 'DOCUMENT_REVIEWED',
      description: `Document "${doc.fileName}" ${action === 'approve' ? 'approved' : 'rejected'}`,
      entityType: 'Document',
      entityId: doc.id,
      actorId: req.user.id,
    });
    ok(res, updated);
  }),
);

// Manual upload → Cloudinary → AI extraction.
router.post(
  '/',
  writeAccess,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file provided');
    const { type = 'OTHER', shipmentId, projectId } = req.body;

    const uploaded = await uploadBuffer(req.file.buffer, {
      folder: 'documents',
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    // AI extraction via the OCR pipeline — read the real document (PDF text or
    // vision OCR for scans), not just whatever text the caller passed.
    let extracted = null;
    let docText = req.body.text || null;
    if (req.body.extract !== 'false') {
      const hint = `Uploaded ${type}: ${req.file.originalname}`;
      try {
        if (isPdf(req.file.mimetype, req.file.originalname)) {
          const text = await extractPdfText(req.file.buffer);
          if (hasUsableText(text)) {
            docText = text;
            extracted = await extractDocumentData(text, hint);
          } else {
            const urls = pageImageUrls(uploaded.publicId, uploaded.pages || 1);
            extracted = await extractDocumentDataFromImages(urls, hint);
          }
        } else if (isImage(req.file.mimetype, req.file.originalname)) {
          extracted = await extractDocumentDataFromImages([uploaded.url], hint);
        } else {
          extracted = await extractDocumentData(docText || '', hint);
        }
      } catch {
        extracted = null;
      }
    }

    const doc = await prisma.document.create({
      data: {
        type,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        cloudinaryUrl: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        pageCount: uploaded.pages || null,
        extractedText: docText,
        extractedData: extracted,
        aiConfidence: extracted?.confidence ?? null,
        reviewStatus: reviewStatusFor(extracted?.confidence),
        shipmentId: shipmentId || null,
        projectId: projectId || null,
        uploadedById: req.user.id,
      },
    });
    await logActivity({
      type: 'DOCUMENT_UPLOADED',
      description: `Document "${doc.fileName}" uploaded`,
      entityType: 'Document',
      entityId: doc.id,
      actorId: req.user.id,
    });
    created(res, doc);
  }),
);

router.delete(
  '/:id',
  writeAccess,
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw ApiError.notFound('Document not found');
    await deleteAsset(doc.cloudinaryPublicId, 'auto');
    await prisma.document.delete({ where: { id: req.params.id } });
    noContent(res);
  }),
);
