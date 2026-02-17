-- CreateTable
CREATE TABLE "SalesEntry" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "period_month" VARCHAR(7),
    "entry_date" DATE NOT NULL,
    "sales_amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAllocation" (
    "id" TEXT NOT NULL,
    "sales_entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contribution_percent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesEntry_project_id_idx" ON "SalesEntry"("project_id");

-- CreateIndex
CREATE INDEX "SalesEntry_entry_date_idx" ON "SalesEntry"("entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "SalesAllocation_sales_entry_id_user_id_key" ON "SalesAllocation"("sales_entry_id", "user_id");

-- CreateIndex
CREATE INDEX "SalesAllocation_sales_entry_id_idx" ON "SalesAllocation"("sales_entry_id");

-- CreateIndex
CREATE INDEX "SalesAllocation_user_id_idx" ON "SalesAllocation"("user_id");

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAllocation" ADD CONSTRAINT "SalesAllocation_sales_entry_id_fkey" FOREIGN KEY ("sales_entry_id") REFERENCES "SalesEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAllocation" ADD CONSTRAINT "SalesAllocation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
