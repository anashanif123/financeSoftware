# Clearway — End-to-End Testing Guide

A complete, click-by-click guide to test the whole product, understand how every
field connects, and demo it to a client with confidence.

- **Web app:** https://finance-software-web.vercel.app
- **Login (seed admin):** `admin@clearway.app` / `ChangeMe123!`
- **Connected Gmail inbox (where documents/payments arrive):** `opmode56@gmail.com`

---

## 1. The big picture — one continuous chain

```
Customer  →  Project(s)  →  Shipment  →  Invoice  →  Payment / Dispute
 (buyer)     (brand/job)   (container,    (base cost
                            from docs)     + your commission)
```

The "magic": a broker/customs **document arrives by email**, the **AI reads it**,
a **Shipment** is created with the data, you add your **commission** and **send an
invoice**, and when the customer pays, the **payment email auto-marks it paid**.

---

## 2. Before you start (one-time setup)

1. **Login** with the admin account above.
2. **Settings → Security → Change password** — replace the default before handoff.
3. **Settings → Company identity** — set your **company name, billing email, address**
   and **upload your logo**. These print on every invoice PDF.
4. **Settings → Gmail integration** — confirm it shows **Connected** (`opmode56@gmail.com`).
   If not, click **Connect Gmail** (admin only).

---

## 3. Data model & field connections (reference)

Read this once — it explains what each field is wired to.

### Customer  *(the end buyer — e.g. DEIRA TRADING, OFFPRICE)*
| Field | Connects to / used for |
|---|---|
| name, code | shown everywhere; selectable in New Shipment & New Invoice |
| **email** | the address invoices are **sent** to |
| contact, address, country | printed on the invoice "Bill to" |

→ A customer **has many** Projects, Shipments, Invoices.

### Project  *(a brand / job — e.g. CARHART, GEORGE)*
| Field | Connects to |
|---|---|
| name, code, status | selectable in Shipment "Projects" and New Invoice |
| customer (optional) | groups the project under a customer |

→ **Many-to-many with Shipment** (one shipment can serve several brands/projects).

### Shipment  *(the physical container / customs entry — the "spine")*
| Field | Connects to |
|---|---|
| **shipmentNumber, entryNumber, arsNumber, blNumber** | **join keys** — documents auto-link to the same shipment by these |
| containerNumber, containerType, **containerCount** | `containerCount` drives **per-container commission** (× 1400) |
| vessel, voyage, originPort, destinationPort, dates, commodity | printed on the invoice "Shipment details" |
| customer, **projects[]** | who it's for; which brands it serves |

→ Has many Documents and Invoices.

