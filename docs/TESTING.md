# Clearway — Full Testing Guide

Click-by-click guide to test the whole product end-to-end, understand how every
field connects, handle shared shipments & cost splits, and demo it confidently.

- **Web app:** https://finance-software-web.vercel.app
- **Login (admin):** `admin@clearway.app` / `ChangeMe123!`
- **Connected Gmail inbox (docs & payments arrive here):** `opmode56@gmail.com`
- **Sample documents:** in the repo `samples/` folder (PDFs you can email/upload)

---

## 1. The chain (how everything connects)

```
Customer  →  Project(s)  →  Shipment  →  Invoice  →  Payment / Dispute
 (buyer)     (brand/job)   (container,    (per customer:
                            from docs)     base cost + commission)
```

A broker/customs **document arrives by email** → the **AI reads it** → a **Shipment**
is created → you assign the customer & projects → **create an invoice** (charges +
your commission) → **send it** → when the customer pays, the **payment email
auto-marks it PAID**.

---

## 2. One-time setup (do before the demo)

1. **Login** (admin account above).
2. **Settings → Security → Change password** (replace the default).
3. **Settings → Company identity** — set **company name, email, address** and
   **upload your logo**. These print on every invoice PDF.
4. **Settings → Gmail** — confirm **Connected** (`opmode56@gmail.com`).
5. **Cloudinary** (so in-app PDF links open): Cloudinary Console → Settings →
   Security → enable **"PDF and ZIP files delivery"**. (Email PDF attachments work
   regardless; this only affects clicking a PDF link inside the app.)

---

## 3. Field connections (reference)

### Customer (end buyer — e.g. DEIRA TRADING)
- **email** → where invoices are sent · name/address → printed on "Bill to"
- Has many Projects, Shipments, Invoices.

### Project (brand / job — e.g. CARHART, GEORGE)
- Selectable on shipments and invoices. **Many-to-many with Shipment**
  (one shipment can serve several brands).

### Shipment (container / customs entry — the "spine")
- **Join keys** (shipmentNumber, entryNumber, arsNumber, blNumber) → documents
  auto-link to the same shipment by these.
- **containerCount** → drives per-container commission.
- vessel/voyage/ports/dates/commodity → printed on the invoice.
- Has many Documents and Invoices; links to a Customer and Projects.

