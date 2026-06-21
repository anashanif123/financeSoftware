# Implementation status & roadmap

This foundation is **runnable and verified** (frontend builds, backend import graph + Prisma schema validate). Below is an honest module-by-module status mapped to your 16-module spec, plus the highest-leverage next steps.

## Status by module

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Authentication | ✅ Done | JWT access+refresh, rotation, RBAC, login/register/forgot pages |
| 2 | Dashboard | ✅ Done | Cards + 4 trend charts + recent feeds, live aggregations |
| 3 | Gmail integration | ✅ Done | OAuth connect/disconnect/status, settings UI |
| 4 | Email processor | ✅ Done | Fetch, decode, store, idempotent by `gmailMessageId` |
| 5 | AI document processing | ✅ Core | Classify + structured extract wired; **needs PDF→text OCR** (see below) |
| 6 | Project management | ✅ Done | CRUD, archive, detail view |
| 7 | Shipment management | ✅ Done | CRUD + auto-create from email, cross-doc key matching |
| 8 | Document center | ✅ Done | Upload→Cloudinary, list/filter/preview/download |
| 9 | Invoice management | ✅ Done | Auto-numbering, statuses, items, detail view |
| 10 | Commission system | ✅ Done | Flat / %, **per-container** (matches ledger), one-click toggle |
| 11 | PDF generator | ✅ Done | Branded PDF via PDFKit → Cloudinary |
| 12 | Email invoice delivery | ✅ Done | Generate→attach→send via Gmail, delivery status + log |
| 13 | Payment detection | ✅ Core | `extractPaymentInfo`→match→`recordPayment`; cron-driven |
| 14 | Dispute management | ✅ Core | Auto-open on `DISPUTE` category + manual CRUD |
| 15 | Activity timeline | ✅ Done | Append-only audit log on every state change |
| 16 | Reporting | 🟡 Partial | Dashboard aggregations done; **CSV/Excel/PDF export endpoints pending** |

## Highest-leverage next steps (in order)

1. **PDF text extraction (OCR).** The biggest win. Today `emailProcessor` passes the email body to OpenAI as fallback. Add:
   - `pdf-parse` for digital PDFs (broker invoices like C.H. Robinson are text-based).
   - A vision model or Cloudinary OCR add-on for scanned docs (e.g. handwritten ledgers, stamped 7501s).
   - Then feed real document text into `extractDocumentData()`. Hook point: `services/emailProcessor.service.js` → attachment loop.

2. **Reporting export endpoints (Module 16).** Add `/reports/:type?format=csv|xlsx|pdf` using a streaming CSV writer + `exceljs` + the existing PDF service. Reports: revenue, invoice, project, shipment, payment, commission, outstanding, monthly.

3. **Human-review queue for low-confidence AI.** Every extraction stores `aiConfidence`. Add a "Needs review" filter + an approval step before an auto-created invoice leaves `DRAFT`. Prevents bad data from a single mis-parse.

4. **Invoice builder UI.** Backend create-invoice (with items + commission) is complete; add a "New invoice" modal/page that pre-fills line items from a selected shipment's extracted broker charges.

5. **Gmail push (watch) instead of polling.** Swap the 5-min cron for Gmail `users.watch` + Pub/Sub for near-real-time ingest using the stored `historyId`.

6. **Password reset delivery.** `requestPasswordReset()` is stubbed; issue a signed token and send via `email.service.js`.

7. **Reconciliation view.** Compare broker-invoice total vs. our invoice vs. payments received; auto-flag mismatches into the dispute module (recommended enhancement).

8. **Hardening for scale.** Move invoice numbering to a Postgres sequence/advisory lock; add request tracing IDs; add tests (Vitest + Supertest); split the frontend bundle (lazy-load Recharts/routes).

## Known simplifications

- Auth tokens live in `localStorage` (simple, XSS-exposed). For higher security, move refresh tokens to httpOnly cookies.
- The frontend bundle is single-chunk (~260 kB gzip). Route-level `React.lazy` will cut initial load.
- No automated tests yet — the structure (pure services) is designed to make them easy.
