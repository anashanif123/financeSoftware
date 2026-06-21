import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { prisma } from '../../config/db.js';
import { toNumber } from '../../utils/money.js';

export const router = Router();

// Headline metric cards (Module 2).
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [
      totalProjects,
      totalShipments,
      pendingInvoices,
      paidInvoices,
      paidAgg,
      outstandingAgg,
      commissionAgg,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.shipment.count(),
      prisma.invoice.count({ where: { status: { in: ['PENDING', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'] } } }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: 'PAID' } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true, amountPaid: true },
        where: { status: { in: ['SENT', 'PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } },
      }),
      prisma.invoice.aggregate({ _sum: { commissionAmount: true }, where: { status: 'PAID' } }),
    ]);

    const revenue = toNumber(paidAgg._sum.totalAmount);
    const outstanding =
      toNumber(outstandingAgg._sum.totalAmount) - toNumber(outstandingAgg._sum.amountPaid);

    ok(res, {
      totalProjects,
      totalShipments,
      pendingInvoices,
      paidInvoices,
      revenue,
      outstanding: Math.max(0, outstanding),
      commissionEarned: toNumber(commissionAgg._sum.commissionAmount),
    });
  }),
);

// Time series for the four trend charts. Grouped per month over a window.
router.get(
  '/charts',
  asyncHandler(async (req, res) => {
    const months = Math.min(24, Number.parseInt(req.query.months, 10) || 6);
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);

    const [invoices, payments, shipments] = await Promise.all([
      prisma.invoice.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, totalAmount: true, status: true },
      }),
      prisma.payment.findMany({
        where: { paidAt: { gte: since } },
        select: { paidAt: true, amount: true },
      }),
      prisma.shipment.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = {};
    for (let i = 0; i < months; i += 1) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { month: key, revenue: 0, payments: 0, invoices: 0, shipments: 0 };
    }
    const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    invoices.forEach((i) => {
      const b = buckets[keyOf(i.createdAt)];
      if (!b) return;
      b.invoices += 1;
      if (i.status === 'PAID') b.revenue += toNumber(i.totalAmount);
    });
    payments.forEach((p) => {
      const b = buckets[keyOf(p.paidAt)];
      if (b) b.payments += toNumber(p.amount);
    });
    shipments.forEach((s) => {
      const b = buckets[keyOf(s.createdAt)];
      if (b) b.shipments += 1;
    });

    ok(res, Object.values(buckets));
  }),
);

// Recent activity / emails / payments side panels.
router.get(
  '/recent',
  asyncHandler(async (_req, res) => {
    const [activities, emails, payments] = await Promise.all([
      prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { name: true } } },
      }),
      prisma.email.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 8,
        select: { id: true, fromAddress: true, fromName: true, subject: true, category: true, receivedAt: true },
      }),
      prisma.payment.findMany({
        orderBy: { paidAt: 'desc' },
        take: 8,
        include: { invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } } },
      }),
    ]);
    ok(res, { activities, emails, payments });
  }),
);
