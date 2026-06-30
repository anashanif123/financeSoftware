import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { logActivity } from './activity.service.js';
import { uploadBuffer } from './cloudinary.service.js';
import {
  classifyEmail,
  extractDocumentData,
  extractDocumentDataFromImages,
  extractPaymentInfo,
} from './openai.service.js';
import { recordPayment, findInvoiceForPayment } from '../modules/payments/payment.service.js';
import { fetchMessages, downloadAttachment, getActiveConnection } from './gmail.service.js';
import { extractPdfText, hasUsableText, isPdf, isImage, reviewStatusFor } from './documentText.service.js';
import { pageImageUrls } from './cloudinary.service.js';

const CATEGORY_TO_DOC_TYPE = {
  SHIPMENT_DOCUMENT: 'SHIPMENT_DOCUMENT',
  CUSTOMS_DOCUMENT: 'CUSTOMS_DOCUMENT',
  BROKER_INVOICE: 'BROKER_INVOICE',
  FREIGHT_INVOICE: 'FREIGHT_INVOICE',
  PAYMENT_CONFIRMATION: 'PAYMENT_RECEIPT',
};

// Read a single attachment with the best available method and return both the
// structured extraction and any raw text we recovered (stored for audit/search).
async function extractFromAttachment({ buffer, att, uploaded, emailText, hint }) {
  // 1) Digital PDF — embedded text is exact and cheap.
  if (isPdf(att.mimeType, att.filename)) {
    const text = await extractPdfText(buffer);
    if (hasUsableText(text)) {
      const extracted = await extractDocumentData(text, hint);
      return { extracted: { ...extracted, _source: 'pdf-text' }, docText: text };
    }
    // 2) Scanned PDF — OCR its rendered pages with the vision model.
    const urls = pageImageUrls(uploaded.publicId, uploaded.pages || 1);
    if (urls.length) {
      const extracted = await extractDocumentDataFromImages(urls, hint);
      return { extracted: { ...extracted, _source: 'vision-ocr' }, docText: text || null };
    }
  }

  // 3) Image attachment (photo of a doc) — vision directly.
  if (isImage(att.mimeType, att.filename)) {
    const extracted = await extractDocumentDataFromImages([uploaded.url], hint);
    return { extracted: { ...extracted, _source: 'vision-ocr' }, docText: null };
  }

  // 4) Last resort — fall back to the email body so we never lose all context.
  const extracted = await extractDocumentData(emailText, hint);
  return { extracted: { ...extracted, _source: 'email-body' }, docText: null };
}

// Find or create the shipment that a document/email belongs to, matching on
// the cross-document join keys (ARS #, entry #, shipment #, B/L #).
async function matchOrCreateShipment(extracted) {
  if (!extracted) return { shipment: null, isNew: false };
  const keys = [
    extracted.shipmentNumber && { shipmentNumber: extracted.shipmentNumber },
    extracted.entryNumber && { entryNumber: extracted.entryNumber },
    extracted.arsNumber && { arsNumber: extracted.arsNumber },
    extracted.blNumber && { blNumber: extracted.blNumber },
  ].filter(Boolean);
  if (!keys.length) return { shipment: null, isNew: false };

  const found = await prisma.shipment.findFirst({ where: { OR: keys } });
  if (found) return { shipment: found, isNew: false };

  const created = await prisma.shipment.create({
    data: {
      shipmentNumber: extracted.shipmentNumber || null,
      entryNumber: extracted.entryNumber || null,
      arsNumber: extracted.arsNumber || null,
      blNumber: extracted.blNumber || null,
      containerNumber: extracted.containerNumber || null,
      containerType: extracted.containerType || null,
      containerCount: extracted.containerCount || 1,
      vessel: extracted.vessel || null,
      voyage: extracted.voyage || null,
      carrier: extracted.carrier || null,
      originPort: extracted.originPort || null,
      destinationPort: extracted.destinationPort || null,
      countryOfOrigin: extracted.countryOfOrigin || null,
      commodity: extracted.commodity || null,
      weightKg: extracted.weightKg || null,
      cartonCount: extracted.cartonCount || null,
      status: 'PROCESSING',
    },
  });
  await logActivity({
    type: 'SHIPMENT_CREATED',
    description: `Shipment ${created.shipmentNumber || created.arsNumber || created.id} auto-created from email`,
    entityType: 'Shipment',
    entityId: created.id,
    metadata: { source: 'gmail' },
  });
  return { shipment: created, isNew: true };
}

