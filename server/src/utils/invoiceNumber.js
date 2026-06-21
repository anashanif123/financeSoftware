import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

// Generate the next sequential invoice number for the current year:
//   INV-2026-0001, INV-2026-0002, ...
// Runs inside a transaction-friendly query: we read the max for the year and
// increment. For high concurrency this should move to a DB sequence / advisory
// lock, but this is correct for the expected single-tenant volume.
export async function nextInvoiceNumber(tx = prisma) {
  const prefix = env.INVOICE_PREFIX;
  const year = new Date().getFullYear();
  const search = `${prefix}-${year}-`;

  const last = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: search } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (last?.invoiceNumber) {
    const tail = last.invoiceNumber.split('-').pop();
    seq = (Number.parseInt(tail, 10) || 0) + 1;
  }

  return `${search}${String(seq).padStart(4, '0')}`;
}
