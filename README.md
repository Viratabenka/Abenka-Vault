# Abenka Vault

**Secure equity, clear contributions.**

MVP web app to track founder contributions (time + non-time), calculate equity & profit shares, support hourly payments, and provide per-founder private views plus company dashboard.

## Tech stack

- **Backend:** Node.js + NestJS, TypeScript
- **DB:** PostgreSQL (Prisma ORM) — use Supabase or any managed Postgres
- **Auth:** JWT + role-based access (Founders, Admin, Accountant)
- **Frontend:** React + TypeScript, Tailwind CSS
- **Deployment:** Vercel (frontend) / Heroku or Railway (backend); DB on Supabase

## Quick start

### 1. Database

Create a PostgreSQL database (e.g. [Supabase](https://supabase.com)). Set:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.oeystxfmywfuddojclzb.supabase.co:5432/postgres"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, FRONTEND_URL
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed   # optional: creates admin@abenka.local / admin123
npm run start:dev
```

API: `http://localhost:3001/api`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## API overview

| Area | Methods |
|------|--------|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/invite` (Admin) |
| **Users** | `GET /api/users`, `GET /api/users/:id`, `GET /api/users/:id/dashboard` |
| **Projects** | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` |
| **Contributions** | `GET/POST /api/projects/:id/contributions`, `PUT/DELETE /api/projects/contributions/:cid` |
| **Points** | `GET /api/calculate/weights`, `POST /api/calculate/points`, `POST /api/calculate/weights` |
| **Equity** | `POST /api/calculate/equity`, `GET /api/calculate/cap-table`, `GET /api/calculate/vesting` |
| **Payouts** | `POST /api/payouts/prepare`, `POST /api/payouts/profit`, `POST /api/payouts/:id/execute`, `GET /api/payouts/user/:userId` |
| **Company** | `GET /api/company/dashboard` (Admin/Accountant) |
| **Exports** | `GET /api/exports/contributions`, `GET /api/exports/cap-table` |
| **Audit** | `GET /api/audit` (Admin/Accountant) |

## Roles & RBAC

- **Founder:** Own dashboard, own contributions, projects they own.
- **Admin / Accountant:** Company dashboard, cap table, payouts, weights, audit logs, all projects.

## Business rules

- **Points:** `hours × time_weight + amount × cash_weight + other_points × other_weight` (configurable per company or project).
- **Equity %:** `user_points / total_points`; allocation creates vesting (cliff + monthly vesting).
- **Profit share:** `profit_pool × equity%` per period.
- **Hourly payout:** `hours × hourly_rate`; optional “defer to equity” with conversion rate.

## Environment (backend)

See `backend/.env.example`. Required: `DATABASE_URL`, `JWT_SECRET`. Optional: `JWT_EXPIRES_IN`, `PORT`, `API_PREFIX`, `FRONTEND_URL`, Supabase keys for file uploads.

## License

Private / use as needed.
