# Mini ERP + CRM Operations Portal

Full-stack ERP/CRM system for a wholesale/distribution company — customers, products/inventory, and sales challans with role-based access.

**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL (backend) · React + Vite + TypeScript + Tailwind (frontend)

---

## Architecture

```
mini-erp-crm/
├── backend/          Express REST API, Prisma ORM, JWT auth
│   ├── prisma/schema.prisma   All DB models
│   └── src/
│       ├── routes/            auth, customers, products, challans
│       ├── middleware/        JWT auth + role guard, error handler
│       └── server.ts
└── frontend/         React SPA (Vite), Tailwind admin UI
    └── src/
        ├── pages/              Login, Dashboard, Customers, Products, Challans
        ├── context/AuthContext.tsx
        └── api/client.ts       Axios instance with JWT interceptor
```

**Key design decisions:**
- **Product snapshotting**: `ChallanItem` stores `productNameSnap`, `productSkuSnap`, `unitPriceSnap` at creation time — so editing a product later never retroactively changes historical challans.
- **Stock integrity**: every stock-reducing action (challan confirm, manual OUT movement) runs inside a Prisma `$transaction`, validates current stock first, and throws a proper 400 error rather than allowing negative stock.
- **Role-based access**: `authenticate` middleware verifies the JWT; `authorize(...roles)` middleware restricts specific routes (e.g. only `ADMIN`/`SALES` can create customers, only `ADMIN`/`WAREHOUSE` can adjust products).
- **Challan lifecycle**: `DRAFT → CONFIRMED → (optional) CANCELLED`. Confirming deducts stock; cancelling a confirmed challan re-adds stock and logs the reversal as a stock movement.

---

## Local Setup

### 1. Database (Supabase — free tier)
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings → Database → Connection String (URI, use the **pooler** connection for serverless-friendly, or direct for local dev)
3. Copy it — you'll need it as `DATABASE_URL`

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env: paste your DATABASE_URL, set a random JWT_SECRET

npm install
npx prisma generate
npx prisma db push        # creates all tables from schema.prisma
npm run prisma:seed       # creates 4 test users + 2 sample products

npm run dev                # starts on http://localhost:5000
```

Test users created by seed (password for all: `Password@123`):
| Role      | Email               |
|-----------|---------------------|
| Admin     | admin@erp.test      |
| Sales     | sales@erp.test      |
| Warehouse | warehouse@erp.test  |
| Accounts  | accounts@erp.test   |

### 3. Frontend
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173`, log in with any seeded account.

---

## Environment Variables

**backend/.env**
```
DATABASE_URL="postgresql://...supabase connection string..."
JWT_SECRET="any-long-random-string"
PORT=5000
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000   # or your deployed backend URL
```

---

## Deployment (free tier, no AWS required)

| Layer    | Platform          | Notes |
|----------|-------------------|-------|
| Database | Supabase          | Free Postgres, get connection string from project settings |
| Backend  | Render (Web Service) | Root dir `backend`, build `npm install && npm run build && npx prisma generate`, start `npm start`. Add env vars in Render dashboard. |
| Frontend | Vercel            | Root dir `frontend`, framework preset "Vite", add `VITE_API_URL` env var pointing to your Render backend URL |

After deploying, update `frontend/.env` (or Vercel env var) `VITE_API_URL` to the live Render backend URL, and re-deploy frontend.

AWS deployment was treated as optional per the assignment brief and was not pursued to keep this reproducible on free infra within the time window.

---

## API Overview

Full endpoint list in `postman_collection.json`. Highlights:

```
POST   /auth/login
GET    /customers?search=&status=&page=&limit=
POST   /customers
POST   /customers/:id/followups
GET    /products?search=&category=
POST   /products
POST   /products/:id/stock-movement       # manual IN/OUT adjustment
GET    /challans
POST   /challans                           # create as DRAFT or CONFIRMED
PATCH  /challans/:id/confirm               # DRAFT -> CONFIRMED, reduces stock
PATCH  /challans/:id/cancel                # reverses stock if was CONFIRMED
```

All routes except `/auth/login` require `Authorization: Bearer <token>`.

---

## Known Limitations / Not Implemented

- No PDF invoice export (listed as bonus in brief)
- No Docker setup or CI/CD pipeline (bonus)
- No product image upload to S3 (bonus)
- Purchase Orders module not implemented — brief's core requirement was Customer, Product/Inventory, and Sales Challan modules; Purchase Orders were mentioned only in business context, not in "Core Modules Required"
- Frontend has functional CRUD + the full challan business-logic flow (draft/confirm/cancel with stock validation) but minimal styling polish beyond a clean admin layout
- No automated test suite — validated manually via the Postman collection and UI walkthrough

## Assumptions Made

- "Stock should not go negative" is enforced at both challan-creation time (if created directly as CONFIRMED) and at confirm-time (if a DRAFT is confirmed later, in case stock shifted in between)
- Challan numbers reset sequence per calendar year (`CH-2026-0001`, `CH-2027-0001`, ...)
- Only `ADMIN`/`SALES` can create/edit customers and challans; only `ADMIN`/`WAREHOUSE` can create/edit products and manual stock movements; confirming a challan is allowed for `ADMIN`, `SALES`, and `WAREHOUSE` since warehouse staff are typically the ones fulfilling and confirming dispatch
