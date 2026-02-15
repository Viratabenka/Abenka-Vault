-- CreateEnum
CREATE TYPE "RevenueEntryType" AS ENUM ('MONTHLY_REVENUE', 'ONE_TIME_REVENUE', 'EXPENSE');

-- CreateTable
CREATE TABLE "ProjectRevenueEntry" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "RevenueEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "period_month" VARCHAR(7),
    "entry_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRevenueEntry_project_id_idx" ON "ProjectRevenueEntry"("project_id");
CREATE INDEX "ProjectRevenueEntry_type_idx" ON "ProjectRevenueEntry"("type");
CREATE INDEX "ProjectRevenueEntry_period_month_idx" ON "ProjectRevenueEntry"("period_month");

-- AddForeignKey
ALTER TABLE "ProjectRevenueEntry" ADD CONSTRAINT "ProjectRevenueEntry_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
