# Deploy Abenka Vault on Vercel (single repo + Supabase)

## 1. Connect repo

- Push the repo to GitHub and import it in [Vercel](https://vercel.com) as a new project.
- Leave **Root Directory** empty (use repo root).

## 2. Build settings (use these in Vercel)

Vercel will use `vercel.json` and the root `package.json`:

- **Build Command:** `npm run build` (builds backend then frontend)
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm run install:all`

No need to change Framework Preset (set to Other / None).

## 3. Environment variables (required for Supabase)

Vercel does **not** read a `.env` file from the repo. Add the same variables you use locally:

1. Open your local **`backend/.env`** (or use **`backend/.env.example`** as a reference).
2. In Vercel: **Project → Settings → Environment Variables**.
3. Add each variable from your `.env` (copy name and value). Minimum for login and Supabase:

| Variable         | Description |
|------------------|-------------|
| `DATABASE_URL`   | Supabase PostgreSQL connection string (same as in `backend/.env`) |
| `JWT_SECRET`     | Same secret as local (e.g. long random string) |
| `FRONTEND_URL`   | Your Vercel app URL, e.g. `https://abenka-vault.vercel.app` |

Optional (for Supabase Storage / attachments): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.

**Important:** Set the scope to **Production** (and Preview if needed). If variables are only set for "Pre-Production", production at `https://abenka-vault.vercel.app` will not have them and login will fail.

**Checklist:**

| Variable | Correct value for production | Common mistake |
|----------|------------------------------|----------------|
| `FRONTEND_URL` | `https://abenka-vault.vercel.app` | `http://localhost:5173` breaks CORS and login |
| `NODE_ENV` | `production` | `development` can cause wrong behavior in prod |
| `SUPABASE_ANON_KEY` | Your real key from Supabase dashboard | Placeholder `your_supabase_anon_key` will break Supabase features |
| `SUPABASE_SERVICE_KEY` | Your real service role key from Supabase | Placeholder will break signed URLs / server-side Supabase |

Apply to **Production** (and **Preview** if you use preview deployments). Then **redeploy** so the new variables are used.

## 4. Deploy

Trigger a deploy (push to main or “Redeploy” in Vercel). The build will:

1. Install backend and frontend dependencies
2. Run `prisma generate` and build the NestJS backend
3. Build the Vite frontend

The app will be served at `https://your-app.vercel.app`; the API is at `https://your-app.vercel.app/api/*`. The frontend already uses `/api`, so no frontend changes are needed.

## 5. Database

- Keep using your existing Supabase project.
- Run migrations once against production (e.g. from your machine with `DATABASE_URL` set to the Supabase URL):  
  `cd backend && npx prisma migrate deploy`
- Optionally run the seed for initial users:  
  `cd backend && npx prisma db seed`

## 6. How the API route gets the backend

The serverless function at `api/[[...path]].ts` loads the Nest app with `require(__dirname + '/backend-dist/src/vercel')` (Nest outputs to `dist/src/`). During the root build, `scripts/copy-backend-to-api.cjs` copies `backend/dist` and `backend/node_modules` into `api/backend-dist/`, so the function is self-contained and does not rely on `process.cwd()` or Vercel’s `includeFiles`. Do not remove the copy step or you’ll see: `Cannot find module '/var/task/api/backend-dist/...'`.

## 7. Troubleshooting "Serverless Function has crashed" (500 / FUNCTION_INVOCATION_FAILED)

- **Check Vercel logs:** Project → Deployments → select deployment → **Functions** tab, or **Logs**. The real error (e.g. missing `DATABASE_URL`, Prisma, init failure) appears there.
- **Health check:** Open `https://your-app.vercel.app/api/health`. If you get 503 or 500, read the response body and the Function logs.
- **Env:** Ensure `DATABASE_URL` and `JWT_SECRET` are set for **Production** (not only Pre-Production).
- The backend uses **bcryptjs** (not bcrypt) so it runs on Vercel without native module issues.
