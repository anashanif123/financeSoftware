import ExcelJS from 'exceljs';
import { prisma } from '../../config/db.js';
import { toNumber, round2 } from '../../utils/money.js';

// Tolerance (in currency units) below which two amounts are considered equal.
const TOL = 1;

// Sum the broker/freight/customs charges we extracted from a shipment's
// documents — i.e. what the broker actually billed, independent of our invoice.
function brokerTotalFromDocuments(documents = []) {
  let total = 0;
  for (const doc of documents) {
    const data = doc.extractedData;
    if (!data) continue;
    if (Array.isArray(data.charges) && data.charges.length) {
      total += data.charges.reduce((s, c) => s + (toNumber(c.amount) || 0), 0);
    } else if (data.totalAmount) {
      total += toNumber(data.totalAmount);
    }
  }
  return round2(total);
}

// ── Reconciliation (Module 16 / ROADMAP #7) ──
// For every invoice: compare what the broker billed (from docs) vs what we
// billed the customer vs what we've been paid, and flag the mismatches.
export async function buildReconciliation() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { issueDate: 'desc' },
    include: {
      customer: { select: { name: true } },
      project: { select: { name: true } },
      shipment: { select: { id: true, containerCount: true, documents: { select: { extractedData: true, type: true } } } },
    },
  });

  const rows = invoices.map((inv) => {
    const billedBase = round2(toNumber(inv.baseCost));
    const billedTotal = round2(toNumber(inv.totalAmount));
    const commission = round2(toNumber(inv.commissionAmount));
    const paid = round2(toNumber(inv.amountPaid));
    const outstanding = round2(billedTotal - paid);
    const brokerTotal = brokerTotalFromDocuments(inv.shipment?.documents);

    const flags = [];
    if (brokerTotal > 0 && Math.abs(brokerTotal - billedBase) > TOL) flags.push('BASE_MISMATCH');
    if (paid - billedTotal > TOL) flags.push('OVERPAID');
    if (inv.status === 'OVERDUE') flags.push('OVERDUE');
    if (billedBase > 0 && commission === 0) flags.push('NO_COMMISSION');

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer?.name || null,
      project: inv.project?.name || null,
      status: inv.status,
      currency: inv.currency,
      brokerTotal,
      billedBase,
      commission,
      billedTotal,
      paid,
      outstanding,
      flags,
    };
  });

  const summary = rows.reduce(
    (a, r) => ({
      invoices: a.invoices + 1,
      billedTotal: round2(a.billedTotal + r.billedTotal),
      paid: round2(a.paid + r.paid),
      outstanding: round2(a.outstanding + r.outstanding),
      commission: round2(a.commission + r.commission),
      flagged: a.flagged + (r.flags.length ? 1 : 0),
    }),
    { invoices: 0, billedTotal: 0, paid: 0, outstanding: 0, commission: 0, flagged: 0 },
  );

  return { rows, summary };
}

// ── Ledger (reproduces the handwritten "NFK, NEW ACCOUNT" sheet) ──
export async function buildLedger() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { issueDate: 'asc' },
    include: {
      project: { select: { name: true } },
      customer: { select: { name: true } },
      shipment: { select: { containerCount: true, nfkRef: true, arsNumber: true, entryNumber: true } },
    },
  });

  const rows = invoices.map((inv) => {
    const duties = round2(toNumber(inv.baseCost));
    const com = round2(toNumber(inv.commissionAmount));
    const totalExpense = round2(toNumber(inv.totalAmount));
    const received = round2(toNumber(inv.amountPaid));
    return {
      project: inv.project?.name || inv.customer?.name || '—',
      date: inv.issueDate,
      noContainers: inv.shipment?.containerCount ?? null,
      nfkRef: inv.shipment?.nfkRef || null,
      arsNumber: inv.shipment?.arsNumber || null,
      entryNumber: inv.shipment?.entryNumber || null,
      invoiceNumber: inv.invoiceNumber,
      duties,
      com,
      totalExpense,
      received,
      outstanding: round2(totalExpense - received),
      status: inv.status,
    };
  });

  const totals = rows.reduce(
    (a, r) => ({
      noContainers: round2(a.noContainers + (r.noContainers || 0)),
      duties: round2(a.duties + r.duties),
      com: round2(a.com + r.com),
      totalExpense: round2(a.totalExpense + r.totalExpense),
      received: round2(a.received + r.received),
      outstanding: round2(a.outstanding + r.outstanding),
    }),
    { noContainers: 0, duties: 0, com: 0, totalExpense: 0, received: 0, outstanding: 0 },
  );

  return { rows, totals };
}

