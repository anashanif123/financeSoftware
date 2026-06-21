import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { nextInvoiceNumber } from '../../utils/invoiceNumber.js';
import { computeCommission } from '../../utils/commission.js';
import { toNumber, round2 } from '../../utils/money.js';
import { logActivity } from '../../services/activity.service.js';

const FULL_INCLUDE = {
  customer: true,
  project: { select: { id: true, name: true } },
  shipment: { select: { id: true, shipmentNumber: true, containerNumber: true, containerCount: true } },
  items: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { paidAt: 'desc' } },
};

// Sum line items into a base cost (commission lines are excluded from base).
function sumBaseFromItems(items = []) {
  return round2(
    items
      .filter((i) => (i.category || '').toUpperCase() !== 'COMMISSION')
      .reduce((acc, i) => acc + toNumber(i.amount ?? toNumber(i.unitPrice) * toNumber(i.quantity || 1)), 0),
  );
}

// Resolve container count for PER_CONTAINER commission, preferring the linked shipment.
async function resolveContainerCount(shipmentId, fallback = 1) {
  if (!shipmentId) return fallback;
  const s = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { containerCount: true },
  });
  return s?.containerCount ?? fallback;
}

export async function listInvoices(query, meta) {
  const { status, customerId, projectId, search } = query;
  const where = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(search ? { invoiceNumber: { contains: search, mode: 'insensitive' } } : {}),
  };
  const total = await prisma.invoice.count({ where });
  const data = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: meta.skip,
    take: meta.limit,
    include: {
      customer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { items: true, payments: true } },
    },
  });
  return { data, total };
}

export async function getInvoice(id) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
}

export async function createInvoice(input, actorId) {
  const {
    items = [],
    commissionType = env.DEFAULT_COMMISSION_TYPE,
    commissionRate = env.DEFAULT_COMMISSION_RATE,
    shipmentId,
    ...rest
  } = input;

  const baseCost = items.length ? sumBaseFromItems(items) : round2(input.baseCost || 0);
  const containerCount = await resolveContainerCount(shipmentId, input.containerCount || 1);
  const { commissionAmount, totalAmount } = computeCommission({
    baseCost,
    type: commissionType,
    rate: commissionRate,
    containerCount,
  });

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextInvoiceNumber(tx);
    return tx.invoice.create({
      data: {
        ...rest,
        shipmentId,
        invoiceNumber,
        baseCost,
        commissionType,
        commissionRate,
        commissionAmount,
        totalAmount,
        status: 'DRAFT',
        items: {
          create: items.map((i) => ({
            description: i.description,
            category: i.category,
            quantity: i.quantity ?? 1,
            unitPrice: i.unitPrice ?? 0,
            amount: i.amount ?? round2(toNumber(i.unitPrice) * toNumber(i.quantity || 1)),
            sourceDocumentId: i.sourceDocumentId,
          })),
        },
      },
      include: FULL_INCLUDE,
    });
  });

  await logActivity({
    type: 'INVOICE_CREATED',
    description: `Invoice ${invoice.invoiceNumber} created (${invoice.totalAmount} ${invoice.currency})`,
    entityType: 'Invoice',
    entityId: invoice.id,
    actorId,
  });
  return invoice;
}

// Recalculate totals from the current commission settings + items.
export async function recalcInvoice(id, { commissionType, commissionRate } = {}, actorId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, shipment: { select: { containerCount: true } } },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const type = commissionType ?? invoice.commissionType;
  const rate = commissionRate ?? toNumber(invoice.commissionRate);
  const baseCost = invoice.items.length ? sumBaseFromItems(invoice.items) : toNumber(invoice.baseCost);
  const containerCount = invoice.shipment?.containerCount ?? 1;
  const { commissionAmount, totalAmount } = computeCommission({ baseCost, type, rate, containerCount });

  const updated = await prisma.invoice.update({
    where: { id },
    data: { baseCost, commissionType: type, commissionRate: rate, commissionAmount, totalAmount },
    include: FULL_INCLUDE,
  });
  await logActivity({
    type: 'COMMISSION_UPDATED',
    description: `Commission on ${updated.invoiceNumber} set to ${type} (${rate}) → ${commissionAmount}`,
    entityType: 'Invoice',
    entityId: id,
    actorId,
  });
  return updated;
}

// One-click commission toggle: flip between configured commission and none.
export async function toggleCommission(id, actorId) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const turningOff = invoice.commissionType !== 'NONE';
  return recalcInvoice(
    id,
    turningOff
      ? { commissionType: 'NONE', commissionRate: 0 }
      : { commissionType: env.DEFAULT_COMMISSION_TYPE, commissionRate: env.DEFAULT_COMMISSION_RATE },
    actorId,
  );
}

export async function updateInvoice(id, data, actorId) {
  const updated = await prisma.invoice.update({ where: { id }, data, include: FULL_INCLUDE });
  await logActivity({
    type: 'INVOICE_CREATED',
    description: `Invoice ${updated.invoiceNumber} updated`,
    entityType: 'Invoice',
    entityId: id,
    actorId,
  });
  return updated;
}

export async function deleteInvoice(id) {
  await prisma.invoice.delete({ where: { id } });
}
