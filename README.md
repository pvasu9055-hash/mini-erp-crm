# Mini ERP + CRM — Operations Portal

A full-stack ERP/CRM system built for a wholesale/distribution business, developed as part of the **Fundsroom Infotech Pvt. Ltd.** Full Stack Developer case study.

The system manages customers, product inventory, and sales challans (dispatch documents) across four operational roles — Admin, Sales, Warehouse, and Accounts — with role-based access control enforced end-to-end, from the UI down to the database transaction layer.

| | |
|---|---|
| 🔗 **GitHub** | https://github.com/pvasu9055-hash/mini-erp-crm |
| 🌐 **Live Frontend** | https://minierp.vasutech.online |
| ⚙️ **Live Backend API** | https://minierp-api.vasutech.online |
| 🗄️ **Database** | Supabase (PostgreSQL) |
| ☁️ **Backend Host** | Azure App Service |

---

## Table of Contents

1. [Screenshots](#1-screenshots)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [Request Flow — Sales Challan Confirmation](#4-request-flow--sales-challan-confirmation)
5. [Roles & Permissions Matrix](#5-roles--permissions-matrix)
6. [Tech Stack](#6-tech-stack)
7. [Project Structure](#7-project-structure)
8. [Local Setup — Step by Step](#8-local-setup--step-by-step)
9. [Environment Variables](#9-environment-variables)
10. [Server Setup Notes](#10-server-setup-notes)
11. [Deployment Guide](#11-deployment-guide)
12. [API Reference & Postman Collection](#12-api-reference--postman-collection)
13. [Design Decisions & Assumptions](#13-design-decisions--assumptions)
14. [Known Limitations](#14-known-limitations)
15. [Bonus Features Implemented](#15-bonus-features-implemented)
16. [Submission Checklist](#16-submission-checklist)

---

## 1. Screenshots

> Screenshots are stored in the repository root alongside this README.

| Login | Dashboard |
|---|---|
| ![Login](./Login.png) | ![Dashboard](./Dashboard.png) |

| Customers (with follow-ups) | Products (with stock log) |
|---|---|
| ![Customers](./Customers.png) | ![Products](./Products.png) |

| Sales Challan flow | Role permission block (403) |
|---|---|
| ![Challans](./Challans.png) | ![403 error](./403%20error.png) |

| Admin — User Management | Postman — negative test cases |
|---|---|
| ![Users](./Users.png) | ![Postman](./Postman.png) |

---

## 2. System Architecture

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#0F1113",
    "primaryColor": "#1B1E23",
    "primaryTextColor": "#EDEAE3",
    "primaryBorderColor": "#E8A33D",
    "lineColor": "#E8A33D",
    "secondaryColor": "#2A2E35",
    "tertiaryColor": "#14161A",
    "fontFamily": "monospace"
  }
}}%%
flowchart TB
    subgraph Client["Browser"]
        UI["React + Vite Frontend<br/>Tailwind CSS · React Router · Axios"]
    end

    subgraph Backend["Azure App Service"]
        API["Express.js REST API<br/>TypeScript"]
        MW1["authenticate()<br/>verifies JWT"]
        MW2["authorize(...roles)<br/>gates by role"]
        ROUTES["Route Handlers<br/>auth · customers · products · challans · users"]
        PRISMA["Prisma ORM"]
    end

    subgraph DB["Supabase"]
        PG[("PostgreSQL")]
    end

    UI -- "HTTPS + JWT Bearer token" --> API
    API --> MW1
    MW1 --> MW2
    MW2 --> ROUTES
    ROUTES --> PRISMA
    PRISMA --> PG

    style UI fill:#1B1E23,stroke:#E8A33D,color:#EDEAE3
    style API fill:#1B1E23,stroke:#E8A33D,color:#EDEAE3
    style PG fill:#1B1E23,stroke:#5C8A5C,color:#EDEAE3
```

**How a request flows:**

1. The React frontend attaches the JWT (stored in `localStorage`) to every request via an Axios interceptor.
2. Express receives the request; `authenticate()` verifies the JWT signature and decodes `{ userId, role }` onto `req.user`.
3. `authorize("ADMIN", "SALES")` (or whichever roles apply to that route) checks `req.user.role` against an allow-list — returns `403` immediately if not permitted.
4. The route handler runs its business logic through Prisma, hitting the Supabase-hosted PostgreSQL database.
5. Stock-affecting operations wrap steps 4 in a `$transaction` so partial failures can't corrupt stock counts.

---

## 3. Database Schema

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#0F1113",
    "primaryColor": "#1B1E23",
    "primaryTextColor": "#EDEAE3",
    "primaryBorderColor": "#E8A33D",
    "lineColor": "#E8A33D",
    "secondaryColor": "#2A2E35",
    "tertiaryColor": "#14161A",
    "fontFamily": "monospace"
  }
}}%%
erDiagram
    User ||--o{ CustomerFollowUp : creates
    User ||--o{ StockMovement : logs
    User ||--o{ SalesChallan : creates
    Customer ||--o{ CustomerFollowUp : has
    Customer ||--o{ SalesChallan : places
    Product ||--o{ StockMovement : tracks
    Product ||--o{ ChallanItem : referenced_by
    SalesChallan ||--o{ ChallanItem : contains

    User {
        string id PK
        string name
        string email UK
        string password "bcrypt hashed"
        enum role "ADMIN SALES WAREHOUSE ACCOUNTS"
    }
    Customer {
        string id PK
        string name
        string mobile
        string email
        string businessName
        string gstNumber
        enum customerType "RETAIL WHOLESALE DISTRIBUTOR"
        string address
        enum status "LEAD ACTIVE INACTIVE"
        datetime followUpDate
        string notes
    }
    CustomerFollowUp {
        string id PK
        string customerId FK
        string note
        string createdById FK
        datetime createdAt
    }
    Product {
        string id PK
        string name
        string sku UK
        string category
        decimal unitPrice
        int stock
        int minStock
        string location
    }
    StockMovement {
        string id PK
        string productId FK
        int quantity
        enum movementType "IN OUT"
        string reason
        string createdById FK
        datetime createdAt
    }
    SalesChallan {
        string id PK
        string challanNumber UK
        string customerId FK
        int totalQuantity
        enum status "DRAFT CONFIRMED CANCELLED"
        string createdById FK
        datetime createdAt
    }
    ChallanItem {
        string id PK
        string challanId FK
        string productId FK
        string productNameSnap "snapshot"
        string productSkuSnap "snapshot"
        decimal unitPriceSnap "snapshot"
        int quantity
    }
```

**Why `ChallanItem` snapshots product data:** if a challan just stored `productId`, editing that product's price later would silently rewrite the history of every past challan. Storing `productNameSnap`, `productSkuSnap`, and `unitPriceSnap` at creation time means a challan from three months ago always shows exactly what was agreed at the time — this is standard invoicing/dispatch behavior in any real ERP.

---

## 4. Request Flow — Sales Challan Confirmation

This is the most business-critical flow in the system: confirming a challan reduces stock, and that reduction must never leave the database in an inconsistent state (e.g., stock reduced but no audit log entry, or vice versa).

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#0F1113",
    "primaryColor": "#1B1E23",
    "primaryTextColor": "#EDEAE3",
    "primaryBorderColor": "#E8A33D",
    "lineColor": "#E8A33D",
    "secondaryColor": "#2A2E35",
    "tertiaryColor": "#14161A",
    "actorBkg": "#1B1E23",
    "actorTextColor": "#EDEAE3",
    "actorBorder": "#E8A33D",
    "signalColor": "#EDEAE3",
    "signalTextColor": "#EDEAE3",
    "fontFamily": "monospace"
  }
}}%%
sequenceDiagram
    participant U as User (Sales/Warehouse)
    participant F as Frontend
    participant A as Express API
    participant T as Prisma $transaction
    participant D as PostgreSQL

    U->>F: Click "Confirm" on a DRAFT challan
    F->>A: PATCH /challans/:id/confirm
    A->>A: authenticate() + authorize(ADMIN, SALES, WAREHOUSE)
    A->>T: begin transaction
    T->>D: fetch challan + items
    T->>D: for each item: check product.stock >= quantity
    alt insufficient stock
        T-->>A: throw AppError(400, "Insufficient stock for X")
        A-->>F: 400 { error: "..." }
        F-->>U: show red error banner
    else stock sufficient
        T->>D: update Product.stock -= quantity (per item)
        T->>D: create StockMovement (OUT, reason: challan number)
        T->>D: update SalesChallan.status = CONFIRMED
        T-->>A: commit transaction
        A-->>F: 200 { updated challan }
        F-->>U: show updated status + reduced stock
    end
```

If **any** step inside the transaction fails — a network blip, a concurrent update, a validation error — **all** of it rolls back. Stock is never partially deducted.

---

## 5. Roles & Permissions Matrix

| Action | Admin | Sales | Warehouse | Accounts |
|---|:---:|:---:|:---:|:---:|
| View customers / products / challans | ✅ | ✅ | ✅ | ✅ |
| Add / edit customers, add follow-up notes | ✅ | ✅ | ❌ | ❌ |
| Add / edit products, log manual stock movements | ✅ | ❌ | ✅ | ❌ |
| Create / cancel sales challans | ✅ | ✅ | ❌ | ❌ |
| Confirm sales challans (dispatch/fulfillment) | ✅ | ✅ | ✅ | ❌ |
| Manage user roles | ✅ | ❌ | ❌ | ❌ |
| Self-register via Signup | — | ✅ | ✅ | ✅ |

**Verified, not assumed:** every ❌ above was tested live — attempting the action returns an actual `403 Forbidden` from the deployed API, confirmed both through the UI (red error banner) and directly via the Postman collection's negative test requests (e.g. *"Create Customer as Warehouse (expect 403)"*).

Self-registration is capped at Sales/Warehouse/Accounts by validation on **both** the frontend dropdown and the backend's `express-validator` rule — a direct API call attempting `role: "ADMIN"` during registration is rejected with `400`, confirmed via Postman's *"Register - reject ADMIN role (expect 400)"* request.

---

## 6. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend runtime | Node.js + TypeScript | Type safety across the API surface |
| Web framework | Express.js | Lightweight, explicit middleware chain for auth/role checks |
| Database | PostgreSQL via Supabase | Relational integrity for stock/challan consistency; free tier |
| ORM | Prisma | Type-safe queries, migrations, and transaction support |
| Auth | JWT (jsonwebtoken) + bcrypt | Stateless auth as spec allows ("simple JWT-based authentication is acceptable") |
| Frontend | React + TypeScript + Vite | Fast dev server, component-driven UI |
| Styling | Tailwind CSS | Utility-first, fast to theme consistently |
| Routing | React Router | Client-side routing + protected routes |
| HTTP client | Axios | Interceptors for auth headers and 401 handling |
| Backend hosting | Azure App Service | Free-tier eligible, documented env var management |
| Frontend hosting | Custom domain via vasutech.online | Live, publicly reachable deployment |

---

## 7. Project Structure

```
mini-erp-crm/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # data model (see ER diagram above)
│   │   └── seed.ts              # seeds 4 test accounts
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts       # login, register, /me profile
│   │   │   ├── customer.routes.ts   # CRUD, search, follow-ups
│   │   │   ├── product.routes.ts    # CRUD, stock movements, low-stock
│   │   │   ├── challan.routes.ts    # create/confirm/cancel + stock logic
│   │   │   └── user.routes.ts       # admin-only: list/promote users
│   │   ├── middleware/
│   │   │   ├── auth.ts              # authenticate(), authorize(...roles)
│   │   │   └── errorHandler.ts      # centralized error → JSON shape
│   │   └── server.ts
│   ├── nodemon.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                   # Dashboard, Customers, Products, Challans, Users, Login, Signup, Profile
│   │   ├── components/              # Layout (sidebar), ProtectedRoute
│   │   ├── context/AuthContext.tsx  # JWT storage, login/logout
│   │   └── api/client.ts            # Axios instance + interceptors
│   ├── tailwind.config.js
│   └── .env.example
├── postman_collection.json
└── README.md
```

---

## 8. Local Setup — Step by Step

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local install, or a free Supabase/Neon project)

### Step 1 — Clone
```bash
git clone https://github.com/pvasu9055-hash/mini-erp-crm.git
cd mini-erp-crm
```

### Step 2 — Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 3 — Configure environment variables
Copy the example files and fill in real values (see [section 9](#9-environment-variables) below):
```bash
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env
```

### Step 4 — Set up the database
```bash
cd backend
npx prisma db push     # creates all tables from schema.prisma
npx prisma db seed     # creates the 4 seeded test accounts
```

### Step 5 — Run both servers
```bash
# Terminal 1
cd backend
npm run dev             # → http://localhost:5000

# Terminal 2
cd frontend
npm run dev             # → http://localhost:5173
```

### Step 6 — Log in
Open `http://localhost:5173` and sign in with any seeded account:

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.test | Password@123 |
| Sales | sales@erp.test | Password@123 |
| Warehouse | warehouse@erp.test | Password@123 |
| Accounts | accounts@erp.test | Password@123 |

---

## 9. Environment Variables

**`backend/.env`**
```env
DATABASE_URL="postgresql://user:password@host:5432/postgres"
JWT_SECRET="replace-with-a-long-random-string"
PORT=5000
```

| Variable | Purpose | Where it's set in production |
|---|---|---|
| `DATABASE_URL` | Supabase Postgres connection string | Azure App Service → Application Settings |
| `JWT_SECRET` | Signs/verifies auth tokens — must be a real random string in production | Azure App Service → Application Settings |
| `PORT` | Port Express listens on | Azure App Service → Application Settings |

**`frontend/.env`**
```env
VITE_API_URL="http://localhost:5000"
```

| Variable | Purpose | Where it's set in production |
|---|---|---|
| `VITE_API_URL` | Base URL the frontend calls for the API | Set at build time to `https://minierp-api.vasutech.online` |

None of these are committed to the repository — `.env` is git-ignored; only `.env.example` (with placeholder values) is tracked.

---

## 10. Server Setup Notes

- **Dev server stability:** the backend runs via `nodemon` + `ts-node`. `nodemon.json` restricts the watcher to `src/` only, with a 1-second restart delay — without this, rapid file saves during development could trigger a restart before the previous process fully released port 5000, causing `EADDRINUSE` crashes.
- **JWT_SECRET fallback:** the code falls back to a dev-only placeholder if `JWT_SECRET` is unset, so local setup never blocks on a missing env var — but this fallback is never used in the deployed instance, where a real secret is set in Azure.
- **CORS:** currently permissive (`cors()` with defaults) to simplify local development against the deployed API. See [Known Limitations](#14-known-limitations).
- **SPA routing on Azure Static Web Apps:** because this is a client-side-routed React app, directly loading or refreshing a nested route (e.g. `/login`, `/customers`) against the static host returns a `404` unless the host is told to fall back to `index.html` for unmatched paths. Fixed via `frontend/staticwebapp.config.json`:
  ```json
  {
    "navigationFallback": {
      "rewrite": "/index.html",
      "exclude": ["/assets/*", "*.{png,jpg,jpeg,svg,ico,css,js,json}"]
    }
  }
  ```
  This lets React Router take over rendering for any route not matching a real static asset.

---

## 11. Deployment Guide

How this project is actually deployed, and how to redeploy it elsewhere:

1. **Database** — created a free PostgreSQL project on [Supabase](https://supabase.com), copied its connection string into `DATABASE_URL`.
2. **Backend** — deployed `/backend` to **Azure App Service**:
   - Set `DATABASE_URL`, `JWT_SECRET`, `PORT` in Azure's *Configuration → Application Settings* (never committed to source).
   - Ran `npx prisma db push` once against the live Supabase database to create all tables.
   - Ran `npx prisma db seed` once to create the 4 test accounts.
3. **Frontend** — deployed `/frontend` with `VITE_API_URL` set at build time to the live backend URL, then mapped to a custom domain (`minierp.vasutech.online`) via vasutech.online's DNS.
4. Verified end-to-end: logged in live, walked through every module, and confirmed role-based 403s fire correctly against the production API (not just locally).

To redeploy this stack elsewhere (Render/Railway/Fly.io for backend, Vercel/Netlify for frontend — all acceptable per the assignment), the steps are the same in spirit: provision Postgres, set the three backend env vars on your platform of choice, push the schema, then point the frontend's `VITE_API_URL` at wherever the backend ends up.

---

## 12. API Reference & Postman Collection

`postman_collection.json` (repo root) contains every endpoint, organized by module:

| Module | Endpoints |
|---|---|
| **Auth** | Login, Register, Register-reject-Admin (400 test), Get/Update profile |
| **Users** (Admin only) | List all users, Change user role, List-as-non-admin (403 test) |
| **Customers** | List/search, Create, Get detail, Update, Add follow-up, Create-as-Warehouse (403 test) |
| **Products** | List/search, Low-stock alerts, Create, Manual stock movement, Movement history, Create-as-Sales (403 test) |
| **Sales Challans** | List, Create (Draft/Confirmed), Insufficient-stock (400 test), Get detail, Confirm, Cancel, Create-as-Warehouse (403 test) |

**This collection includes negative test cases deliberately** — not just the happy path — so a reviewer can see the business rules and access control actually hold under misuse:
- Insufficient stock → `400` with a clear message
- Wrong role attempting a restricted action → `403`
- Self-registering as Admin → `400`, rejected

To use it: import into Postman, set the `baseUrl` collection variable to either `http://localhost:5000` (local) or `https://minierp-api.vasutech.online` (live), log in via the Login request to get a token, and set it as the `token` variable for subsequent requests.

---

## 13. Design Decisions & Assumptions

- **"Confirm" = stock committed.** A Draft challan reserves nothing; stock only moves on Confirm. This matches how a real dispatch note works — nothing leaves the warehouse until it's actually confirmed for dispatch.
- **Warehouse can confirm, not originate.** Confirming a challan is modeled as the warehouse team physically packing/dispatching an order — a fulfillment action. Creating or cancelling a challan stays with Sales/Admin, since that's a customer-relationship decision, not a fulfillment one.
- **Accounts is read-only for now.** The spec didn't define specific write actions for Accounts (e.g. invoicing), so none were invented rather than guessed.
- **Self-registration excludes Admin by design.** Not explicitly required by the spec, but a reasonable security default: the first Admin is seeded via `prisma/seed.ts`, and every subsequent Admin is a deliberate promotion by an existing Admin — never a self-service signup choice.

---

## 14. Known Limitations

- No invoice PDF export or product image upload to S3 (both bonus items; not implemented due to time constraints).
- No automated test suite — testing was manual plus the Postman collection's positive/negative cases.
- CORS is currently open rather than restricted to the frontend's exact origin — acceptable for a time-boxed case study, would be tightened for a longer-lived deployment.
- Role changes made via the Users page take effect on the affected user's **next login** — the JWT carries the role at the moment it was issued, so an already-logged-in session keeps its old role until re-authenticated.
- The User Management page itself is a bonus feature beyond the spec's explicit requirements.

---

## 15. Bonus Features Implemented

Beyond the spec's core requirements, this submission also includes:

- **Full stock movement audit trail** — not just challan-triggered deductions, but a manual IN/OUT adjustment endpoint (for new purchases, damage, corrections) with a per-product movement history view.
- **Admin-only User Management page** — view every account, reassign any user's role, with the Admin-escalation path hardened against self-promotion (verified via a direct API bypass attempt, not just a hidden button).
- **Editable Profile page** — update your own name and password.
- **Custom dark "operations manifest" UI theme** — monospace type for codes/SKUs/challan numbers, warehouse-amber accents — designed around how a wholesale dispatch team actually works, not a generic admin template.
- **Live production deployment** — Azure App Service + Supabase + a custom domain, rather than relying on the assignment's local-setup fallback option.

---

## 16. Submission Checklist

- [x] GitHub repository — https://github.com/pvasu9055-hash/mini-erp-crm (pushed)
- [x] Live frontend — https://minierp.vasutech.online
- [x] Live backend API — https://minierp-api.vasutech.online
- [x] Test credentials for all 4 roles (section 8)
- [x] Postman collection with positive + negative test cases — `postman_collection.json`
- [x] README with setup, architecture, deployment, and limitations — this file
- [ ] Screen recording of the full flow
- [ ] Screenshots added to `/screenshots` folder (section 1)