// Doc types that must ALWAYS be human-reviewed (the operator assigns the ARS #,
// links projects, and confirms the figures before they feed an invoice).
const ALWAYS_REVIEW_TYPES = new Set([
  'SHIPMENT_DOCUMENT',
  'CUSTOMS_DOCUMENT',
  'BROKER_INVOICE',
  'FREIGHT_INVOICE',
]);

// Has this exact source document already been ingested? Match on the strongest
// identifiers AND the same doc type — so a re-sent 7501 is a duplicate, but the
// 7501 and the broker invoice for the same shipment are NOT (different types).
async function findDuplicateDocument(extracted, docType) {
  if (!extracted) return null;
  const ors = [];
  for (const f of ['entryNumber', 'blNumber', 'shipmentNumber', 'arsNumber']) {
    if (extracted[f]) ors.push({ extractedData: { path: [f], equals: extracted[f] } });
  }
  if (!ors.length) return null;
  return prisma.document.findFirst({ where: { type: docType, OR: ors }, orderBy: { createdAt: 'asc' } });
}

// Process a single normalised email record end-to-end.
export async function processEmail(connection, msg) {
  const existing = await prisma.email.findUnique({ where: { gmailMessageId: msg.gmailMessageId } });
  if (existing) return existing; // idempotent — never double-process

  const classification = await classifyEmail({ subject: msg.subject, from: msg.fromAddress, body: msg.body });

  const email = await prisma.email.create({
    data: {
      gmailMessageId: msg.gmailMessageId,
      threadId: msg.threadId,
      fromAddress: msg.fromAddress,
      fromName: msg.fromName,
      toAddress: msg.toAddress,
      subject: msg.subject,
      snippet: msg.snippet,
      body: msg.body,
      category: classification.category || 'UNCLASSIFIED',
      aiAnalysis: classification,
      aiConfidence: classification.confidence ?? null,
      receivedAt: msg.receivedAt,
    },
  });
  await logActivity({
    type: 'EMAIL_CLASSIFIED',
    description: `Email "${msg.subject || '(no subject)'}" classified as ${email.category}`,
    entityType: 'Email',
    entityId: email.id,
  });

  let shipment = null;

  // 1) Process attachments → Cloudinary + AI extraction → Document + Shipment.
  for (const att of msg.attachments || []) {
    try {
      const buffer = await downloadAttachment(connection, msg.gmailMessageId, att.attachmentId);

      // Skip only true junk: tiny tracking pixels / inline icons (< 6 KB). Every real
      // document — even a compressed WhatsApp photo — is comfortably larger.
      if (isImage(att.mimeType, att.filename) && !isPdf(att.mimeType, att.filename) && buffer.length < 6_000) {
        continue;
      }

      const uploaded = await uploadBuffer(buffer, { folder: 'documents', filename: att.filename, mimeType: att.mimeType });

      // ── OCR pipeline ── read the ACTUAL document, not just the email body:
      //  1. Digital PDF → pdf-parse text → structured extraction.
      //  2. Scanned PDF / image → vision OCR on Cloudinary page images.
      //  3. Fallback → email body (so we never lose context entirely).
      const hint = `Attachment: ${att.filename} (${att.mimeType || 'unknown'})`;
      const { extracted, docText } = await extractFromAttachment({
        buffer,
        att,
        uploaded,
        emailText: msg.body || msg.snippet || '',
        hint,
      });
      // Trust the DOCUMENT's own extracted type over the email category — a broker
      // invoice attached to a generic email is still a BROKER_INVOICE, not a shipment doc.
      const docType =
        CATEGORY_TO_DOC_TYPE[extracted?.documentType] || CATEGORY_TO_DOC_TYPE[email.category] || 'OTHER';

      if (!shipment) {
        const match = await matchOrCreateShipment(extracted);
        shipment = match.shipment;
      }

      // Duplicate guard: flag if this same document type + identifiers already exist.
      const duplicateOf = await findDuplicateDocument(extracted, docType);

      // Route to the human review queue when it's a critical doc, a duplicate, or
      // the AI was not confident. Otherwise auto-trust high-confidence extractions.
      const reviewStatus =
        ALWAYS_REVIEW_TYPES.has(docType) || duplicateOf
          ? 'PENDING'
          : reviewStatusFor(extracted?.confidence);

      await prisma.document.create({
        data: {
          type: docType,
          fileName: att.filename,
          mimeType: att.mimeType,
          sizeBytes: buffer.length,
          cloudinaryUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          pageCount: uploaded.pages || null,
          extractedText: docText || null,
          extractedData: { ...(extracted || {}), _duplicateOf: duplicateOf?.id || null },
          aiConfidence: extracted?.confidence ?? null,
          reviewStatus,
          reviewNote: duplicateOf ? `Possible duplicate of document ${duplicateOf.id}` : null,
          emailId: email.id,
          shipmentId: shipment?.id || null,
        },
      });
      await logActivity({
        type: 'DOCUMENT_EXTRACTED',
        description: duplicateOf
          ? `⚠️ Possible DUPLICATE "${att.filename}" (${docType})`
          : `Document "${att.filename}" processed (${docType})`,
        entityType: 'Document',
        entityId: email.id,
      });
    } catch (err) {
      logger.error({ err, file: att.filename }, 'Attachment processing failed');
    }
  }

  // 2) Payment confirmation → match invoice → record payment (Module 13).
  // Read the email body AND any attached receipt (bank wire PDF / image), since
  // clients often send confirmation as an attachment with little body text.
  const paymentDocs = await prisma.document.findMany({
    where: { emailId: email.id },
    select: { extractedText: true, extractedData: true },
  });
  const hasPaymentDoc = paymentDocs.some((d) => d.extractedData?.documentType === 'PAYMENT_CONFIRMATION');
  if (email.category === 'PAYMENT_CONFIRMATION' || hasPaymentDoc) {
    await tryAutoPayment(email, paymentDocs);
  }

  // 3) Dispute keywords → open a dispute (Module 14).
  if (email.category === 'DISPUTE') {
    const dispute = await prisma.dispute.create({
      data: {
        title: msg.subject || 'Customer dispute',
        type: 'INVOICE_ISSUE',
        description: msg.snippet,
        emailId: email.id,
      },
    });
    await logActivity({ type: 'DISPUTE_OPENED', description: `Dispute auto-opened: ${dispute.title}`, entityType: 'Dispute', entityId: dispute.id });
  }

  await prisma.email.update({
    where: { id: email.id },
    data: { processed: true, processedAt: new Date(), shipmentId: shipment?.id || null },
  });
  return email;
}