### Document (7501, broker invoice, receipt)
- AI sets the **type** from the document itself.
- **extractedData** (charges, entry#, totals) → feeds the Shipment + the invoice
  line items / base cost.
- Low-confidence / critical docs go to the **Review** queue.

### Invoice (your bill to the customer)
- **baseCost** = the customer's duties + broker charges (line items)
- **commission** = rate × **this invoice's container share** (PER_CONTAINER), or
  Flat / Percentage
- **total** = baseCost + commission · paid/status updated by Payments
- Links to Customer (bill + email), Project, Shipment, Items, Payments.

### Payment
- amount / method / reference → reduces the invoice's outstanding.
- When amountPaid ≥ total → invoice flips to **PAID**.

### Dispute
- **Raised by the customer** (auto-opened from their email). The agent **resolves** it.

---

## 4. How cost is calculated

```
Invoice Total = Base cost (duties + broker charges)  +  Commission
```
Commission (you choose): **Per container** = rate × containers (e.g. 1400 × 2) ·
**Flat** = fixed $ · **Percentage** = base × %.

### Shared shipment (split across customers)
One shipment can be split. Make **one invoice per customer**, each with **that
customer's base cost + container share**. Commission is computed on each invoice's
own share.

Example — a 10-container shipment, 2 for A and 8 for B:

| Customer | Containers | Base (their duty) | Commission | Total |
|---|---|---|---|---|
| A | 2 | A's duties | 2 × 1400 = 2,800 | base + 2,800 |
| B | 8 | B's duties | 8 × 1400 = 11,200 | base + 11,200 |

Half-container works too (containers = 0.5 → 0.5 × 1400 = 700).

---

## 5. End-to-end test (step by step)

> Navigation: **Overview** (Dashboard, Ledger, Customers) · **Workflow** (Inbox,
> Review, Shipments, Documents) · **Finance** (Invoices, Payments, Disputes,
> Reports) · **Setup** (Projects).

### STEP 0 — Empty state
Dashboard → all numbers **0**.

### STEP 1 — Add a customer
Customers → **New customer** → name (e.g. `DEIRA TRADING`), **email = a real inbox
you control** (the test invoice goes here).

### STEP 2 — Add projects (brands)
Projects → **New project** → `CARHART`, `GEORGE`, `APRON`.

### STEP 3 — Send a document email
Email **opmode56@gmail.com** with a **PDF/photo** of a broker invoice or 7501.
Use the ready samples: `samples/CH-Robinson-Invoice.pdf`, `samples/CBP-7501-Entry-Summary.pdf`.
Then app → **Inbox → Sync now**.
- ✅ Inbox: email + AI category · Documents: extracted data · Shipments: a shipment
  auto-created · Review: the doc waits for you.

*(No email? Use **Documents → Upload** to add a PDF/image directly.)*

### STEP 4 — Review
Review → check the AI's values → **Approve** (or **Reject**). A re-sent same
document shows a **DUPLICATE** badge.

### STEP 5 — Edit & assign the shipment
Open the shipment → **Edit & assign**: fix any field the AI missed (B/L, container,
weight…), set **ARS #**, pick the **Customer**, and tick the **Projects** this
shipment serves → **Save**.

### STEP 6 — Create the invoice(s)
**Simple (one customer):** on the shipment click **Create invoice** → base cost &
charges come from the document, commission added → opens the invoice.

**Shared shipment (split):** Invoices → **New invoice** → pick the shipment → set
**Base cost** and **Containers** to *this customer's share* → **Create**. Repeat
per customer. (Live total preview shows base + commission.)

### STEP 7 — Commission, PDF, send
On the invoice → **Your commission**: choose Flat / Per-container, set the rate,
watch the live "Commission will be $X" → **Save commission** (top-right toggle just
turns it on/off). → **Generate PDF** (company header + logo, bill-to, amount due,
shipment details, containers, itemized rates, totals) → **Send invoice** (emails the
customer).

### STEP 8 — Payment → auto PAID
- **By text email:** email opmode56 → subject `Payment for INV-2026-XXXX`, body
  `Wired USD <amount> for INV-2026-XXXX, ref FT123` → **Inbox → Sync now**.
- **By receipt attachment:** email opmode56 with a bank receipt PDF/image (e.g.
  `samples/Payment-Receipt-INV-2026-0001.pdf`) → Sync now.
- **Manual:** Payments → **Record payment** → pick invoice → amount → save.
- ✅ Payment recorded · invoice → **PAID** · Dashboard updates.

### STEP 9 — Customer workspace
Customers → click a customer → **Total billed / Received / Outstanding** + tabs
(Invoices / Shipments / Projects) — everything for that customer in one place.

### STEP 10 — Ledger
Ledger → your **NFK New Account** register (Project, No. Ctr, NFK Ref, ARS #, Duties,
COM, Total, Received, O/S + TOTAL row). **Export CSV / Excel**.

### STEP 11 — Dispute
A customer email about a wrong amount auto-opens a dispute in **Disputes** → click
it → set status + **resolution** → Save.

---

## 6. What runs automatically
- **Gmail sync** every 2 min (or **Inbox → Sync now**): reads new emails, OCRs
  document attachments, creates/links shipments, auto-records payments from
  confirmation emails.
- **Overdue sweep** daily: past-due invoices → OVERDUE (Dashboard "needs attention").
- A payment is auto-applied only when the AI is **confident** (else left for manual
  review) — a wrong email never marks the wrong invoice paid.

---

## 7. Troubleshooting
| Symptom | Fix |
|---|---|
| Email not appearing | Must reach **opmode56@gmail.com** inbox (not spam); click **Sync now**; wait ~10s |
| Document not created | Attachment must be **PDF or image**, and > 6 KB |
| Shipment not auto-created | Document needs a join key (entry# / ARS# / BL# / shipment#) |
| AI read a field wrong | Open the shipment → **Edit & assign** and fix it (AI does ~80%, you confirm the rest) |
| Invoice won't send | Customer needs an **email** on file |
| PDF link 401 in app | Enable Cloudinary "PDF and ZIP files delivery" (Section 2.5) |

> Note: synced emails re-appear on the next sync because they're still in the Gmail
> inbox. For a truly empty inbox, delete the test emails inside opmode56@gmail.com.

---

## 8. Quick API smoke test
```bash
API=https://clearway-api.onrender.com
TOKEN=$(curl -s -X POST $API/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@clearway.app","password":"ChangeMe123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
curl -s $API/health
curl -s "$API/api/v1/dashboard/stats" -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/v1/reports/ledger"  -H "Authorization: Bearer $TOKEN"
```
