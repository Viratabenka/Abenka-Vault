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

## 7. If you see `FUNCTION_INIT_FAILED` (503)

The backend failed to start. Almost always this is **missing env for Production**:

1. In Vercel go to **Project → Settings → Environment Variables**.
2. Ensure **Production** is checked (not only Pre-Production) for:
   - **`DATABASE_URL`** – Your Supabase Postgres URL (e.g. `postgresql://postgres.PROJECT:PASSWORD@...pooler.supabase.com:5432/postgres`). Copy from `backend/.env`.
   - **`JWT_SECRET`** – Same value as in `backend/.env`.
3. **Redeploy**: Deployments → … → Redeploy (or push a commit). Env changes need a new deploy.

Check **Vercel → Logs** or the deployment **Functions** tab for the exact error (e.g. "DATABASE_URL is not defined" or Prisma connection error).

## 8. Build failed with exit code 1

- **Cause:** A build step failed (backend, copy script, or frontend). Open the failed deployment in Vercel → **Building** tab and scroll to the **first red/error line** to see the exact failure (e.g. TypeScript error, Prisma, "ENOENT", "Cannot find module").
- **Prisma:** The schema sets `binaryTargets = ["native", "rhel-openssl-3.0.x"]` for Vercel’s Linux runtime. If you see a Prisma binary error, ensure your Prisma version supports `rhel-openssl-3.0.x`.
- **Copy script:** If the error is "backend/dist/src not found", the backend build failed earlier; fix that step first.
- **"could not determine executable to run" for nest:** Vercel may set `NODE_ENV=production` so `npm install` skips devDependencies. The root scripts use `npm install --include=dev` so the Nest CLI (`@nestjs/cli`) is installed and `npx nest build` works.

## 9. Build failed with exit code 127 ("command not found")

- **Cause:** A command in the build (e.g. `nest`, `node`, `npm`) wasn’t found. The project is set up to use `npm install` (not `npm ci`) and `npx nest build` so CLIs are run via `npx`.
- **Check:** In Vercel, open the failed deployment → **Building** tab and find the **exact line** where it fails (the command before the 127).
- **Fix:** Ensure **Install Command** is `npm run install:all` and **Build Command** is `npm run build`. If 127 persists, in Vercel → Settings → General, set **Node.js Version** to 18.x or 20.x.

## 10. Troubleshooting "Serverless Function has crashed" (500 / FUNCTION_INVOCATION_FAILED)

- **Check Vercel logs:** Project → Deployments → select deployment → **Functions** tab, or **Logs**. The real error (e.g. missing `DATABASE_URL`, Prisma, init failure) appears there.
- **Health check:** Open `https://your-app.vercel.app/api/health`. If you get 503 or 500, read the response body and the Function logs.
- **Env:** Ensure `DATABASE_URL` and `JWT_SECRET` are set for **Production** (not only Pre-Production).
- The backend uses **bcryptjs** (not bcrypt) so it runs on Vercel without native module issues.

## 11. Local build on Windows: EPERM during `prisma generate`

If you see **`EPERM: operation not permitted, rename ... query_engine-windows.dll.node`** (or **`EPERM` / `EPIPE` on `node_modules\.prisma\client`**), something on your machine is locking that path—usually **Cursor/IDE**, antivirus, or another Node process.

**Reliable workaround:**

1. **Quit Cursor completely** (File → Exit / close the app).
2. Open **Windows Terminal** or **Command Prompt** from the Start menu (not from Cursor).
3. Run:
   ```bash
   cd "c:\gitcode_abenka\Abenka Vault"
   npm run install:all
   npm run build
   ```
4. If it still fails: run that terminal **as Administrator**, or temporarily **exclude the project folder** from Windows Defender real-time scan.

**Note:** This only affects your **local** Windows build. **Vercel** builds on Linux and does not hit this error; you can push and let Vercel build.
