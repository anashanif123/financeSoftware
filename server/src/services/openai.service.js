import { openai } from '../config/openai.js';
import { env, features } from '../config/env.js';
import { logger } from '../config/logger.js';

// ── AI document intelligence (Module 5) ──
// Two responsibilities:
//   1. classify(email|document) → category
//   2. extract structured shipment/invoice/payment fields from text
// All calls request strict JSON and degrade gracefully when no key is set.

const EXTRACTION_SYSTEM = `You are an expert customs & freight document parser for a brokerage (exporter NFK, US broker C.H. Robinson).
You read three document kinds — set "documentType" precisely:

1. CBP 7501 "Entry Summary" (customs) → documentType = CUSTOMS_DOCUMENT.
   Find: Entry Number (box 1, e.g. 791-5968629-9), Importer of Record (box 30), B/L or AWB (box 12),
   country of origin, commodity description, total Duty (box 41), MPF, and Total (box 44, e.g. 19,781.22).

2. C.H. Robinson broker invoice → documentType = BROKER_INVOICE.
   Find: Invoice Number (top), Shipment Number, Reference / Customer Reference (e.g. Ars-060-26),
   Entry Number, BL#, container number + type + QTY, consignee, the RATES & ACCESSORIALS lines
   (each description + amount), and Amount Due / Sub-Total.

3. Bill of lading / shipment doc → documentType = SHIPMENT_DOCUMENT (container, vessel, voyage, ports, BL).

RULES:
- Transcribe every number EXACTLY as printed; never round or guess digits.
- Use null for any field you cannot clearly read. NEVER invent a value.
- Put the broker reference like "Ars-060-26" in arsNumber.
- Set "confidence" honestly: lower it when the scan is blurry or a field is ambiguous.
Return ONLY valid JSON matching the requested schema.`;

// Shape we ask the model to fill. Mirrors the Shipment + Invoice columns.
const EXTRACTION_SCHEMA = {
  documentType:
    'one of SHIPMENT_DOCUMENT | CUSTOMS_DOCUMENT | BROKER_INVOICE | FREIGHT_INVOICE | PAYMENT_CONFIRMATION | OTHER',
  shipmentNumber: 'string|null',
  containerNumber: 'string|null',
  entryNumber: 'string|null',
  arsNumber: 'string|null (broker reference, e.g. Ars-060-26)',
  blNumber: 'string|null (bill of lading)',
  projectName: 'string|null',
  customerName: 'string|null (consignee / importer)',
  shipperName: 'string|null',
  originPort: 'string|null',
  destinationPort: 'string|null',
  vessel: 'string|null',
  voyage: 'string|null',
  carrier: 'string|null',
  commodity: 'string|null',
  containerType: 'string|null (e.g. 40HC)',
  containerCount: 'number|null',
  weightKg: 'number|null',
  cartonCount: 'number|null',
  invoiceNumbers: 'string[]',
  charges: 'array of { description: string, amount: number }',
  totalAmount: 'number|null',
  currency: 'string|null',
  referenceNumbers: 'string[]',
  confidence: 'number 0..1 — your confidence in this extraction',
};

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content?.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

export async function classifyEmail({ subject, from, body }) {
  if (!features.openai) return { category: 'UNCLASSIFIED', confidence: 0, disabled: true };
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Classify this freight-brokerage email into exactly one category and return JSON
{"category": one of SHIPMENT_DOCUMENT|CUSTOMS_DOCUMENT|BROKER_INVOICE|FREIGHT_INVOICE|PAYMENT_CONFIRMATION|DISPUTE|GENERAL, "confidence": 0..1, "reason": string}.
Payment confirmations mention wire transfer/payment sent/remittance. Disputes mention wrong amount/missing charge/billing issue.`,
      },
      { role: 'user', content: `From: ${from}\nSubject: ${subject}\n\n${(body || '').slice(0, 4000)}` },
    ],
  });
  return parseJson(completion.choices[0].message.content) || { category: 'UNCLASSIFIED', confidence: 0 };
}

// Extract structured fields from raw document/email text.
export async function extractDocumentData(text, hint = '') {
  if (!features.openai) return { confidence: 0, disabled: true };
  if (!text || text.trim().length < 20) return { confidence: 0, empty: true };

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      {
        role: 'user',
        content: `${hint ? `Context: ${hint}\n\n` : ''}Extract into this JSON schema:\n${JSON.stringify(
          EXTRACTION_SCHEMA,
          null,
          2,
        )}\n\n--- DOCUMENT TEXT ---\n${text.slice(0, 12000)}`,
      },
    ],
  });
  const data = parseJson(completion.choices[0].message.content);
  if (!data) logger.warn('OpenAI extraction returned unparseable content');
  return data || { confidence: 0 };
}

// Extract structured fields directly from document images (scanned PDFs / photos).
// The vision model OCRs and extracts in one pass — better than OCR→text→parse for
// stamped/handwritten docs (CBP 7501, the NFK ledger). `imageUrls` are public/signed
// image URLs (e.g. Cloudinary PDF pages rendered as JPG).
export async function extractDocumentDataFromImages(imageUrls = [], hint = '') {
  if (!features.openai) return { confidence: 0, disabled: true };
  const urls = (imageUrls || []).filter(Boolean).slice(0, 5); // cap pages/cost
  if (!urls.length) return { confidence: 0, empty: true };

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_VISION_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${hint ? `Context: ${hint}\n\n` : ''}Read this document (it may be a scan/photo) and extract into this JSON schema:\n${JSON.stringify(
              EXTRACTION_SCHEMA,
              null,
              2,
            )}`,
          },
          ...urls.map((url) => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
        ],
      },
    ],
  });
  const data = parseJson(completion.choices[0].message.content);
  if (!data) logger.warn('OpenAI vision extraction returned unparseable content');
  return data || { confidence: 0 };
}

// Detect payment details from a payment-confirmation email (Module 13).
export async function extractPaymentInfo({ subject, body }) {
  if (!features.openai) return { disabled: true };
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract payment details and return JSON
{"invoiceNumber": string|null, "amount": number|null, "currency": string|null, "customerName": string|null, "reference": string|null, "paidAt": ISO date|null, "confidence": 0..1}.`,
      },
      { role: 'user', content: `Subject: ${subject}\n\n${(body || '').slice(0, 4000)}` },
    ],
  });
  return parseJson(completion.choices[0].message.content) || { confidence: 0 };
}
