import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { formatCurrency } from '../utils/money.js';
import { getActiveConnection, sendEmail } from './gmail.service.js';

// Branded HTML wrapper for outbound emails.
function invoiceEmailHtml(invoice) {
  const total = formatCurrency(invoice.totalAmount, invoice.currency);
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#0f172a">
    <div style="padding:24px 0;border-bottom:1px solid #e2e8f0">
      <h2 style="margin:0;color:#4f46e5">${env.COMPANY_NAME}</h2>
    </div>
    <div style="padding:24px 0">
      <p>Dear ${invoice.customer?.name || 'Customer'},</p>
      <p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong>${
        invoice.shipment?.shipmentNumber ? ` for shipment <strong>${invoice.shipment.shipmentNumber}</strong>` : ''
      }.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b">Invoice</td><td style="text-align:right;font-weight:600">${invoice.invoiceNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Amount due</td><td style="text-align:right;font-weight:700;font-size:18px">${total}</td></tr>
        ${
          invoice.dueDate
            ? `<tr><td style="padding:8px 0;color:#64748b">Due date</td><td style="text-align:right">${new Date(
                invoice.dueDate,
              ).toLocaleDateString()}</td></tr>`
            : ''
        }
      </table>
      <p style="color:#64748b;font-size:13px">${
        invoice.notes || `Kindly reference ${invoice.invoiceNumber} with your payment.`
      }</p>
    </div>
    <div style="padding:16px 0;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
      ${env.COMPANY_NAME} · ${env.COMPANY_EMAIL}<br/>${env.COMPANY_ADDRESS}
    </div>
  </div>`;
}

// Send an invoice email with the PDF attached. Falls back to a logged "draft"
// when no Gmail account is connected (so the flow never hard-fails locally).
export async function sendInvoiceEmail({ invoice, pdfUrl }) {
  const connection = await getActiveConnection();
  const subject = `Invoice ${invoice.invoiceNumber} from ${env.COMPANY_NAME}`;
  const html = invoiceEmailHtml(invoice);

  if (!connection) {
    logger.warn({ invoice: invoice.invoiceNumber }, 'No Gmail connection — invoice email not sent (draft)');
    return { status: 'DRAFT', messageId: null, pdfUrl };
  }

  // Fetch the PDF bytes for the attachment.
  let attachments = [];
  try {
    const resp = await fetch(pdfUrl);
    const buf = Buffer.from(await resp.arrayBuffer());
    attachments = [
      { filename: `${invoice.invoiceNumber}.pdf`, content: buf.toString('base64'), mimeType: 'application/pdf' },
    ];
  } catch (err) {
    logger.warn({ err }, 'Could not fetch invoice PDF for attachment; sending without it');
  }

  const { messageId } = await sendEmail(connection, { to: invoice.customer.email, subject, html, attachments });
  return { status: 'SENT', messageId, pdfUrl };
}
