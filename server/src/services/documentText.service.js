import { createRequire } from 'module';
import { logger } from '../config/logger.js';

// pdf-parse v2 ships as CommonJS and exports a `PDFParse` class; load via createRequire.
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

// Extract embedded text from a digital (text-based) PDF buffer. Broker/freight
// invoices (e.g. C.H. Robinson) are digital and parse cleanly here. Scanned or
// photographed docs (CBP 7501, the handwritten ledger) return little/no text —
// the caller then falls back to vision OCR. Never throws; returns '' on failure.
export async function extractPdfText(buffer) {
  if (!buffer?.length) return '';
  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return (result.text || '').trim();
  } catch (err) {
    logger.warn({ err: err.message }, 'pdf-parse failed — will fall back to OCR');
    return '';
  } finally {
    await parser?.destroy?.().catch(() => {});
  }
}

// Heuristic: did pdf-parse yield enough real text to trust, or is this a scan?
export function hasUsableText(text) {
  if (!text) return false;
  const stripped = text.replace(/\s+/g, ' ').trim();
  // A real invoice/customs page has well over 100 chars of extractable text.
  return stripped.length >= 100;
}

const PDF_MIME = 'application/pdf';
const IMAGE_RE = /^image\//i;

// AI extractions at or above this confidence are auto-trusted; below it they
// land in the human review queue before feeding an invoice.
export const REVIEW_CONFIDENCE_THRESHOLD = 0.8;

// Decide the initial review state for a freshly extracted document.
export function reviewStatusFor(confidence) {
  const c = typeof confidence === 'number' ? confidence : 0;
  return c >= REVIEW_CONFIDENCE_THRESHOLD ? 'AUTO' : 'PENDING';
}

export function isPdf(mimeType, filename = '') {
  return mimeType === PDF_MIME || /\.pdf$/i.test(filename);
}

export function isImage(mimeType, filename = '') {
  return IMAGE_RE.test(mimeType || '') || /\.(png|jpe?g|gif|webp|tiff?)$/i.test(filename);
}
