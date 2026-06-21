# Architecture

## Overview

Clearway is a two-tier app: a stateless Express REST API and a React SPA, backed by Neon PostgreSQL, Cloudinary (files), OpenAI (extraction) and the Gmail API (ingest + send).

```
                         ┌──────────────────────────────┐
   Gmail inbox  ───────► │  Cron job (every 5 min)       │
                         │  syncInbox()                  │
                         └──────────────┬───────────────┘
                                        ▼
  ┌──────────────┐   classify   ┌───────────────┐  extract   ┌──────────────┐
  │  Email       │ ───────────► │ OpenAI service│ ─────────► │  Documents   │
  │  (stored)    │              └───────────────┘            │ + Shipments  │
  └──────────────┘                                           └──────┬───────┘
        │ PAYMENT_CONFIRMATION                                       │
        ▼                                                            ▼
  ┌──────────────┐    match invoice    ┌──────────────┐      ┌──────────────┐
  │ extractPay() │ ──────────────────► │   Payments   │ ───► │   Invoices   │
  └──────────────┘                     └──────────────┘ recon└──────────────┘
```

## Backend layering

Each feature lives in `server/src/modules/<name>/` and follows a consistent shape:

- **`*.routes.js`** — Express router; wires middleware (`authenticate`, `authorize`, `validate`).
- **`*.controller.js`** — thin HTTP layer; calls services, shapes responses.
- **`*.service.js`** — business logic, DB access, side effects.
- **`*.validation.js`** — Zod schemas for body/query/params.

Cross-cutting concerns:

- **`config/`** — validated env (`env.js`), Prisma client, pino logger, Cloudinary/OpenAI clients. Feature flags (`features.cloudinary`, etc.) let integrations degrade gracefully when keys are absent.
- **`middleware/`** — `auth` (JWT verify), `rbac` (role gates), `validate`, `error` (central translator: Zod + Prisma → clean JSON), `rateLimit`.
- **`services/`** — integration + orchestration: `cloudinary`, `openai`, `gmail`, `email`, `pdf`, `emailProcessor` (the automation brain), `activity` (audit trail).
- **`jobs/`** — `node-cron` schedules: Gmail sync (5 min) + overdue-invoice sweep (daily).

### Why this shape

- **Testable** — services have no `req`/`res`; they take plain args.
- **Reusable** — `recordPayment()` is called by both the manual API and the AI payment detector. `generateInvoicePdf()` by both the "Generate PDF" and "Send" actions.
- **Safe degradation** — no Cloudinary/OpenAI/Gmail key? The app still boots and the relevant features no-op with a logged warning instead of crashing.

## Data model (the spine)

A `Shipment` carries the **cross-document join keys** observed in the real paperwork:

| Field             | Source document                  | Example            |
|-------------------|----------------------------------|--------------------|
| `shipmentNumber`  | C.H. Robinson invoice            | `550773455`        |
| `arsNumber`       | broker reference                 | `Ars-060-26`       |
| `entryNumber`     | CBP Form 7501                    | `791-5968629-9`    |
| `containerNumber` | broker invoice                   | `TCNU5487540`      |
| `blNumber`        | 7501 / bill of lading            | `HLCUKHI260348810` |
| `nfkRef`          | internal ledger                  | `281/24-25`        |

When a new document/email arrives, `matchOrCreateShipment()` matches on any of these keys (`OR`) so the broker invoice and the 7501 for the same container converge onto **one** shipment automatically.

`Project (1)─(N) Shipment (N)─(N via Invoice) Customer`. Money lives on `Invoice` as `Decimal(14,2)` with a separate `commissionType/Rate/Amount` so the markup is always auditable and recomputable.

## AI extraction pipeline

1. **Classify** — `classifyEmail()` → one of the email categories.
2. **Store** — raw email + AI analysis + confidence persisted (audit).
3. **Extract** — each attachment → Cloudinary, then `extractDocumentData()` returns structured fields against a fixed JSON schema (strict `response_format: json_object`, `temperature: 0`).
4. **Reconcile** — `matchOrCreateShipment()` links the document; `PAYMENT_CONFIRMATION` → `extractPaymentInfo()` → `recordPayment()`; `DISPUTE` → opens a dispute.
5. **Confidence** — every extraction stores a `0..1` confidence so a human-review queue can gate low-confidence parses (see ROADMAP).

> **OCR note:** PDFs are stored on Cloudinary and the text layer is passed to OpenAI. For scanned/image PDFs, wire a text layer (`pdf-parse` for digital PDFs, or Cloudinary's OCR add-on / a vision model for scans) where `emailProcessor` currently passes the email body as fallback context. This is the single most impactful next step — flagged in ROADMAP.

## Auth

- Access token (JWT, 15 min) + refresh token (opaque, stored in `RefreshToken`, rotated on use, revocable).
- The SPA stores tokens in `localStorage` (zustand `persist`); the axios client refreshes transparently on `401` and queues concurrent requests behind a single refresh.
- RBAC: `ADMIN` (full), `OPS` (manage operational data), `VIEWER` (read-only). The first registered user is auto-promoted to `ADMIN`.

## Frontend

- Vite + React + Tailwind. Theming via CSS variables (HSL channels) → `dark`/`light` class toggle, full Tailwind opacity support.
- Data layer: React Query with generic `useList/useItem/useCreate/useUpdate/useRemove` hooks keyed by resource path.
- Design system in `components/ui/*` (Button, Card, Table, Badge, Input, Modal, Skeleton, EmptyState…) — composed into pages. Framer Motion for modal/drawer/page transitions.