// Column definitions per report type → drives both CSV and Excel export.
const COLUMNS = {
  ledger: [
    { key: 'project', header: 'PROJECT' },
    { key: 'date', header: 'DATE', type: 'date' },
    { key: 'noContainers', header: 'NO CONTR' },
    { key: 'nfkRef', header: 'NFK REF' },
    { key: 'arsNumber', header: 'ARS #' },
    { key: 'entryNumber', header: 'ENTRY #' },
    { key: 'invoiceNumber', header: 'INVOICE' },
    { key: 'duties', header: 'TOTAL DUTIES', type: 'money' },
    { key: 'com', header: 'COM', type: 'money' },
    { key: 'totalExpense', header: 'TOTAL EXPENSE', type: 'money' },
    { key: 'received', header: 'RECEIVED', type: 'money' },
    { key: 'outstanding', header: 'O/S', type: 'money' },
    { key: 'status', header: 'STATUS' },
  ],
  reconciliation: [
    { key: 'invoiceNumber', header: 'INVOICE' },
    { key: 'customer', header: 'CUSTOMER' },
    { key: 'project', header: 'PROJECT' },
    { key: 'status', header: 'STATUS' },
    { key: 'brokerTotal', header: 'BROKER BILLED', type: 'money' },
    { key: 'billedBase', header: 'OUR BASE', type: 'money' },
    { key: 'commission', header: 'COMMISSION', type: 'money' },
    { key: 'billedTotal', header: 'INVOICED', type: 'money' },
    { key: 'paid', header: 'PAID', type: 'money' },
    { key: 'outstanding', header: 'OUTSTANDING', type: 'money' },
    { key: 'flags', header: 'FLAGS', type: 'list' },
  ],
};

async function rowsFor(type) {
  if (type === 'ledger') return (await buildLedger()).rows;
  if (type === 'reconciliation') return (await buildReconciliation()).rows;
  throw new Error(`Unknown report type: ${type}`);
}

function fmt(value, col) {
  if (value == null) return '';
  if (col.type === 'list') return Array.isArray(value) ? value.join(', ') : String(value);
  if (col.type === 'date') return new Date(value).toISOString().slice(0, 10);
  return value;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Build a CSV string for the given report type.
export async function exportCsv(type) {
  const cols = COLUMNS[type];
  if (!cols) throw new Error(`Unknown report type: ${type}`);
  const rows = await rowsFor(type);
  const lines = [cols.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) lines.push(cols.map((c) => csvCell(fmt(row[c.key], c))).join(','));
  return lines.join('\n');
}

// Build an .xlsx Buffer for the given report type.
export async function exportXlsx(type) {
  const cols = COLUMNS[type];
  if (!cols) throw new Error(`Unknown report type: ${type}`);
  const rows = await rowsFor(type);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(type === 'ledger' ? 'NFK New Account' : 'Reconciliation');
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.type === 'money' ? 16 : 18 }));
  ws.getRow(1).font = { bold: true };
  for (const row of rows) {
    ws.addRow(Object.fromEntries(cols.map((c) => [c.key, fmt(row[c.key], c)])));
  }
  return wb.xlsx.writeBuffer();
}
