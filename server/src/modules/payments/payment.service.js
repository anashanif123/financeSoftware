import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { toNumber, round2 } from '../../utils/money.js';
import { logActivity } from '../../services/activity.service.js';

export async function listPayments(query, meta) {
  const where = query.invoiceId ? { invoiceId: query.invoiceId } : {};
  const total = await prisma.payment.count({ where });
  const data = await prisma.payment.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    skip: meta.skip,
    take: meta.limit,
    include: { invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } } },
  });
  return { data, total };
}

// Open (unsettled) invoice statuses a payment could apply to.
const OPEN_STATUSES = ['SENT', 'PENDING', 'PARTIALLY_PAID', 'OVERDUE'];

// Pull invoice-number-looking tokens out of free text (e.g. a wire reference
// "Payment for INV-2026-0001 / 550773455").
function invoiceTokens(text = '') {
  return (text.match(/[A-Z]{2,}-?\d{2,}[-\d]*/gi) || []).map((t) => t.trim());
}

// Robustly resolve which invoice a Gmail payment confirmation refers to. Real
// bank/wire emails rarely contain our invoice number, so we cascade:
//   1. exact invoice number      → confidence 1.0
//   2. number found in reference  → 0.9
//   3. customer + matching amount → 0.85 (only if unambiguous)
//   4. amount alone among open    → 0.6  (only if exactly one candidate)
// Ambiguous matches return { invoice: null, reason } so the caller can defer to
// human review instead of guessing.
export async function findInvoiceForPayment({ invoiceNumber, amount, customerName, reference }) {
  if (invoiceNumber) {
    const inv = await prisma.invoice.findFirst({ where: { invoiceNumber } });
    if (inv) return { invoice: inv, method: 'invoice_number', confidence: 1 };
  }

  const tokens = invoiceTokens(reference);
  if (tokens.length) {
    const inv = await prisma.invoice.findFirst({ where: { invoiceNumber: { in: tokens } } });
    if (inv) return { invoice: inv, method: 'reference', confidence: 0.9 };
  }

  const amt = toNumber(amount);
  if (customerName && amt > 0) {
    const candidates = await prisma.invoice.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        customer: { name: { contains: customerName, mode: 'insensitive' } },
      },
    });
    const matches = candidates.filter((i) => Math.abs(toNumber(i.totalAmount) - toNumber(i.amountPaid) - amt) <= 1);
    if (matches.length === 1) return { invoice: matches[0], method: 'customer_amount', confidence: 0.85 };
    if (matches.length > 1) return { invoice: null, reason: 'ambiguous_customer_amount', count: matches.length };
  }

  if (amt > 0) {
    const open = await prisma.invoice.findMany({ where: { status: { in: OPEN_STATUSES } } });
    const matches = open.filter((i) => Math.abs(toNumber(i.totalAmount) - toNumber(i.amountPaid) - amt) <= 1);
    if (matches.length === 1) return { invoice: matches[0], method: 'amount', confidence: 0.6 };
    if (matches.length > 1) return { invoice: null, reason: 'ambiguous_amount', count: matches.length };
  }

  return { invoice: null, reason: 'no_match' };
}

// Record a payment and reconcile the parent invoice status.
// Shared by the manual UI and the AI Gmail payment detector (Module 13).
export async function recordPayment({
  invoiceId,
  amount,
  currency = 'USD',
  method = 'WIRE',
  reference,
  paidAt,
  notes,
  emailId = null,
  detectedByAi = false,
  actorId = null,
}) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { invoiceId, amount, currency, method, reference, paidAt: paidAt || new Date(), notes, emailId, detectedByAi },
    });

    const newPaid = round2(toNumber(invoice.amountPaid) + toNumber(amount));
    const total = toNumber(invoice.totalAmount);
    const status = newPaid >= total - 0.01 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : invoice.status;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newPaid, status, paidAt: status === 'PAID' ? new Date() : invoice.paidAt },
    });
    return { payment, invoice: updatedInvoice, fullyPaid: status === 'PAID' };
  });

  await logActivity({
    type: result.fullyPaid ? 'INVOICE_PAID' : 'PAYMENT_RECEIVED',
    description: `${detectedByAi ? 'Auto-detected payment' : 'Payment'} of ${amount} ${currency} on ${invoice.invoiceNumber}`,
    entityType: 'Invoice',
    entityId: invoiceId,
    metadata: { detectedByAi, reference },
    actorId,
  });
  return result;
}