// Confidence floor for auto-applying a detected payment. Below this we record
// nothing and leave a warning so a human can reconcile manually.
const AUTO_PAYMENT_MIN_CONFIDENCE = 0.8;

async function tryAutoPayment(email, docs = []) {
  // Feed the body + any attached-receipt text into the payment extractor.
  const docText = docs.map((d) => d.extractedText).filter(Boolean).join('\n');
  const info = await extractPaymentInfo({
    subject: email.subject,
    body: `${email.body || ''}\n${docText}`.slice(0, 6000),
  });
  // Fallback: an image receipt has no parseable text, but the vision OCR already
  // captured the invoice number / total into the document's extractedData.
  if (!info.invoiceNumber) {
    const num = docs.map((d) => d.extractedData?.invoiceNumbers?.[0]).find(Boolean);
    if (num) info.invoiceNumber = num;
  }
  if (!info.amount) {
    const amt = docs.map((d) => d.extractedData?.totalAmount).find(Boolean);
    if (amt) info.amount = amt;
  }
  if (!info?.amount) return;

  const match = await findInvoiceForPayment({
    invoiceNumber: info.invoiceNumber,
    amount: info.amount,
    customerName: info.customerName,
    reference: info.reference,
  });

  if (!match.invoice) {
    logger.warn({ reason: match.reason, count: match.count, info }, 'Payment email could not be matched confidently');
    return;
  }
  if (match.confidence < AUTO_PAYMENT_MIN_CONFIDENCE) {
    logger.warn(
      { invoice: match.invoice.invoiceNumber, method: match.method, confidence: match.confidence },
      'Payment match below auto-apply threshold — left for manual review',
    );
    return;
  }

  await recordPayment({
    invoiceId: match.invoice.id,
    amount: info.amount,
    currency: info.currency || match.invoice.currency,
    reference: info.reference,
    paidAt: info.paidAt ? new Date(info.paidAt) : new Date(),
    emailId: email.id,
    detectedByAi: true,
  });
  logger.info(
    { invoice: match.invoice.invoiceNumber, method: match.method, confidence: match.confidence },
    'Auto-recorded payment from Gmail',
  );
}

// Pull + process a batch of inbox messages. Returns a summary.
export async function syncInbox({ query, max } = {}) {
  const connection = await getActiveConnection();
  if (!connection) return { connected: false, processed: 0 };

  const messages = await fetchMessages(connection, { query, max });
  let processed = 0;
  for (const msg of messages) {
    try {
      const before = await prisma.email.findUnique({ where: { gmailMessageId: msg.gmailMessageId } });
      await processEmail(connection, msg);
      if (!before) processed += 1;
    } catch (err) {
      logger.error({ err, id: msg.gmailMessageId }, 'Failed to process email');
    }
  }
  await prisma.gmailConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date() } });
  return { connected: true, fetched: messages.length, processed };
}
