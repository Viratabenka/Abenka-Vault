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

## 3. Environment variables

In the Vercel project → **Settings → Environment Variables**, add:

| Variable         | Description |
|------------------|-------------|
| `DATABASE_URL`   | Supabase PostgreSQL connection string (same as local) |
| `JWT_SECRET`     | Secret used to sign JWTs (use a long random string) |
| `FRONTEND_URL`   | Your Vercel app URL, e.g. `https://your-app.vercel.app` |

Apply these to **Production**, and optionally to Preview.

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
