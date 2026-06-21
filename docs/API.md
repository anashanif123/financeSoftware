# API Reference

Base URL: `/api/v1`. All responses use a consistent envelope:

```jsonc
// success
{ "success": true, "data": <payload>, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
// error
{ "success": false, "error": { "message": "…", "details": { } } }
```

Authenticated routes require `Authorization: Bearer <accessToken>`. Write routes require role `ADMIN` or `OPS`.

List endpoints accept `?page`, `?limit` (max 100), `?search`, and resource-specific filters.

---

## Auth — `/auth`

| Method | Path                | Auth | Body                                   |
|--------|---------------------|------|----------------------------------------|
| POST   | `/register`         | —    | `{ email, password, name, role? }`     |
| POST   | `/login`            | —    | `{ email, password }`                  |
| POST   | `/refresh`          | —    | `{ refreshToken }`                     |
| POST   | `/logout`           | —    | `{ refreshToken }`                     |
| POST   | `/forgot-password`  | —    | `{ email }`                            |
| GET    | `/me`               | ✓    | —                                      |
| POST   | `/change-password`  | ✓    | `{ currentPassword, newPassword }`     |

Login/register return `{ user, accessToken, refreshToken }`.

## Dashboard — `/dashboard`

| Method | Path        | Returns                                                            |
|--------|-------------|-------------------------------------------------------------------|
| GET    | `/stats`    | `{ totalProjects, totalShipments, pendingInvoices, paidInvoices, revenue, outstanding, commissionEarned }` |
| GET    | `/charts?months=6` | per-month `[{ month, revenue, payments, invoices, shipments }]` |
| GET    | `/recent`   | `{ activities[], emails[], payments[] }`                          |

## Customers — `/customers`
CRUD. `GET /` supports `?search`. `POST/PATCH` body: `{ name, code?, email?, contactName?, contactPhone?, address?, country?, notes? }`.

## Projects — `/projects`
CRUD + `POST /:id/archive`. Filters: `?status`, `?customerId`, `?search`. Body: `{ name, code?, customerId?, description?, references?[], status? }`.

## Shipments — `/shipments`
CRUD. Filters: `?status`, `?projectId`, `?customerId`, `?search` (matches shipment/container/entry/ARS/BL). Body: all shipment fields (see schema).

## Invoices — `/invoices`

| Method | Path                       | Notes                                              |
|--------|----------------------------|----------------------------------------------------|
| GET    | `/`                        | `?status`, `?customerId`, `?projectId`, `?search`  |
| GET    | `/:id`                     | full invoice + items + payments                    |
| POST   | `/`                        | auto-numbers `INV-YYYY-NNNN`, computes commission  |
| PATCH  | `/:id`                     | status / dueDate / notes / currency                |
| PATCH  | `/:id/commission`          | `{ commissionType?, commissionRate? }` → recalcs   |
| POST   | `/:id/commission/toggle`   | one-click on/off (Module 10)                       |
| POST   | `/:id/pdf`                 | generates branded PDF → Cloudinary                 |
| POST   | `/:id/send`                | PDF + email to customer, sets `SENT`               |
| DELETE | `/:id`                     | —                                                  |

Create body:
```jsonc
{
  "customerId": "…", "projectId": "…", "shipmentId": "…",
  "currency": "USD",
  "commissionType": "PER_CONTAINER", "commissionRate": 1400,
  "items": [{ "description": "Customs Entry Service US", "category": "BROKER_FEE", "quantity": 1, "unitPrice": 120 }]
}
```

## Documents — `/documents`
`GET /` (`?type`, `?shipmentId`, `?projectId`, `?search`). `POST /` is `multipart/form-data` with `file` + optional `type`, `shipmentId`, `projectId`, `text` (for extraction). `DELETE /:id` also removes the Cloudinary asset.

## Emails — `/emails`
`GET /` (`?category`, `?processed`, `?search`), `GET /:id`. `POST /sync` triggers an on-demand Gmail pull → classify → extract.

## Payments — `/payments`
`GET /` (`?invoiceId`). `POST /` `{ invoiceId, amount, currency?, method?, reference?, paidAt?, notes? }` — reconciles the invoice status automatically.

## Disputes — `/disputes`
`GET /` (`?status`), `POST /`, `PATCH /:id` (`{ status?, resolution? }`).

## Activities — `/activities`
`GET /` (`?entityType`, `?entityId`, `?type`) — the audit timeline.

## Gmail — `/gmail`
`GET /status`, `GET /connect` (admin → returns OAuth URL), `GET /oauth/callback` (public, signed state), `POST /disconnect` (admin).

## Settings — `/settings`
`GET /` (company + commission defaults). `PUT /:key` (admin) upserts a setting value.

## Health
`GET /health` (unauthenticated liveness probe).
