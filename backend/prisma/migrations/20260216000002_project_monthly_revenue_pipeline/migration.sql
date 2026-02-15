-- Add monthly revenue pipeline per project (one-time entry per project for phase-wise revenue tracking)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "monthly_revenue_pipeline" DECIMAL(14,2);
