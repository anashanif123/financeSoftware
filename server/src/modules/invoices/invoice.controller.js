import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import * as service from './invoice.service.js';
import { generateInvoicePdf } from '../../services/pdf.service.js';
import { sendInvoiceEmail } from '../../services/email.service.js';
import { logActivity } from '../../services/activity.service.js';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query, 0);
  const { data, total } = await service.listInvoices(req.query, meta);
  ok(res, data, { ...meta, total, totalPages: Math.ceil(total / meta.limit) || 1 });
});

export const get = asyncHandler(async (req, res) => {
  ok(res, await service.getInvoice(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await service.createInvoice(req.body, req.user.id));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateInvoice(req.params.id, req.body, req.user.id));
});

export const setCommission = asyncHandler(async (req, res) => {
  ok(res, await service.recalcInvoice(req.params.id, req.body, req.user.id));
});

export const toggleCommission = asyncHandler(async (req, res) => {
  ok(res, await service.toggleCommission(req.params.id, req.user.id));
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteInvoice(req.params.id);
  noContent(res);
});

// Generate (or regenerate) the branded PDF and store it on Cloudinary.
export const generatePdf = asyncHandler(async (req, res) => {
  const invoice = await service.getInvoice(req.params.id);
  const { url, publicId } = await generateInvoicePdf(invoice);
  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfUrl: url, pdfPublicId: publicId },
    select: { id: true, pdfUrl: true },
  });
  ok(res, updated);
});

// Generate PDF → email to customer → record delivery + activity.
export const send = asyncHandler(async (req, res) => {
  const invoice = await service.getInvoice(req.params.id);
  if (!invoice.customer?.email) throw ApiError.badRequest('Customer has no email on file');

  const { url, publicId } = await generateInvoicePdf(invoice);
  const delivery = await sendInvoiceEmail({ invoice, pdfUrl: url });

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      pdfUrl: url,
      pdfPublicId: publicId,
      status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
      sentAt: new Date(),
      emailMessageId: delivery.messageId,
      deliveryStatus: delivery.status,
    },
    include: { customer: true },
  });
  await logActivity({
    type: 'INVOICE_SENT',
    description: `Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.email}`,
    entityType: 'Invoice',
    entityId: invoice.id,
    actorId: req.user.id,
  });
  ok(res, updated);
});
