import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { toNumber, formatCurrency } from '../utils/money.js';
import { uploadBuffer } from './cloudinary.service.js';

// Render a branded invoice PDF to a buffer (Module 11), then store on Cloudinary.
function renderToBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const ink = '#0f172a';
    const muted = '#64748b';
    const accent = '#4f46e5';

    // Header
    doc.fillColor(accent).fontSize(22).font('Helvetica-Bold').text(env.COMPANY_NAME, 50, 50);
    doc.fillColor(muted).fontSize(9).font('Helvetica').text(env.COMPANY_ADDRESS, 50, 78, { width: 250 });
    doc.fillColor(muted).text(env.COMPANY_EMAIL, 50, 92);

    doc.fillColor(ink).fontSize(26).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
    doc.fillColor(muted).fontSize(10).font('Helvetica').text(invoice.invoiceNumber, 400, 82, { align: 'right' });
    doc.text(`Issued: ${new Date(invoice.issueDate).toLocaleDateString()}`, 400, 96, { align: 'right' });
    if (invoice.dueDate)
      doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 110, { align: 'right' });

    // Bill-to + shipment
    doc.moveTo(50, 135).lineTo(545, 135).strokeColor('#e2e8f0').stroke();
    doc.fillColor(muted).fontSize(9).text('BILL TO', 50, 150);
    doc.fillColor(ink).fontSize(12).font('Helvetica-Bold').text(invoice.customer?.name || '—', 50, 164);
    doc.font('Helvetica').fontSize(9).fillColor(muted);
    if (invoice.customer?.address) doc.text(invoice.customer.address, 50, 182, { width: 240 });
    if (invoice.customer?.email) doc.text(invoice.customer.email, 50, 210);

    doc.fillColor(muted).fontSize(9).text('SHIPMENT', 330, 150);
    doc.fillColor(ink).fontSize(10).font('Helvetica');
    const meta = [
      ['Project', invoice.project?.name],
      ['Shipment #', invoice.shipment?.shipmentNumber],
      ['Container', invoice.shipment?.containerNumber],
    ].filter(([, v]) => v);
    let my = 164;
    meta.forEach(([k, v]) => {
      doc.fillColor(muted).text(`${k}:`, 330, my, { continued: true }).fillColor(ink).text(` ${v}`);
      my += 15;
    });

    // Items table
    const top = 250;
    doc.rect(50, top, 495, 22).fill('#f1f5f9');
    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, top + 7);
    doc.text('QTY', 330, top + 7, { width: 50, align: 'right' });
    doc.text('UNIT', 390, top + 7, { width: 70, align: 'right' });
    doc.text('AMOUNT', 470, top + 7, { width: 65, align: 'right' });

    let y = top + 30;
    doc.font('Helvetica').fontSize(9).fillColor(ink);
    const items =
      invoice.items?.length > 0
        ? invoice.items
        : [{ description: 'Base cost (duties, freight & broker charges)', quantity: 1, unitPrice: invoice.baseCost, amount: invoice.baseCost }];

    items.forEach((it) => {
      doc.fillColor(ink).text(it.description, 60, y, { width: 260 });
      doc.text(String(toNumber(it.quantity)), 330, y, { width: 50, align: 'right' });
      doc.text(formatCurrency(it.unitPrice, invoice.currency), 390, y, { width: 70, align: 'right' });
      doc.text(formatCurrency(it.amount, invoice.currency), 470, y, { width: 65, align: 'right' });
      y += 20;
    });

    // Totals
    y += 10;
    doc.moveTo(330, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
    y += 12;
    const totalRow = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? ink : muted).fontSize(bold ? 12 : 10);
      doc.text(label, 330, y, { width: 120, align: 'right' });
      doc.text(formatCurrency(value, invoice.currency), 460, y, { width: 85, align: 'right' });
      y += bold ? 22 : 18;
    };
    totalRow('Base cost', invoice.baseCost);
    if (toNumber(invoice.commissionAmount) > 0) totalRow('Service commission', invoice.commissionAmount);
    totalRow('Total due', invoice.totalAmount, true);

    // Payment instructions + footer
    y += 20;
    doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text('PAYMENT INSTRUCTIONS', 50, y);
    doc.font('Helvetica').fillColor(muted).text(
      invoice.notes ||
        `Please remit payment to ${env.COMPANY_NAME} by the due date and reference invoice ${invoice.invoiceNumber}.`,
      50,
      y + 14,
      { width: 495 },
    );
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(`${env.COMPANY_NAME} · ${env.COMPANY_EMAIL}`, 50, 770, { align: 'center', width: 495 });

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
