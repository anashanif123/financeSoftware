import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { toNumber, formatCurrency } from '../utils/money.js';
import { uploadBuffer } from './cloudinary.service.js';

// Palette
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#d1d5db';
const ACCENT = '#0f766e';
const SOFT = '#f3f4f6';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Professional shipping invoice (Module 11) — mirrors a broker invoice layout:
// company header, bill-to, amount due, shipment details, containers, charges, totals.
function renderToBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 40; // left edge
    const R = 555; // right edge
    const W = R - L; // 515
    const cur = invoice.currency || 'USD';
    const s = invoice.shipment;
    const c = invoice.customer;
    const amountDue = toNumber(invoice.totalAmount) - toNumber(invoice.amountPaid);

    // ── Header: company (biller) left, INVOICE meta right ──
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(20).text(env.COMPANY_NAME, L, 42);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5);
    let cy = 68;
    if (env.COMPANY_ADDRESS) {
      doc.text(env.COMPANY_ADDRESS, L, cy, { width: 250 });
      cy = doc.y + 1;
    }
    if (env.COMPANY_EMAIL) doc.text(env.COMPANY_EMAIL, L, cy);

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(28).text('INVOICE', R - 220, 40, { width: 220, align: 'right' });
    let hy = 76;
    const rline = (t) => {
      doc.font('Helvetica').fontSize(9).fillColor(INK).text(t, R - 260, hy, { width: 260, align: 'right' });
      hy += 14;
    };
    rline(`Invoice #: ${invoice.invoiceNumber}`);
    rline(`Date: ${fmtDate(invoice.issueDate)}`);
    if (invoice.dueDate) rline(`Due: ${fmtDate(invoice.dueDate)}`);

    // ── Bill-to (left) + Amount Due box (right) ──
    let y = 128;
    doc.moveTo(L, y).lineTo(R, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 14;

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED).text('BILL TO', L, y);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(c?.name || '—', L, y + 13, { width: 280 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    let by = doc.y + 2;
    if (c?.address) {
      doc.text(c.address, L, by, { width: 270 });
      by = doc.y;
    }
    if (c?.email) doc.text(c.email, L, by + 1);

    const boxX = R - 210;
    const boxY = y;
    const boxH = 64;
    doc.roundedRect(boxX, boxY, 210, boxH, 6).fill(SOFT);
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text('AMOUNT DUE', boxX + 14, boxY + 11);
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(22).text(formatCurrency(amountDue, cur), boxX + 14, boxY + 25, { width: 182 });
    if (invoice.dueDate)
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`Payment due ${fmtDate(invoice.dueDate)}`, boxX + 14, boxY + 50);

    y = Math.max(by + 14, boxY + boxH + 16);

    // ── Shipment details (two columns) ──
    if (s) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED).text('SHIPMENT DETAILS', L, y);
      y += 15;
      const kv = (label, value, x, yy) => {
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`${label}:`, x, yy, { width: 88 });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(INK).text(value || '—', x + 90, yy, { width: 150 });
      };
      const left = [
        ['Shipment #', s.shipmentNumber],
        ['Reference', s.arsNumber],
        ['Consignee', c?.name],
        ['Origin', s.originPort],
        ['Destination', s.destinationPort],
        ['Entry #', s.entryNumber],
      ];
      const right = [
        ['Vessel', s.vessel],
        ['Voyage', s.voyage],
        ['B/L #', s.blNumber],
        ['Sail date', s.sailDate ? fmtDate(s.sailDate) : null],
        ['Arrival', s.arrivalDate ? fmtDate(s.arrivalDate) : null],
        ['Entry date', s.entryDate ? fmtDate(s.entryDate) : null],
      ];
      let yl = y;
      let yr = y;
      left.forEach(([k, v]) => {
        kv(k, v, L, yl);
        yl += 14;
      });
      right.forEach(([k, v]) => {
        kv(k, v, L + 268, yr);
        yr += 14;
      });
      y = Math.max(yl, yr) + 10;

      // Containers strip
      if (s.containerNumber || s.containerType || s.containerCount) {
        doc.rect(L, y, W, 20).fill(SOFT);
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8);
        doc.text('CONTAINER', L + 8, y + 6);
        doc.text('TYPE', L + 150, y + 6);
        doc.text('QTY', L + 215, y + 6, { width: 55, align: 'right' });
        doc.text('WEIGHT', L + 280, y + 6, { width: 60, align: 'right' });
        doc.text('VOLUME', L + 350, y + 6, { width: 60, align: 'right' });
        doc.text('COMMODITY', L + 420, y + 6);
        y += 20;
        doc.font('Helvetica').fontSize(8.5).fillColor(INK);
        doc.text(s.containerNumber || '—', L + 8, y + 6);
        doc.text(s.containerType || '—', L + 150, y + 6);
        doc.text(s.cartonCount ? `${s.cartonCount} CTN` : s.containerCount ? String(Number(s.containerCount)) : '—', L + 215, y + 6, { width: 55, align: 'right' });
        doc.text(s.weightKg ? `${Number(s.weightKg)} KG` : '—', L + 280, y + 6, { width: 60, align: 'right' });
        doc.text(s.volumeM3 ? `${Number(s.volumeM3)} M3` : '—', L + 350, y + 6, { width: 60, align: 'right' });
        doc.text((s.commodity || '—').slice(0, 24), L + 420, y + 6, { width: 130 });
        y += 26;
      }
    }

    // ── Rates & charges table ──
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED).text('RATES & CHARGES', L, y);
    y += 14;
    doc.rect(L, y, W, 22).fill(ACCENT);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
    doc.text('DESCRIPTION', L + 10, y + 7);
    doc.text('QTY', L + 300, y + 7, { width: 45, align: 'right' });
    doc.text('UNIT', L + 350, y + 7, { width: 75, align: 'right' });
    doc.text('AMOUNT', L + 440, y + 7, { width: 75, align: 'right' });
    y += 22;

    const items =
      invoice.items?.length > 0
        ? invoice.items
        : [{ description: 'Duties, freight & broker charges', quantity: 1, unitPrice: invoice.baseCost, amount: invoice.baseCost }];

    items.forEach((it) => {
      doc.fillColor(INK).font('Helvetica').fontSize(9).text(it.description, L + 10, y + 6, { width: 280 });
      doc.text(String(toNumber(it.quantity)), L + 300, y + 6, { width: 45, align: 'right' });
      doc.text(formatCurrency(it.unitPrice, cur), L + 350, y + 6, { width: 75, align: 'right' });
      doc.text(formatCurrency(it.amount, cur), L + 440, y + 6, { width: 75, align: 'right' });
      doc.moveTo(L, y + 22).lineTo(R, y + 22).strokeColor('#eeeeee').lineWidth(0.5).stroke();
      y += 22;
    });

    // ── Totals ──
    y += 10;
    const totX = R - 220;
    const totRow = (label, value, opts = {}) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 12 : 9.5).fillColor(opts.bold ? INK : MUTED);
      doc.text(label, totX, y, { width: 120, align: 'left' });
      doc.fillColor(opts.bold ? ACCENT : INK).text(formatCurrency(value, cur), totX + 120, y, { width: 100, align: 'right' });
      y += opts.bold ? 22 : 16;
    };
    totRow('Base cost', invoice.baseCost);
    if (toNumber(invoice.commissionAmount) > 0) totRow('Service commission', invoice.commissionAmount);
    totRow('Sub-total', invoice.totalAmount);
    if (toNumber(invoice.amountPaid) > 0) totRow('Payment received', -toNumber(invoice.amountPaid));
    doc.moveTo(totX, y).lineTo(R, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 8;
    totRow('AMOUNT DUE', amountDue, { bold: true });

    // ── Footer ──
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
      invoice.notes || `Please reference invoice ${invoice.invoiceNumber} when remitting payment to ${env.COMPANY_NAME}.`,
      L,
      788,
      { width: W, align: 'center' },
    );
    doc.fontSize(8).fillColor('#9ca3af').text(
      [env.COMPANY_NAME, env.COMPANY_EMAIL, env.COMPANY_ADDRESS].filter(Boolean).join('  ·  '),
      L,
      804,
      { width: W, align: 'center' },
    );

    doc.end();
  });
}

export async function generateInvoicePdf(invoice) {
  const buffer = await renderToBuffer(invoice);
  const { url, publicId } = await uploadBuffer(buffer, {
    folder: 'invoices',
    filename: `${invoice.invoiceNumber}.pdf`,
    mimeType: 'application/pdf',
  });
  return { url, publicId, buffer };
}
