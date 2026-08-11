# Mini ERP + CRM — Operations Portal

A full-stack ERP/CRM system built for a wholesale/distribution business, developed as part of the Fundsroom Infotech Pvt. Ltd. Full Stack Developer case study. The system manages customers, product inventory, and sales challans (dispatch documents) across four operational roles — Admin, Sales, Warehouse, and Accounts — with role-based access control enforced end-to-end from the UI down to the database transaction layer.

**GitHub:** https://github.com/pvasu9055-hash/mini-erp-crm
**Live Frontend:** https://minierp.vasutech.online
**Live Backend API:** https://minierp-api.vasutech.online

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express.js |
| Database | PostgreSQL (hosted on Supabase), Prisma ORM |
| Auth | JWT (jsonwebtoken), bcrypt password hashing |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Hosting | Azure App Service (backend), custom domain via vasutech.online (frontend) |

## Architecture

Backend (`/backend`) is a route-per-module REST API: `auth.routes.ts` (login, register, profile), `customer.routes.ts` (CRM CRUD, search, follow-ups), `product.routes.ts` (inventory CRUD, stock movements, low-stock), `challan.routes.ts` (sales challans: create/confirm/cancel), `user.routes.ts` (admin-only: list users, change roles). Two middleware files handle cross-cutting concerns: `auth.ts` (`authenticate()` verifies the JWT, `authorize(...roles)` gates routes by role) and `errorHandler.ts` (centralized error handling with a consistent JSON error shape).

Key design decisions:

- **Transactional integrity.** Every stock-affecting operation (challan create-and-confirm, challan confirm, challan cancel, manual stock adjustment) runs inside a Prisma `$transaction`. Stock level updates and their corresponding `StockMovement` audit log entries commit or roll back together — they can never drift out of sync, and stock can never go negative under concurrent requests.
- **Product snapshotting.** `ChallanItem` stores the product's name, SKU, and unit price at the time the challan was created, not just a foreign key. A challan from months ago still displays accurately even if that product's price or name has since changed — matching real invoicing/dispatch behavior.
- **Role enforcement at the middleware layer.** `authorize("ADMIN", "SALES")` etc. is applied per-route, so permission logic lives in one place per endpoint rather than scattered through business logic.
- **Self-registration is deliberately restricted.** The `/auth/register` endpoint's validation only accepts `SALES`, `WAREHOUSE`, or `ACCOUNTS` — `ADMIN` is rejected with a 400 even if sent directly via API, not just hidden in the UI. Admin access can only be granted by an existing Admin through the Users page. This was tested directly against the deployed API to confirm the bypass attempt fails.

Frontend (`/frontend`) follows a page-per-module structure: `pages/` (Dashboard, Customers, Products, Challans, Users, Login, Signup, Profile), `components/` (Layout with sidebar nav, ProtectedRoute), `context/` (AuthContext for JWT storage and login/logout), `api/` (Axios client with an auth interceptor). The JWT is stored in `localStorage` and attached automatically to every request via an Axios request interceptor; a response interceptor auto-logs-out on a 401. Sidebar navigation is role-aware — the "Users" admin page link only renders for `ADMIN` accounts, though the backend is the actual authority, verified via direct API calls rather than relying on hidden UI alone.

## Roles & Permissions

| Action | Admin | Sales | Warehouse | Accounts |
|---|:---:|:---:|:---:|:---:|
| View customers / products / challans | ✅ | ✅ | ✅ | ✅ |
| Add / edit customers, add follow-up notes | ✅ | ✅ | ❌ | ❌ |
| Add / edit products, log manual stock movements | ✅ | ❌ | ✅ | ❌ |
| Create / cancel sales challans | ✅ | ✅ | ❌ | ❌ |
| Confirm sales challans (dispatch/fulfillment) | ✅ | ✅ | ✅ | ❌ |
| Manage user roles | ✅ | ❌ | ❌ | ❌ |

All of the above are enforced server-side via `authorize(...)` middleware — confirmed with live 403 responses, both through the UI and directly via the included Postman collection's negative test cases.

## Local Setup

**Prerequisites:** Node.js 18+, a PostgreSQL database (local instance, or a free Supabase/Neon project).

**1. Clone and install dependencies**
```bash
git clone https://github.com/pvasu9055-hash/mini-erp-crm.git
cd mini-erp-crm
cd backend && npm install
cd ../frontend && npm install
```

**2. Environment variables**

`backend/.env`
```env
DATABASE_URL="postgresql://user:password@host:5432/postgres"
JWT_SECRET="replace-with-a-long-random-string"
PORT=5000
```