### Document  *(the file — CBP 7501, C.H. Robinson invoice)*
| Field | Connects to |
|---|---|
| type (BROKER_INVOICE / CUSTOMS_DOCUMENT / …) | decided by the AI from the document itself |
| **extractedData** (charges, entry#, totalAmount) | feeds the Shipment fields and the invoice **base cost** |
| aiConfidence, reviewStatus | low-confidence/critical docs go to the **Review** queue |

→ Belongs to a Shipment and the Email it came from.

### Invoice  *(your bill to the customer)*
| Field | Connects to |
|---|---|
| invoiceNumber | auto-generated (INV-YYYY-####) |
| **baseCost** | sum of the shipment's document charges (duties + broker fees) |
| commissionType, commissionRate, **commissionAmount** | your margin; PER_CONTAINER = rate × shipment containers |
| **totalAmount** | baseCost + commissionAmount |
| amountPaid, status | updated by Payments |
| customer, project, shipment, items[] | what the invoice is built from |

### Payment
| Field | Connects to |
|---|---|
| amount, method, reference, paidAt | reduces the invoice's outstanding |
| detectedByAi | true when auto-read from a Gmail payment email |

→ When `amountPaid ≥ totalAmount`, the invoice flips to **PAID**.

### Dispute
| Field | Connects to |
|---|---|
| title, type, status, resolution | a customer billing issue |

→ **Raised by the customer** (auto-opened from their email). The agent only **resolves** it.

---

## 4. End-to-end test (step by step)

> Tip: keep the **Dashboard** open in one tab to watch counts/activity update.

### STEP 0 — Empty state
- Open **Dashboard** → every number should be **0**. (Clean slate.)

### STEP 1 — Add a customer
- **Customers** (top of sidebar) → **New customer**
- Enter: **name** (e.g. `DEIRA TRADING`), **email** (use a real inbox you control — the test invoice goes here), country.
- ✅ Appears in the Customers list, and is now selectable in shipments/invoices.

### STEP 2 — Add projects (brands)
- **Projects → New project** → create `CARHART`, `GEORGE`, `APRON`.
- ✅ These can now be assigned to a shipment and chosen on an invoice.

### STEP 3 — Send a document email (the core test)
- From any email, send to **opmode56@gmail.com** with a **PDF/photo** of a real
  **C.H. Robinson invoice** or **CBP 7501** attached. Subject can be anything.
- In the app: **Inbox → Sync now** (or wait ~2 min for the auto-sync).
- ✅ **Inbox:** the email appears with the AI **category**.
- ✅ **Documents:** the file appears with **extracted data** (entry#, ARS#, charges).
- ✅ **Shipments:** a shipment is **auto-created** with the join keys filled.
- ✅ **Review:** the document waits here (critical docs always need a human check).

*(No email handy? Use **Documents → Upload** to add a PDF/image directly — the AI reads it the same way.)*

### STEP 4 — Review the AI extraction
- **Review** → check the extracted values against the document.
- If correct → **Approve**. If wrong → **Reject**. (A re-sent same document shows a **DUPLICATE** badge.)

### STEP 5 — Assign ARS # and projects on the shipment
- Open the shipment (from Review's "assign" link, or **Shipments**).
- In **Assign details**: set **ARS #**, **NFK Ref**, **Containers**, and tick the
  **projects** this shipment serves → **Save**.
- ✅ This is the "is shipment ke ye projects hain" step.

### STEP 6 — Create the invoice (one click)
- On the shipment, click **Create invoice**.
- ✅ Base cost is taken from the document charges; your **per-container commission**
  (× 1400) is added automatically. You land on the new invoice.

### STEP 7 — Commission, PDF, send
- On the invoice, in **Your commission**: choose **Flat amount** (exact $) or
  **Per container**, type the rate, watch the **live "Commission will be $X"**, then
  **Save commission**. (The top-right toggle just turns it on/off.)
- Click **Generate PDF** → open it: company header + logo, bill-to, amount due,
  shipment details, containers, rates table, totals.
- Click **Send invoice** → it emails the customer (the email from STEP 1) with the PDF.
- ✅ Status becomes **SENT**; customer receives the invoice + number.

### STEP 8 — Payment → auto PAID
- **Auto:** email **opmode56@gmail.com** with subject like
  `Payment for INV-2026-XXXX` and body `Wired USD 1665 for INV-2026-XXXX, ref FT123`
  → **Inbox → Sync now**.
- **Manual:** **Payments → Record payment** → pick the invoice → amount → save.
- ✅ A payment appears; the invoice flips to **PAID**; Dashboard revenue/outstanding update.

### STEP 9 — Customer workspace
- **Customers** → click the customer → see **Total billed / Received / Outstanding**
  and tabs for **Invoices / Shipments / Projects** — everything for that customer in one place.

### STEP 10 — Ledger (your NFK New Account, automatic)
- **Ledger** → the full register: Project, No. Ctr, NFK Ref, ARS #, Duties, COM,
  Total, Received, O/S, with a TOTAL row. **Export CSV / Excel** anytime.

### STEP 11 — Dispute (customer-raised)
- A customer email mentioning a wrong amount auto-opens a dispute in **Disputes**.
- Click it → set status + write the **resolution** → Save.

---

## 5. What runs automatically

- **Gmail sync** every **2 minutes** (or on-demand via **Inbox → Sync now**):
  reads new emails, OCRs document attachments, creates/links shipments, and
  auto-records payments from confirmation emails.
- **Overdue sweep** daily: invoices past their due date become **OVERDUE**
  (shown under Dashboard → "Needs attention").
- A payment is only auto-applied when the AI is **confident** (else it's left for
  manual review) — so a wrong email never marks the wrong invoice paid.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| Email not appearing | It must reach **opmode56@gmail.com** inbox (not spam); click **Sync now**; wait ~10s |
| Shipment not auto-created | The document needs a join key (entry# / ARS# / BL# / shipment#) |
| OCR didn't read it | Attachment must be **PDF or image** (zip/other formats are skipped) |
| Invoice won't send | The **customer needs an email** on file |
| Gmail connect fails (prod) | The redirect URI must be in Google Cloud → Credentials |

---

## 7. Optional: quick API smoke test (curl)

```bash
API=https://clearway-api.onrender.com
TOKEN=$(curl -s -X POST $API/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@clearway.app","password":"ChangeMe123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s $API/health
curl -s "$API/api/v1/dashboard/stats"   -H "Authorization: Bearer $TOKEN"
curl -s "$API/api/v1/reports/ledger"     -H "Authorization: Bearer $TOKEN"
```
