# Clearway

**Logistics & customs-brokerage operations platform.** Clearway sits between vendors / customs brokers (e.g. C.H. Robinson) and end customers. It ingests shipment, customs and broker-invoice documents from Gmail, extracts the data with AI, organises everything into **Projects → Shipments → Documents → Invoices → Payments**, adds the middleman commission, emails branded invoices to customers, and auto-reconciles payment confirmations back from Gmail.

> Built from a real-world workflow: an exporter (NFK) whose US broker (C.H. Robinson) clears goods for end customers (Offprice Imports, Deira Trading, brands like Carhart & George). The platform replaces the handwritten "NEW ACCOUNT" ledger.

---

## Monorepo layout

```
clearway/
├── server/          # Node + Express REST API (JavaScript, ESM)
│   ├── prisma/      # Prisma schema + seed (Neon PostgreSQL)
│   └── src/
│       ├── config/      # env, db, logger, cloudinary, openai, gmail
│       ├── middleware/  # auth (JWT), rbac, error handler, validation, rate limit
│       ├── utils/       # ApiError, asyncHandler, response, invoice numbering
│       ├── modules/     # feature modules (route + controller + service + schema)
│       ├── services/    # integrations: cloudinary, openai, gmail, email, pdf
│       └── jobs/        # cron / background workers (gmail sync, payment match)
├── web/             # React + Vite + Tailwind SPA (JavaScript)
│   └── src/
│       ├── components/  # ui primitives, layout shell, charts
│       ├── pages/       # route screens
│       ├── lib/         # api client, query client, helpers
│       └── store/       # auth state
└── docs/            # ARCHITECTURE, API, ROADMAP
```

## Tech stack

| Layer        | Choice                                                |
|--------------|-------------------------------------------------------|
| Frontend     | React 18, Vite, Tailwind CSS, React Query, Recharts, Framer Motion |
| Backend      | Node 20, Express 4, Prisma ORM                        |
| Database     | Neon PostgreSQL (serverless)                          |
| File storage | Cloudinary                                            |
| Auth         | JWT (access + refresh) + role-based access control    |
| AI           | OpenAI (document classification + structured extraction) |
| Email        | Gmail API (OAuth2: read, attachments, send, watch)    |
| Deploy       | Web → Vercel · API → Render/Railway · DB → Neon       |

## Quick start

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Configure environment
cp server/.env.example server/.env
cp web/.env.example web/.env
#   → fill in DATABASE_URL (Neon), JWT secrets, Cloudinary, OpenAI, Google OAuth

# 3. Create the database schema + seed an admin user
npm run db:generate
npm run db:migrate
npm run db:seed        # creates admin@clearway.app / ChangeMe123!

# 4. Run both apps
npm run dev            # API on :4000, web on :5173
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, data model, AI pipeline
- [`docs/API.md`](docs/API.md) — REST endpoint reference
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — implementation status of all 16 modules + next steps

## Status

This repository is a **production-grade foundation**: full schema, auth + RBAC, core CRUD modules (customers, projects, shipments, invoices, dashboard), the integration service layer, and the complete premium UI shell. The AI/Gmail automation pipeline is wired with real service interfaces and clearly marked extension points. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for exactly what is done vs. next.