`frontend/.env`
```env
VITE_API_URL="http://localhost:5000"
```

`.env.example` templates are included in both `/backend` and `/frontend`.

**3. Database setup**
```bash
cd backend
npx prisma db push
npx prisma db seed
```

**4. Run locally**
```bash
# Terminal 1 — backend
cd backend
npm run dev      # http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm run dev      # http://localhost:5173
```

**Test accounts (seeded)**

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.test | Password@123 |
| Sales | sales@erp.test | Password@123 |
| Warehouse | warehouse@erp.test | Password@123 |
| Accounts | accounts@erp.test | Password@123 |

New accounts can also be created via the Signup page — self-registration is limited to Sales, Warehouse, or Accounts roles; Admin access must be granted afterward by an existing Admin via the Users page.

## Server Setup & Environment Variables

Backend is hosted on **Azure App Service**. Environment variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`) are set directly in Azure's Application Settings — never committed to the repository. The database is hosted PostgreSQL via **Supabase**; the same `DATABASE_URL` connection string is used locally (in `.env`) and in Azure's configuration for the deployed instance.

The backend runs via `nodemon` + `ts-node` in development. `nodemon.json` scopes the file watcher to `src/` only with a 1-second restart delay, which avoids a race condition where rapid saves cause the old process to still be releasing port 5000 when the new one tries to bind (`EADDRINUSE`).

`JWT_SECRET` falls back to an insecure dev default if unset — fine for local development only; a real random secret is set in Azure's Application Settings for the live deployment. The frontend is deployed with `VITE_API_URL` pointed at the live backend, mapped to the custom domain `minierp.vasutech.online`.

## Deploying This Project

1. Create a free Postgres project on Supabase (or Neon / Render Postgres) and copy its connection string.
2. Deploy `/backend` to Azure App Service (or Render / Railway / Fly.io). Set `DATABASE_URL`, `JWT_SECRET`, and `PORT` as environment variables in the platform's dashboard. Run `npx prisma db push` once against the live database to create tables, then `npx prisma db seed` if you want the test accounts.
3. Deploy `/frontend` to your platform of choice (Vercel, Netlify, or similar), with `VITE_API_URL` set to the live backend's URL as a build-time environment variable.
4. Optionally map custom domains to both — done here via vasutech.online.

## API Documentation

`postman_collection.json` in the project root contains the full API surface, organized by module (Auth, Users, Customers, Products, Sales Challans), including every standard CRUD/list/search/filter endpoint plus negative test cases: insufficient stock (400), permission-denied actions by the wrong role (403), and a rejected admin self-registration attempt (400) — demonstrating the business rules and access control hold under misuse, not just the happy path. The collection's `baseUrl` variable defaults to `http://localhost:5000`; update it to `https://minierp-api.vasutech.online` to test against the live deployment.

## Assumptions

"Confirm" on a sales challan is treated as the point stock is committed and physically leaves inventory; a Draft challan reserves nothing. Warehouse is allowed to confirm a challan (modeling the warehouse team physically packing/dispatching an order) but cannot originate or cancel one — that stays with Sales/Admin, who own the customer relationship. Accounts role currently has read-only access across all modules, since the spec didn't define Accounts-specific write actions. Self-registration defaults to non-admin roles as a security measure; the first Admin account is seeded via `prisma/seed.ts`, and further Admins are promoted manually through the Users page.

## Known Limitations

No invoice PDF export or product image upload to S3 — both were bonus items, not implemented due to time constraints. No automated test suite; testing was done manually plus via the included Postman collection's positive and negative cases. CORS is currently open for ease of development — a longer-lived deployment would restrict it to the frontend's origin only. The "Users" admin page is a bonus feature beyond spec requirements; role changes take effect on the affected user's next login, since JWTs carry the role at issue-time.

## Bonus Features Implemented

Full stock movement audit trail beyond challan-triggered deductions, including a manual IN/OUT adjustment endpoint (for purchases, damage, corrections) with a per-product movement history view. Admin-only User Management page to view every account and reassign roles, with the promotion path hardened against self-service Admin escalation — verified via a direct API bypass attempt, not just hidden in the UI. Editable Profile page for updating your own name and password. A polished, purpose-built dark "operations manifest" UI theme — monospace for codes/SKUs/challan numbers, warehouse-amber accents — rather than a generic admin template. Live production deployment on Azure App Service and Supabase with a custom domain, rather than relying on the local-setup fallback.
